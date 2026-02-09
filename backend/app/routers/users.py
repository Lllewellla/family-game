"""User authentication and management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
import os
from uuid import UUID

from ..database import get_db
from ..models import User, Family, UserRole
from ..schemas import TelegramAuth, AuthResponse, UserResponse, UserCreate, InviteUserRequest, JoinFamilyRequest
from ..utils.telegram_auth import verify_telegram_webapp_data, parse_telegram_user_data

router = APIRouter(prefix="/api", tags=["users"])


def get_current_user(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Missing Telegram init data")
    
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    
    # Verify signature
    if not verify_telegram_webapp_data(x_telegram_init_data, bot_token):
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")
    
    # Parse user data
    user_data = parse_telegram_user_data(x_telegram_init_data)
    if not user_data:
        raise HTTPException(status_code=401, detail="Could not parse user data")
    
    telegram_id = str(user_data.get("id"))
    if not telegram_id:
        raise HTTPException(status_code=401, detail="Missing user ID")
    
    # Find or create user
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    
    if not user:
        # Create new user and family
        family = Family()
        db.add(family)
        db.flush()
        
        from ..models import UserRole
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name"),
            family_id=family.id,
            role=UserRole.ADMIN  # First user is admin
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user info if changed
        if user.username != user_data.get("username") or user.first_name != user_data.get("first_name"):
            user.username = user_data.get("username")
            user.first_name = user_data.get("first_name")
            db.commit()
            db.refresh(user)
    
    return user


@router.post("/auth/verify", response_model=AuthResponse)
async def verify_auth(
    auth: TelegramAuth,
    db: Session = Depends(get_db)
):
    """Verify Telegram WebApp initData and return user info."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    
    if not verify_telegram_webapp_data(auth.init_data, bot_token):
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")
    
    user_data = parse_telegram_user_data(auth.init_data)
    if not user_data:
        raise HTTPException(status_code=401, detail="Could not parse user data")
    
    telegram_id = str(user_data.get("id"))
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    
    if not user:
        # Create new user and family
        family = Family()
        db.add(family)
        db.flush()
        
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name"),
            family_id=family.id,
            role=UserRole.ADMIN
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return AuthResponse(user=UserResponse.model_validate(user))


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return UserResponse.model_validate(current_user)


@router.get("/users/family", response_model=list[UserResponse])
async def get_family_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all family members."""
    if not current_user.family_id:
        return []
    
    family_members = db.query(User).filter(User.family_id == current_user.family_id).all()
    return [UserResponse.model_validate(member) for member in family_members]

@router.post("/users/family/invite", response_model=UserResponse)
async def invite_user_to_family(
    invite_data: InviteUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a user to join the current user's family."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You must belong to a family to invite members")
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can invite members")
    
    user = None
    if invite_data.telegram_id:
        user = db.query(User).filter(User.telegram_id == invite_data.telegram_id).first()
    elif invite_data.username:
        username = invite_data.username.lstrip("@")
        user = db.query(User).filter(User.username == username).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found. User must have opened the bot at least once.")
    
    if user.family_id:
        if user.family_id == current_user.family_id:
            raise HTTPException(status_code=400, detail="User is already in your family")
        else:
            raise HTTPException(status_code=400, detail="User is already in another family")
    
    user.family_id = current_user.family_id
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)
