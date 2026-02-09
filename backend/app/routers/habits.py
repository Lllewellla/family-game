"""Habit management endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID

from ..database import get_db
from ..models import User, Habit, HabitLog, HabitType, PrivacyType, Family
from ..schemas import HabitCreate, HabitUpdate, HabitResponse, HabitLogCreate, HabitLogResponse
from ..routers.users import get_current_user
from ..services.xp_service import check_all_adults_completed_shared_habit, update_family_xp

router = APIRouter(prefix="/api/habits", tags=["habits"])


def check_habit_access(habit: Habit, user: User) -> bool:
    """Check if user has access to a habit."""
    if habit.privacy == PrivacyType.PERSONAL:
        return habit.owner_id == user.id
    elif habit.privacy == PrivacyType.PUBLIC:
        return habit.family_id == user.family_id
    elif habit.privacy == PrivacyType.SHARED:
        return habit.family_id == user.family_id
    return False


@router.get("", response_model=List[HabitResponse])
async def get_habits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all habits accessible to current user."""
    habits = db.query(Habit).filter(
        Habit.family_id == current_user.family_id,
        Habit.is_active == True
    ).all()
    
    # Filter by privacy
    accessible_habits = [
        h for h in habits 
        if h.privacy != PrivacyType.PERSONAL or h.owner_id == current_user.id
    ]
    
    return [HabitResponse.model_validate(h) for h in accessible_habits]


@router.get("/today", response_model=List[HabitResponse])
async def get_today_habits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get habits scheduled for today."""
    today = date.today()
    weekday = today.weekday()  # 0 = Monday, 6 = Sunday
    
    habits = db.query(Habit).filter(
        Habit.family_id == current_user.family_id,
        Habit.is_active == True
    ).all()
    
    # Filter by schedule
    today_habits = []
    for habit in habits:
        if habit.schedule_type == "daily":
            today_habits.append(habit)
        elif habit.schedule_type == "weekly":
            schedule_config = habit.schedule_config or {}
            days = schedule_config.get("days", [])
            if weekday in days:
                today_habits.append(habit)
        elif habit.schedule_type == "custom":
            schedule_config = habit.schedule_config or {}
            interval = schedule_config.get("interval", 1)
            start_date = datetime.fromisoformat(schedule_config.get("start_date", today.isoformat())).date()
            days_diff = (today - start_date).days
            if days_diff % interval == 0:
                today_habits.append(habit)
    
    # Filter by privacy
    accessible_habits = [
        h for h in today_habits 
        if h.privacy != PrivacyType.PERSONAL or h.owner_id == current_user.id
    ]
    
    return [HabitResponse.model_validate(h) for h in accessible_habits]


@router.post("", response_model=HabitResponse)
async def create_habit(
    habit_data: HabitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new habit."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    habit = Habit(
        family_id=current_user.family_id,
        owner_id=current_user.id,
        **habit_data.model_dump()
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    
    return HabitResponse.model_validate(habit)


@router.put("/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: UUID,
    habit_data: HabitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a habit."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Check access (only owner can update)
    if habit.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can update habit")
    
    update_data = habit_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(habit, field, value)
    
    db.commit()
    db.refresh(habit)
    
    return HabitResponse.model_validate(habit)


@router.delete("/{habit_id}")
async def delete_habit(
    habit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a habit."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Check access (only owner can delete)
    if habit.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete habit")
    
    db.delete(habit)
    db.commit()
    
    return {"message": "Habit deleted successfully"}


@router.post("/{habit_id}/complete", response_model=HabitLogResponse)
async def complete_habit(
    habit_id: UUID,
    log_data: HabitLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a habit as completed for today."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Check access
    if not check_habit_access(habit, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if already logged today
    today = log_data.date or date.today()
    existing_log = db.query(HabitLog).filter(
        HabitLog.habit_id == habit_id,
        HabitLog.user_id == current_user.id,
        HabitLog.date == today
    ).first()
    
    if existing_log:
        raise HTTPException(status_code=400, detail="Habit already completed today")
    
    # Create log entry
    log = HabitLog(
        habit_id=habit_id,
        user_id=current_user.id,
        date=today,
        value=log_data.value,
        xp_earned=habit.xp_reward
    )
    db.add(log)
    
    # Update user XP
    current_user.total_xp += habit.xp_reward
    
    # Recalculate level
    from math import sqrt
    new_level = int(sqrt(current_user.total_xp / 100)) + 1
    if new_level > current_user.level:
        current_user.level = new_level
    
    # If this is a shared habit, check if all adults completed it
    # If yes, award XP to the family
    family_xp_awarded = False
    if habit.privacy == PrivacyType.SHARED:
        # Commit user changes first so the new log is available
        db.flush()
        
        # Check if all adults completed the habit today
        if check_all_adults_completed_shared_habit(habit, today, db):
            # Get family and award XP
            family = db.query(Family).filter(Family.id == habit.family_id).first()
            if family:
                # Award XP equal to habit reward (or could be multiplied)
                family_xp_result = update_family_xp(family, habit.xp_reward, db)
                family_xp_awarded = True
    
    db.commit()
    db.refresh(log)
    
    # Create response with family XP info if awarded
    response_data = HabitLogResponse.model_validate(log).model_dump()
    if family_xp_awarded:
        response_data["family_xp_awarded"] = True
        response_data["family_xp_amount"] = habit.xp_reward
    
    return HabitLogResponse(**response_data)


@router.get("/shared", response_model=List[HabitResponse])
async def get_shared_habits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get shared habits for the family."""
    habits = db.query(Habit).filter(
        Habit.family_id == current_user.family_id,
        Habit.privacy == PrivacyType.SHARED,
        Habit.is_active == True
    ).all()
    
    return [HabitResponse.model_validate(h) for h in habits]


@router.get("/public/{user_id}", response_model=List[HabitResponse])
async def get_public_habits(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get public habits for a specific user."""
    # Check that user belongs to the same family
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user or target_user.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    habits = db.query(Habit).filter(
        Habit.family_id == current_user.family_id,
        Habit.owner_id == user_id,
        Habit.privacy == PrivacyType.PUBLIC,
        Habit.is_active == True
    ).all()
    
    return [HabitResponse.model_validate(h) for h in habits]


@router.get("/personal", response_model=List[HabitResponse])
async def get_personal_habits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all habits accessible to current user (shared, public, and personal)."""
    habits = db.query(Habit).filter(
        Habit.family_id == current_user.family_id,
        Habit.is_active == True
    ).all()
    
    # Filter by privacy - include shared, public, and user's personal habits
    accessible_habits = [
        h for h in habits 
        if h.privacy != PrivacyType.PERSONAL or h.owner_id == current_user.id
    ]
    
    return [HabitResponse.model_validate(h) for h in accessible_habits]


@router.get("/{habit_id}/logs", response_model=List[HabitLogResponse])
async def get_habit_logs(
    habit_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get habit logs for a date range."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Check access
    if not check_habit_access(habit, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Set default date range (last 7 days if not specified)
    if not start_date:
        start_date = date.today() - timedelta(days=7)
    if not end_date:
        end_date = date.today()
    
    query = db.query(HabitLog).filter(
        HabitLog.habit_id == habit_id,
        HabitLog.date >= start_date,
        HabitLog.date <= end_date
    )
    
    # Filter by user if specified
    if user_id:
        # Check that user belongs to the same family
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user or target_user.family_id != current_user.family_id:
            raise HTTPException(status_code=403, detail="Access denied")
        query = query.filter(HabitLog.user_id == user_id)
    
    logs = query.order_by(HabitLog.date.desc()).all()
    
    return [HabitLogResponse.model_validate(log) for log in logs]
