"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID

from .models import HabitType, ScheduleType, PrivacyType, BabyEventType, UserRole


# User Schemas
class UserBase(BaseModel):
    telegram_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    role: UserRole = UserRole.PARTICIPANT


class UserCreate(UserBase):
    family_id: Optional[UUID] = None


class UserResponse(UserBase):
    id: UUID
    level: int
    total_xp: int
    family_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Habit Schemas
class HabitBase(BaseModel):
    name: str
    type: HabitType
    schedule_type: ScheduleType
    schedule_config: Optional[Dict[str, Any]] = None
    privacy: PrivacyType
    xp_reward: int = 10


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    schedule_type: Optional[ScheduleType] = None
    schedule_config: Optional[Dict[str, Any]] = None
    privacy: Optional[PrivacyType] = None
    xp_reward: Optional[int] = None
    is_active: Optional[bool] = None


class HabitResponse(HabitBase):
    id: UUID
    family_id: UUID
    owner_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# HabitLog Schemas
class HabitLogCreate(BaseModel):
    habit_id: UUID
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

    class Config:
        from_attributes = True


# BabyEvent Schemas
class BabyEventCreate(BaseModel):
    event_type: BabyEventType
    content: str
    metadata: Optional[Dict[str, Any]] = None


class BabyEventUpdate(BaseModel):
    event_type: Optional[BabyEventType] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class BabyEventResponse(BaseModel):
    id: UUID
    family_id: UUID
    event_type: BabyEventType
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# FamilyQuest Schemas
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


# Gamification Schemas
class StatsResponse(BaseModel):
    level: int
    total_xp: int
    xp_for_next_level: int
    current_streaks: List[Dict[str, Any]] = []
    family_quest_progress: Optional[Dict[str, Any]] = None


class LeaderboardEntry(BaseModel):
    user_id: UUID
    username: Optional[str]
    first_name: Optional[str]
    level: int
    total_xp: int


# Auth Schemas
class TelegramAuth(BaseModel):
    init_data: str


class AuthResponse(BaseModel):
    user: UserResponse
    token: Optional[str] = None  # For future JWT if needed
