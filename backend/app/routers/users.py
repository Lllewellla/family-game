"""User and auth endpoints. Single auth source: services.auth.verify_and_get_user."""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Family
from ..schemas import UserResponse, TelegramAuth, AuthResponse, InviteUserRequest, JoinFamilyRequest
from ..services.auth import verify_and_get_user

router = APIRouter(prefix="/api", tags=["users"])


def get_current_user(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: verify initData and return current user. Uses single auth service."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Missing Telegram init data")
    try:
        return verify_and_get_user(x_telegram_init_data, db)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/verify", response_model=AuthResponse)
async def verify_auth(auth: TelegramAuth, db: Session = Depends(get_db)):
    """Verify Telegram WebApp initData and return user (create if new)."""
    try:
        user = verify_and_get_user(auth.init_data, db)
        return AuthResponse(user=UserResponse.model_validate(user))
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/users/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.get("/users/family", response_model=List[UserResponse])
async def get_family(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.family_id:
        return []
    members = db.query(User).filter(User.family_id == current_user.family_id).all()
    return [UserResponse.model_validate(m) for m in members]


@router.post("/users/invite")
async def invite_user(
    body: InviteUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Placeholder: in full flow would link user to family by telegram_id."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    return {"message": "Invite flow not implemented in this version"}


@router.post("/users/join")
async def join_family(
    body: JoinFamilyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    family = db.query(Family).filter(Family.id == body.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    current_user.family_id = family.id
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
