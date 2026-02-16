"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID

from .models import HabitType, ScheduleType, PrivacyType, BabyEventType, UserRole


# User
class UserResponse(BaseModel):
    id: UUID
    telegram_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    role: UserRole
    level: int
    total_xp: int
    family_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InviteUserRequest(BaseModel):
    telegram_id: Optional[str] = None
    username: Optional[str] = None


class JoinFamilyRequest(BaseModel):
    family_id: UUID


# Auth
class TelegramAuth(BaseModel):
    init_data: str


class AuthResponse(BaseModel):
    user: UserResponse
    token: Optional[str] = None


# Habit
class HabitBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: HabitType
    schedule_type: ScheduleType
    schedule_config: Optional[Dict[str, Any]] = None
    privacy: PrivacyType
    xp_reward: int = 10
    target_value: Optional[Dict[str, Any]] = None


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule_type: Optional[ScheduleType] = None
    schedule_config: Optional[Dict[str, Any]] = None
    privacy: Optional[PrivacyType] = None
    xp_reward: Optional[int] = None
    target_value: Optional[Dict[str, Any]] = None
    goal_effective_from: Optional[date] = None
    is_active: Optional[bool] = None


class HabitResponse(HabitBase):
    id: UUID
    family_id: UUID
    owner_id: UUID
    goal_effective_from: Optional[date] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class HabitLogCreate(BaseModel):
    habit_id: UUID
    date: date
    value: Optional[Dict[str, Any]] = None


class HabitCompleteBody(BaseModel):
    """Body for POST /habits/{id}/complete: date and optional value."""
    date: date
    value: Optional[Dict[str, Any]] = None


class HabitLogResponse(BaseModel):
    id: UUID
    habit_id: UUID
    user_id: UUID
    date: date
    value: Optional[Dict[str, Any]] = None
    xp_earned: int
    created_at: datetime
    family_xp_awarded: Optional[bool] = None
    family_xp_amount: Optional[int] = None

    class Config:
        from_attributes = True


class HabitStatsResponse(BaseModel):
    current_streak: int = 0
    longest_streak: int = 0
    weekly_done: Optional[int] = None
    weekly_target: Optional[int] = None
    percent_week: Optional[float] = None
    percent_month: Optional[float] = None


# Baby (event_extra matches model column)
class BabyEventCreate(BaseModel):
    event_type: BabyEventType
    content: str
    event_extra: Optional[Dict[str, Any]] = None


class BabyEventUpdate(BaseModel):
    event_type: Optional[BabyEventType] = None
    content: Optional[str] = None
    event_extra: Optional[Dict[str, Any]] = None


class BabyEventResponse(BaseModel):
    id: UUID
    family_id: UUID
    event_type: BabyEventType
    content: str
    event_extra: Optional[Dict[str, Any]] = None
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# FamilyQuest
class FamilyQuestCreate(BaseModel):
    name: str
    target_xp: int
    start_date: date
    end_date: date


class FamilyQuestResponse(BaseModel):
    id: UUID
    family_id: UUID
    name: str
    target_xp: int
    current_xp: int
    start_date: date
    end_date: date
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Gamification
class FamilyStatsResponse(BaseModel):
    level: int
    total_xp: int
    xp_for_next_level: int


class StatsResponse(BaseModel):
    level: int
    total_xp: int
    xp_for_next_level: int
    current_streaks: List[Dict[str, Any]] = []
    family_quest_progress: Optional[Dict[str, Any]] = None


class LeaderboardEntry(BaseModel):
    user_id: UUID
    username: Optional[str] = None
    first_name: Optional[str] = None
    level: int
    total_xp: int
