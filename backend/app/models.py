"""SQLAlchemy database models."""
from sqlalchemy import Column, String, Integer, Boolean, Date, DateTime, ForeignKey, UniqueConstraint, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from .database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PARTICIPANT = "participant"


class HabitType(str, enum.Enum):
    BOOLEAN = "boolean"
    SCALE = "scale"
    QUANTITY = "quantity"
    CHECKLIST = "checklist"


class ScheduleType(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    CUSTOM = "custom"


class PrivacyType(str, enum.Enum):
    PERSONAL = "personal"
    PUBLIC = "public"
    SHARED = "shared"


class BabyEventType(str, enum.Enum):
    FOOD = "food"
    SKILL = "skill"
    NOTE = "note"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    telegram_id = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.PARTICIPANT, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    total_xp = Column(Integer, default=0, nullable=False)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="members")
    owned_habits = relationship("Habit", back_populates="owner", foreign_keys="Habit.owner_id")
    habit_logs = relationship("HabitLog", back_populates="user")
    baby_events = relationship("BabyEvent", back_populates="created_by_user")
    streaks = relationship("Streak", back_populates="user")


class Family(Base):
    __tablename__ = "families"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    members = relationship("User", back_populates="family")
    habits = relationship("Habit", back_populates="family")
    baby_events = relationship("BabyEvent", back_populates="family")
    quests = relationship("FamilyQuest", back_populates="family")


class Habit(Base):
    __tablename__ = "habits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(SQLEnum(HabitType), nullable=False)
    schedule_type = Column(SQLEnum(ScheduleType), nullable=False)
    schedule_config = Column(JSONB, nullable=True)  # Days of week, interval, etc.
    privacy = Column(SQLEnum(PrivacyType), nullable=False)
    xp_reward = Column(Integer, default=10, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="habits")
    owner = relationship("User", back_populates="owned_habits", foreign_keys=[owner_id])
    logs = relationship("HabitLog", back_populates="habit")
    streaks = relationship("Streak", back_populates="habit")


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    habit_id = Column(UUID(as_uuid=True), ForeignKey("habits.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    value = Column(JSONB, nullable=True)  # Value depends on habit type
    xp_earned = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    habit = relationship("Habit", back_populates="logs")
    user = relationship("User", back_populates="habit_logs")

    __table_args__ = (
        UniqueConstraint("habit_id", "user_id", "date", name="unique_habit_user_date"),
    )


class BabyEvent(Base):
    __tablename__ = "baby_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
    event_type = Column(SQLEnum(BabyEventType), nullable=False)
    content = Column(String, nullable=False)
    metadata = Column(JSONB, nullable=True)  # Additional data (product, skill details)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="baby_events")
    created_by_user = relationship("User", back_populates="baby_events")


class FamilyQuest(Base):
    __tablename__ = "family_quests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(UUID(as_uuid=True), ForeignKey("families.id"), nullable=False)
    name = Column(String, nullable=False)
    target_xp = Column(Integer, nullable=False)
    current_xp = Column(Integer, default=0, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="quests")


class Streak(Base):
    __tablename__ = "streaks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    habit_id = Column(UUID(as_uuid=True), ForeignKey("habits.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_completed_date = Column(Date, nullable=True)

    # Relationships
    habit = relationship("Habit", back_populates="streaks")
    user = relationship("User", back_populates="streaks")

    __table_args__ = (
        UniqueConstraint("habit_id", "user_id", name="unique_habit_user_streak"),
    )
