"""Export and backup endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import Optional

from ..database import get_db
from ..models import User, BabyEvent
from ..routers.users import get_current_user
from ..services.github_service import generate_markdown_diary, commit_to_github

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/diary")
async def export_diary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export baby diary as Markdown file."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    if not start_date:
        start_date = date.today() - timedelta(days=30)  # Last 30 days by default
    
    if not end_date:
        end_date = date.today()
    
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    events = db.query(BabyEvent).filter(
        BabyEvent.family_id == current_user.family_id,
        BabyEvent.created_at >= start_datetime,
        BabyEvent.created_at <= end_datetime
    ).order_by(BabyEvent.created_at).all()
    
    markdown_content = generate_markdown_diary(events, start_date, end_date)
    
    filename = f"baby_diary_{start_date}_{end_date}.md"
    
    return Response(
        content=markdown_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/diary/backup")
async def backup_diary_to_github(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger backup to GitHub."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    # Check if user is admin
    from ..models import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can trigger backups")
    
    try:
        # Get today's events
        today = date.today()
        start_datetime = datetime.combine(today, datetime.min.time())
        end_datetime = datetime.combine(today, datetime.max.time())
        
        events = db.query(BabyEvent).filter(
            BabyEvent.family_id == current_user.family_id,
            BabyEvent.created_at >= start_datetime,
            BabyEvent.created_at <= end_datetime
        ).order_by(BabyEvent.created_at).all()
        
        if not events:
            return {"message": "No events to backup today", "committed": False}
        
        result = await commit_to_github(events, today)
        
        return {
            "message": "Backup completed successfully",
            "committed": True,
            "commit_sha": result.get("sha") if result else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")
