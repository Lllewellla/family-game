"""XP and level calculation. Uses enums for comparisons."""
from math import sqrt
from datetime import date, timedelta
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from ..models import User, HabitLog, Streak, Habit, PrivacyType, HabitType


def calculate_level(total_xp: int) -> int:
    return int(sqrt(total_xp / 100)) + 1


def calculate_xp_for_next_level(level: int, total_xp: int) -> int:
    xp_for_level = (level ** 2) * 100
    return max(0, xp_for_level - total_xp)


def update_user_xp(user: User, xp_amount: int, db: Session) -> Dict[str, Any]:
    old_level = user.level
    user.total_xp += xp_amount
    new_level = calculate_level(user.total_xp)
    level_up = new_level > old_level
    user.level = new_level
    db.commit()
    return {
        "level_up": level_up,
        "old_level": old_level,
        "new_level": new_level,
        "total_xp": user.total_xp,
        "xp_for_next_level": calculate_xp_for_next_level(new_level, user.total_xp),
    }


def get_effective_daily_target(habit: Habit, user_id: UUID, log_date: date) -> Optional[float]:
    """For quantity habits: return the target number for this user on this date (by_user + goal_effective_from)."""
    tv = habit.target_value or {}
    effective_from = habit.goal_effective_from
    if effective_from and log_date < effective_from:
        return None
    default = tv.get("daily_target")
    if default is None:
        return None
    by_user = tv.get("by_user") or {}
    uid_str = str(user_id)
    if uid_str in by_user:
        return float(by_user[uid_str])
    return float(default) if default is not None else None


def get_effective_weekly_target(habit: Habit, user_id: UUID, log_date: date) -> Optional[int]:
    """For times_per_week: return weekly target for this user (by_user + goal_effective_from)."""
    tv = habit.target_value or {}
    config = habit.schedule_config or {}
    effective_from = habit.goal_effective_from
    if effective_from and log_date < effective_from:
        return None
    default = tv.get("weekly_target") or config.get("weekly_target")
    if default is None:
        return None
    by_user = tv.get("by_user") or {}
    uid_str = str(user_id)
    if uid_str in by_user:
        return int(by_user[uid_str])
    return int(default)


def habit_completion_counts(habit: Habit, value: Optional[Dict], log_date: date, user_id: UUID, db: Session) -> bool:
    """True if this completion counts toward XP/streak (goal met for quantity/scale; always for boolean)."""
    if habit.type == HabitType.BOOLEAN:
        return True
    if habit.type == HabitType.QUANTITY:
        target = get_effective_daily_target(habit, user_id, log_date)
        if target is None:
            return False
        num = value.get("number") if value else None
        if num is None:
            return False
        try:
            n = float(num)
        except (TypeError, ValueError):
            return False
        comparison = (habit.target_value or {}).get("comparison", ">=")
        if comparison == ">=":
            return n >= target
        return n <= target
    if habit.type == HabitType.SCALE:
        scale = value.get("scale") if value else None
        if scale is None:
            return False
        try:
            s = int(scale)
        except (TypeError, ValueError):
            return False
        if not (1 <= s <= 5):
            return False
        min_count = (habit.target_value or {}).get("min_to_count", 1)
        return s >= min_count
    if habit.type == HabitType.TIMES_PER_WEEK:
        return True
    return True


def recalc_streak(habit_id: UUID, user_id: UUID, db: Session) -> None:
    """Recompute streak from logs after uncomplete or backdate. Updates Streak row."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        return
    logs = (
        db.query(HabitLog)
        .filter(HabitLog.habit_id == habit_id, HabitLog.user_id == user_id)
        .order_by(HabitLog.date.desc())
        .all()
    )
    completed_dates = set()
    for log in logs:
        if habit_completion_counts(habit, log.value, log.date, user_id, db):
            completed_dates.add(log.date)
    today = date.today()
    current = 0
    d = today
    while d in completed_dates:
        current += 1
        d -= timedelta(days=1)
    longest = current
    run = 0
    sorted_dates = sorted(completed_dates, reverse=True)
    for i, d in enumerate(sorted_dates):
        if i == 0 or (sorted_dates[i - 1] - d).days == 1:
            run += 1
        else:
            run = 1
        longest = max(longest, run)
    streak = db.query(Streak).filter(Streak.habit_id == habit_id, Streak.user_id == user_id).first()
    if streak:
        streak.current_streak = current
        streak.longest_streak = max(streak.longest_streak, longest)
        streak.last_completed_date = max(completed_dates) if completed_dates else None
    else:
        if completed_dates:
            streak = Streak(
                habit_id=habit_id,
                user_id=user_id,
                current_streak=current,
                longest_streak=longest,
                last_completed_date=max(completed_dates),
            )
            db.add(streak)
    db.commit()


def update_streak(habit_id, user_id, db: Session) -> Dict[str, Any]:
    today = date.today()
    yesterday = today - timedelta(days=1)
    streak = db.query(Streak).filter(Streak.habit_id == habit_id, Streak.user_id == user_id).first()
    if not streak:
        streak = Streak(
            habit_id=habit_id,
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_completed_date=today,
        )
        db.add(streak)
    else:
        if streak.last_completed_date == yesterday:
            streak.current_streak += 1
        elif streak.last_completed_date == today:
            db.commit()
            return {
                "current_streak": streak.current_streak,
                "bonus_xp": 0,
                "milestone": None,
            }
        else:
            streak.current_streak = 1
        streak.last_completed_date = today
        streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    db.commit()

    bonus_xp = 0
    milestone = None
    if streak.current_streak == 3:
        bonus_xp = 10
        milestone = "3-day streak!"
    elif streak.current_streak == 7:
        bonus_xp = 25
        milestone = "7-day streak!"
    elif streak.current_streak == 30:
        bonus_xp = 100
        milestone = "30-day streak!"
    elif streak.current_streak and streak.current_streak % 30 == 0:
        bonus_xp = 100
        milestone = f"{streak.current_streak}-day streak!"
    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "bonus_xp": bonus_xp,
        "milestone": milestone,
    }


def get_user_stats(user: User, db: Session) -> Dict[str, Any]:
    streaks = db.query(Streak).filter(Streak.user_id == user.id).all()
    return {
        "level": user.level,
        "total_xp": user.total_xp,
        "xp_for_next_level": calculate_xp_for_next_level(user.level, user.total_xp),
        "current_streaks": [
            {"habit_id": str(s.habit_id), "current_streak": s.current_streak, "longest_streak": s.longest_streak}
            for s in streaks
        ],
    }


def update_family_xp(family, xp_amount: int, db: Session) -> Dict[str, Any]:
    old_level = family.level
    family.total_xp += xp_amount
    new_level = calculate_level(family.total_xp)
    level_up = new_level > old_level
    family.level = new_level
    db.commit()
    return {
        "level_up": level_up,
        "old_level": old_level,
        "new_level": new_level,
        "total_xp": family.total_xp,
        "xp_for_next_level": calculate_xp_for_next_level(new_level, family.total_xp),
    }


def check_all_adults_completed_shared_habit(habit: Habit, completion_date: date, db: Session) -> bool:
    """True if habit is SHARED and every family member has met their own goal for this date (or week for times_per_week)."""
    if habit.privacy != PrivacyType.SHARED:
        return False
    family_members = db.query(User).filter(User.family_id == habit.family_id).all()
    if not family_members:
        return False
    if habit.type == HabitType.TIMES_PER_WEEK:
        for member in family_members:
            if not _shared_member_weekly_goal_met(habit, member.id, completion_date, db):
                return False
        return True
    for member in family_members:
        log = (
            db.query(HabitLog)
            .filter(
                HabitLog.habit_id == habit.id,
                HabitLog.user_id == member.id,
                HabitLog.date == completion_date,
            )
            .first()
        )
        if not log or not habit_completion_counts(habit, log.value, completion_date, member.id, db):
            return False
    return True


def _shared_member_weekly_goal_met(habit: Habit, user_id: UUID, any_date_in_week: date, db: Session) -> bool:
    """For TIMES_PER_WEEK SHARED: whether this user reached their weekly target in the week of any_date_in_week."""
    target = get_effective_weekly_target(habit, user_id, any_date_in_week)
    if target is None:
        return False
    week_start = any_date_in_week - timedelta(days=any_date_in_week.weekday())
    week_end = week_start + timedelta(days=6)
    count = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit.id,
            HabitLog.user_id == user_id,
            HabitLog.date >= week_start,
            HabitLog.date <= week_end,
        )
        .count()
    )
    return count >= target


def get_family_stats(family, db: Session) -> Dict[str, Any]:
    return {
        "level": family.level,
        "total_xp": family.total_xp,
        "xp_for_next_level": calculate_xp_for_next_level(family.level, family.total_xp),
    }
