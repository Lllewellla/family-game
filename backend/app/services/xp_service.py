"""XP and level calculation service."""
from math import sqrt
from datetime import date, timedelta
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..models import User, HabitLog, Streak, Habit


def calculate_level(total_xp: int) -> int:
    """Calculate user level based on total XP."""
    return int(sqrt(total_xp / 100)) + 1


def calculate_xp_for_next_level(level: int, total_xp: int) -> int:
    """Calculate XP needed for next level."""
    xp_for_level = (level ** 2) * 100
    return max(0, xp_for_level - total_xp)


def update_user_xp(user: User, xp_amount: int, db: Session) -> Dict[str, Any]:
    """
    Update user XP and level.
    
    Returns:
        Dictionary with level_up flag and new level
    """
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
        "xp_for_next_level": calculate_xp_for_next_level(new_level, user.total_xp)
    }


def update_streak(habit_id, user_id, db: Session) -> Dict[str, Any]:
    """
    Update streak for a habit.
    
    Returns:
        Dictionary with streak info and bonuses
    """
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    streak = db.query(Streak).filter(
        Streak.habit_id == habit_id,
        Streak.user_id == user_id
    ).first()
    
    if not streak:
        streak = Streak(
            habit_id=habit_id,
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_completed_date=today
        )
        db.add(streak)
    else:
        if streak.last_completed_date == yesterday:
            # Continue streak
            streak.current_streak += 1
        elif streak.last_completed_date == today:
            # Already completed today
            return {
                "current_streak": streak.current_streak,
                "bonus_xp": 0,
                "milestone": None
            }
        else:
            # Streak broken, reset
            streak.current_streak = 1
        
        streak.last_completed_date = today
        streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    
    db.commit()
    
    # Calculate bonus XP for milestones
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
    elif streak.current_streak % 30 == 0:
        bonus_xp = 100
        milestone = f"{streak.current_streak}-day streak!"
    
    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "bonus_xp": bonus_xp,
        "milestone": milestone
    }


def get_user_stats(user: User, db: Session) -> Dict[str, Any]:
    """Get comprehensive stats for a user."""
    streaks = db.query(Streak).filter(Streak.user_id == user.id).all()
    
    return {
        "level": user.level,
        "total_xp": user.total_xp,
        "xp_for_next_level": calculate_xp_for_next_level(user.level, user.total_xp),
        "current_streaks": [
            {
                "habit_id": str(s.habit_id),
                "current_streak": s.current_streak,
                "longest_streak": s.longest_streak
            }
            for s in streaks
        ]
    }

def update_family_xp(family, xp_amount: int, db: Session) -> Dict[str, Any]:
    """
    Update family XP and level.
    
    Returns:
        Dictionary with level_up flag and new level
    """
    from ..models import Family
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
        "xp_for_next_level": calculate_xp_for_next_level(new_level, family.total_xp)
    }


def check_all_adults_completed_shared_habit(habit, completion_date: date, db: Session) -> bool:
    """
    Check if all adult family members have completed a shared habit on the given date.
    
    Args:
        habit: Habit instance (must be shared)
        completion_date: Date to check
        db: Database session
    
    Returns:
        True if all adults completed, False otherwise
    """
    from ..models import User, HabitLog, PrivacyType
    
    if habit.privacy != PrivacyType.SHARED:
        return False
    
    # Get all adult members (all members are considered adults for now)
    # In future, you might want to add an 'is_adult' field to User
    family_members = db.query(User).filter(
        User.family_id == habit.family_id
    ).all()
    
    if not family_members:
        return False
    
    # Check if all members have completed the habit today
    for member in family_members:
        log = db.query(HabitLog).filter(
            HabitLog.habit_id == habit.id,
            HabitLog.user_id == member.id,
            HabitLog.date == completion_date
        ).first()
        
        if not log:
            return False
    
    return True


def get_family_stats(family, db: Session) -> Dict[str, Any]:
    """Get comprehensive stats for a family."""
    return {
        "level": family.level,
        "total_xp": family.total_xp,
        "xp_for_next_level": calculate_xp_for_next_level(family.level, family.total_xp)
    }
