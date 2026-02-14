"""Habit endpoints. Use ScheduleType/PrivacyType enums, not strings."""
from datetime import date, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Habit, HabitLog, PrivacyType, ScheduleType
from ..schemas import HabitCreate, HabitUpdate, HabitResponse, HabitLogResponse, HabitCompleteBody
from ..routers.users import get_current_user
from ..services.xp_service import (
    check_all_adults_completed_shared_habit,
    update_family_xp,
    update_user_xp,
    update_streak,
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
):
    habits = (
        db.query(Habit)
        .filter(Habit.family_id == current_user.family_id, Habit.is_active == True)
        .all()
    )
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
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(habit, k, v)
    db.commit()
    db.refresh(habit)
    return HabitResponse.model_validate(habit)


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

    xp_result = update_user_xp(current_user, xp, db)
    if xp_result.get("level_up"):
        try:
            await notify_level_up(current_user, xp_result["new_level"], db)
        except Exception:
            pass

    family_xp_awarded = False
    family_xp_amount = None
    if check_all_adults_completed_shared_habit(habit, completion_date, db):
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
