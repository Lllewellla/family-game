"""Gamification: stats, family quest, leaderboard."""
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import User, Family, FamilyQuest, HabitLog
from ..schemas import FamilyQuestCreate, FamilyQuestResponse, FamilyStatsResponse, StatsResponse, LeaderboardEntry
from ..routers.users import get_current_user
from ..services.xp_service import get_user_stats, get_family_stats, calculate_xp_for_next_level
from ..telegram.bot import notify_family_quest_completed

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stats = get_user_stats(current_user, db)
    quest = (
        db.query(FamilyQuest)
        .filter(
            FamilyQuest.family_id == current_user.family_id,
            FamilyQuest.is_completed == False,
            FamilyQuest.end_date >= date.today(),
        )
        .first()
    )
    family_quest_progress = None
    if quest:
        family_quest_progress = {
            "id": str(quest.id),
            "name": quest.name,
            "target_xp": quest.target_xp,
            "current_xp": quest.current_xp,
            "end_date": str(quest.end_date),
        }
    return StatsResponse(
        level=stats["level"],
        total_xp=stats["total_xp"],
        xp_for_next_level=stats["xp_for_next_level"],
        current_streaks=stats["current_streaks"],
        family_quest_progress=family_quest_progress,
    )


@router.get("/family-quest", response_model=FamilyQuestResponse | None)
async def get_family_quest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.family_id:
        return None
    quest = (
        db.query(FamilyQuest)
        .filter(
            FamilyQuest.family_id == current_user.family_id,
            FamilyQuest.is_completed == False,
            FamilyQuest.end_date >= date.today(),
        )
        .first()
    )
    return FamilyQuestResponse.model_validate(quest) if quest else None


@router.post("/family-quest", response_model=FamilyQuestResponse)
async def create_family_quest(
    data: FamilyQuestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    quest = FamilyQuest(
        family_id=current_user.family_id,
        name=data.name,
        target_xp=data.target_xp,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(quest)
    db.commit()
    db.refresh(quest)
    return FamilyQuestResponse.model_validate(quest)


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.family_id:
        return []
    members = (
        db.query(User)
        .filter(User.family_id == current_user.family_id)
        .order_by(User.total_xp.desc())
        .all()
    )
    return [
        LeaderboardEntry(
            user_id=m.id,
            username=m.username,
            first_name=m.first_name,
            level=m.level,
            total_xp=m.total_xp,
        )
        for m in members
    ]


@router.get("/family-stats", response_model=FamilyStatsResponse)
async def get_family_stats_route(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family")
    family = db.query(Family).filter(Family.id == current_user.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return FamilyStatsResponse(**get_family_stats(family, db))
