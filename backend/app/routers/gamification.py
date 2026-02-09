"""Gamification endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from uuid import UUID

from ..database import get_db
from ..models import User, FamilyQuest, Family
from ..schemas import FamilyQuestCreate, FamilyQuestResponse, StatsResponse, LeaderboardEntry, FamilyStatsResponse
from ..routers.users import get_current_user
from ..services.xp_service import get_user_stats, get_family_stats

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's gamification stats."""
    stats = get_user_stats(current_user, db)
    
    # Get active family quest
    family_quest = None
    if current_user.family_id:
        family_quest = db.query(FamilyQuest).filter(
            FamilyQuest.family_id == current_user.family_id,
            FamilyQuest.is_completed == False,
            FamilyQuest.end_date >= date.today()
        ).order_by(FamilyQuest.created_at.desc()).first()
    
    quest_progress = None
    if family_quest:
        quest_progress = {
            "id": str(family_quest.id),
            "name": family_quest.name,
            "target_xp": family_quest.target_xp,
            "current_xp": family_quest.current_xp,
            "progress_percent": int((family_quest.current_xp / family_quest.target_xp) * 100) if family_quest.target_xp > 0 else 0
        }
    
    return StatsResponse(
        level=stats["level"],
        total_xp=stats["total_xp"],
        xp_for_next_level=stats["xp_for_next_level"],
        current_streaks=stats["current_streaks"],
        family_quest_progress=quest_progress
    )


@router.get("/family-quest", response_model=FamilyQuestResponse)
async def get_family_quest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current active family quest. Auto-creates one if missing."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    today = date.today()
    quest = db.query(FamilyQuest).filter(
        FamilyQuest.family_id == current_user.family_id,
        FamilyQuest.is_completed == False,
        FamilyQuest.end_date >= today
    ).order_by(FamilyQuest.created_at.desc()).first()
    
    if not quest:
        quest = FamilyQuest(
            family_id=current_user.family_id,
            name="Семейная неделя",
            target_xp=500,
            current_xp=0,
            start_date=today,
            end_date=today + timedelta(days=7),
            is_completed=False,
        )
        db.add(quest)
        db.commit()
        db.refresh(quest)
    
    return FamilyQuestResponse.model_validate(quest)


@router.post("/family-quest", response_model=FamilyQuestResponse)
async def create_family_quest(
    quest_data: FamilyQuestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new family quest."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    # Check if user is admin
    from ..models import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can create family quests")
    
    quest = FamilyQuest(
        family_id=current_user.family_id,
        **quest_data.model_dump()
    )
    db.add(quest)
    db.commit()
    db.refresh(quest)
    
    return FamilyQuestResponse.model_validate(quest)


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get family leaderboard."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    family_members = db.query(User).filter(
        User.family_id == current_user.family_id
    ).order_by(User.total_xp.desc(), User.level.desc()).all()
    
    return [
        LeaderboardEntry(
            user_id=member.id,
            username=member.username,
            first_name=member.first_name,
            level=member.level,
            total_xp=member.total_xp
        )
        for member in family_members
    ]

@router.get("/family-stats", response_model=FamilyStatsResponse)
async def get_family_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get family gamification stats."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    family = db.query(Family).filter(Family.id == current_user.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    
    stats = get_family_stats(family, db)
    return FamilyStatsResponse(**stats)
