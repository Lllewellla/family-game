"""Export diary to Markdown / GitHub backup."""
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, BabyEvent
from ..routers.users import get_current_user
from ..services.github_service import generate_markdown, commit_to_github

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/diary")
async def export_diary(
    start: date | None = None,
    end: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return Markdown diary for date range."""
    if not current_user.family_id:
        return {"markdown": "# Нет данных\n", "start": None, "end": None}
    if not start:
        start = date.today() - timedelta(days=30)
    if not end:
        end = date.today()
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end, datetime.max.time())
    events = (
        db.query(BabyEvent)
        .filter(
            BabyEvent.family_id == current_user.family_id,
            BabyEvent.created_at >= start_dt,
            BabyEvent.created_at <= end_dt,
        )
        .order_by(BabyEvent.created_at.desc())
        .all()
    )
    markdown = generate_markdown(events, start, end)
    return {"markdown": markdown, "start": str(start), "end": str(end)}


@router.post("/diary/backup")
async def backup_diary_to_github(
    day: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Push today's (or given day's) diary to GitHub. Optional feature."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="No family")
    target = day or date.today()
    start_dt = datetime.combine(target, datetime.min.time())
    end_dt = datetime.combine(target, datetime.max.time())
    events = (
        db.query(BabyEvent)
        .filter(
            BabyEvent.family_id == current_user.family_id,
            BabyEvent.created_at >= start_dt,
            BabyEvent.created_at <= end_dt,
        )
        .all()
    )
    try:
        result = await commit_to_github(events, target)
        return {"ok": True, "sha": result.get("sha")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
