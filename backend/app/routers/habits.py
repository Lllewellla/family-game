"""Habit endpoints. Use ScheduleType/PrivacyType enums, not strings."""
from datetime import date, datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Habit, HabitLog, Streak, PrivacyType, ScheduleType, UserRole, HabitType
from ..schemas import HabitCreate, HabitUpdate, HabitResponse, HabitLogResponse, HabitCompleteBody, HabitStatsResponse
from ..routers.users import get_current_user
from ..services.xp_service import (
    check_all_adults_completed_shared_habit,
    update_family_xp,
    update_user_xp,
    update_streak,
    habit_completion_counts,
    recalc_streak,
    get_effective_weekly_target,
)
from ..models import Family
from ..telegram.bot import notify_level_up

router = APIRouter(prefix="/api/habits", tags=["habits"])


def _check_habit_access(habit: Habit, user: User) -> bool:
    if habit.privacy == PrivacyType.PERSONAL:
        return habit.owner_id == user.id
    if habit.privacy in (PrivacyType.PUBLIC, PrivacyType.SHARED):
        return habit.family_id == user.family_id
    return False


def _habit_scheduled_today(habit: Habit, today: date) -> bool:
    if habit.schedule_type == ScheduleType.DAILY:
        return True
    if habit.schedule_type == ScheduleType.WEEKLY:
        weekday = today.weekday()
        config = habit.schedule_config or {}
        days = config.get("days", [])
        return weekday in days
    if habit.schedule_type == ScheduleType.WEEKLY_TARGET:
        return True
    if habit.schedule_type == ScheduleType.CUSTOM:
        config = habit.schedule_config or {}
        interval = config.get("interval", 1)
        start_str = config.get("start_date", today.isoformat())
        try:
            start_date = datetime.fromisoformat(start_str).date()
        except (TypeError, ValueError):
            start_date = today
        return (today - start_date).days % interval == 0
    return False


@router.get("", response_model=list[HabitResponse])
async def get_habits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    include_inactive: bool = False,
):
    q = db.query(Habit).filter(Habit.family_id == current_user.family_id)
    if not include_inactive:
        q = q.filter(Habit.is_active == True)
    habits = q.all()
    accessible = [h for h in habits if h.privacy != PrivacyType.PERSONAL or h.owner_id == current_user.id]
    return [HabitResponse.model_validate(h) for h in accessible]


@router.get("/today", response_model=list[HabitResponse])
async def get_today_habits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    habits = (
        db.query(Habit)
        .filter(Habit.family_id == current_user.family_id, Habit.is_active == True)
        .all()
    )
    today_habits = [h for h in habits if _habit_scheduled_today(h, today)]
    accessible = [h for h in today_habits if h.privacy != PrivacyType.PERSONAL or h.owner_id == current_user.id]
    return [HabitResponse.model_validate(h) for h in accessible]


@router.post("", response_model=HabitResponse)
async def create_habit(
    data: HabitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    if data.privacy == PrivacyType.SHARED and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only family admin can create shared habits")
    habit = Habit(
        family_id=current_user.family_id,
        owner_id=current_user.id,
        **data.model_dump(),
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return HabitResponse.model_validate(habit)


@router.put("/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: UUID,
    data: HabitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit or not _check_habit_access(habit, current_user):
        raise HTTPException(status_code=404, detail="Habit not found")
    if data.privacy is not None and data.privacy == PrivacyType.SHARED and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only family admin can set habit to shared")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(habit, k, v)
    db.commit()
    db.refresh(habit)
    return HabitResponse.model_validate(habit)


@router.get("/{habit_id}/logs", response_model=list[HabitLogResponse])
async def get_habit_logs(
    habit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    from_date: date | None = None,
    to_date: date | None = None,
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit or not _check_habit_access(habit, current_user):
        raise HTTPException(status_code=404, detail="Habit not found")
    today = date.today()
    from_d = from_date or (today - timedelta(days=14))
    to_d = to_date or (today + timedelta(days=7))
    logs = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == current_user.id,
            HabitLog.date >= from_d,
            HabitLog.date <= to_d,
        )
        .order_by(HabitLog.date)
        .all()
    )
    return [HabitLogResponse.model_validate(l) for l in logs]


@router.get("/{habit_id}/stats", response_model=HabitStatsResponse)
async def get_habit_stats(
    habit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit or not _check_habit_access(habit, current_user):
        raise HTTPException(status_code=404, detail="Habit not found")

    streak = db.query(Streak).filter(Streak.habit_id == habit_id, Streak.user_id == current_user.id).first()
    current_streak = streak.current_streak if streak else 0
    longest_streak = streak.longest_streak if streak else 0

    weekly_done = None
    weekly_target = None
    percent_week = None
    percent_month = None
    today = date.today()
    if habit.type == HabitType.TIMES_PER_WEEK:
        weekly_target = get_effective_weekly_target(habit, current_user.id, today)
        if weekly_target is not None:
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=6)
            weekly_done = (
                db.query(HabitLog)
                .filter(
                    HabitLog.habit_id == habit_id,
                    HabitLog.user_id == current_user.id,
                    HabitLog.date >= week_start,
                    HabitLog.date <= week_end,
                )
                .count()
            )
            percent_week = (weekly_done / weekly_target * 100) if weekly_target else None
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    logs_week = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == current_user.id,
            HabitLog.date >= week_start,
        )
        .count()
    )
    logs_month = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == current_user.id,
            HabitLog.date >= month_start,
        )
        .count()
    )
    if habit.type == HabitType.TIMES_PER_WEEK and weekly_target:
        days_in_month = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        expected_month = max(1, weekly_target * 4)
        percent_month = (logs_month / expected_month * 100) if expected_month else None
    else:
        days_so_far = (today - month_start).days + 1
        percent_month = (logs_month / days_so_far * 100) if days_so_far else None

    return HabitStatsResponse(
        current_streak=current_streak,
        longest_streak=longest_streak,
        weekly_done=weekly_done,
        weekly_target=weekly_target,
        percent_week=percent_week,
        percent_month=percent_month,
    )


@router.delete("/{habit_id}")
async def delete_habit(
    habit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit or not _check_habit_access(habit, current_user):
        raise HTTPException(status_code=404, detail="Habit not found")
    habit.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/{habit_id}/complete", response_model=HabitLogResponse)
async def complete_habit(
    habit_id: UUID,
    body: HabitCompleteBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit or not _check_habit_access(habit, current_user):
        raise HTTPException(status_code=404, detail="Habit not found")
    completion_date = body.date

    existing = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == current_user.id,
            HabitLog.date == completion_date,
        )
        .first()
    )
    if existing:
        db.refresh(existing)
        out = HabitLogResponse.model_validate(existing)
        out.family_xp_awarded = False
        out.family_xp_amount = None
        return out

    counts = habit_completion_counts(habit, body.value, completion_date, current_user.id, db)
    xp = 0
    streak_info = {}
    if counts and habit.type != HabitType.TIMES_PER_WEEK:
        xp = habit.xp_reward
        streak_info = update_streak(habit_id, current_user.id, db)
        xp += streak_info.get("bonus_xp", 0)

    log = HabitLog(
        habit_id=habit_id,
        user_id=current_user.id,
        date=completion_date,
        value=body.value,
        xp_earned=xp,
    )
    db.add(log)
    db.flush()

    if habit.type == HabitType.TIMES_PER_WEEK:
        week_start = completion_date - timedelta(days=completion_date.weekday())
        week_end = week_start + timedelta(days=6)
        target = get_effective_weekly_target(habit, current_user.id, completion_date)
        if target is not None:
            count_in_week = (
                db.query(HabitLog)
                .filter(
                    HabitLog.habit_id == habit_id,
                    HabitLog.user_id == current_user.id,
                    HabitLog.date >= week_start,
                    HabitLog.date <= week_end,
                )
                .count()
            )
            already_awarded = (
                db.query(HabitLog)
                .filter(
                    HabitLog.habit_id == habit_id,
                    HabitLog.user_id == current_user.id,
                    HabitLog.date >= week_start,
                    HabitLog.date <= week_end,
                    HabitLog.xp_earned > 0,
                )
                .first()
            )
            if count_in_week >= target and not already_awarded:
                log.xp_earned = habit.xp_reward
                xp = habit.xp_reward

    if xp > 0:
        xp_result = update_user_xp(current_user, xp, db)
        if xp_result.get("level_up"):
            try:
                await notify_level_up(current_user, xp_result["new_level"], db)
            except Exception:
                pass

    family_xp_awarded = False
    family_xp_amount = None
    if counts and check_all_adults_completed_shared_habit(habit, completion_date, db):
        family = db.query(Family).filter(Family.id == habit.family_id).first()
        if family:
            family_xp_amount = habit.xp_reward
            update_family_xp(family, family_xp_amount, db)
            family_xp_awarded = True

    db.commit()
    db.refresh(log)
    out = HabitLogResponse.model_validate(log)
    out.family_xp_awarded = family_xp_awarded
    out.family_xp_amount = family_xp_amount
    return out


@router.post("/{habit_id}/uncomplete")
async def uncomplete_habit(
    habit_id: UUID,
    body: HabitCompleteBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove completion for the given date; recalc streak. XP is not revoked."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit or not _check_habit_access(habit, current_user):
        raise HTTPException(status_code=404, detail="Habit not found")
    log = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == current_user.id,
            HabitLog.date == body.date,
        )
        .first()
    )
    if not log:
        return {"ok": True, "message": "No log for this date"}
    db.delete(log)
    db.commit()
    recalc_streak(habit_id, current_user.id, db)
    return {"ok": True}
