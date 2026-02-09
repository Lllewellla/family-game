"""Baby diary endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID

from ..database import get_db
from ..models import User, BabyEvent, BabyEventType
from ..schemas import BabyEventCreate, BabyEventUpdate, BabyEventResponse
from ..routers.users import get_current_user

router = APIRouter(prefix="/api/baby", tags=["baby"])


@router.get("/events", response_model=List[BabyEventResponse])
async def get_baby_events(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    event_type: Optional[BabyEventType] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get baby events with pagination and filtering."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    query = db.query(BabyEvent).filter(BabyEvent.family_id == current_user.family_id)
    
    if start_date:
        query = query.filter(BabyEvent.created_at >= datetime.combine(start_date, datetime.min.time()))
    
    if end_date:
        query = query.filter(BabyEvent.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    if event_type:
        query = query.filter(BabyEvent.event_type == event_type)
    
    events = query.order_by(BabyEvent.created_at.desc()).offset(offset).limit(limit).all()
    
    return [BabyEventResponse.model_validate(event) for event in events]


@router.post("/events", response_model=BabyEventResponse)
async def create_baby_event(
    event_data: BabyEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new baby event."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    event_data_dict = event_data.model_dump()
    # Map metadata to event_metadata for SQLAlchemy model
    if "metadata" in event_data_dict:
        event_data_dict["event_metadata"] = event_data_dict.pop("metadata")
    
    event = BabyEvent(
        family_id=current_user.family_id,
        created_by=current_user.id,
        **event_data_dict
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return BabyEventResponse.model_validate(event)


@router.put("/events/{event_id}", response_model=BabyEventResponse)
async def update_baby_event(
    event_id: UUID,
    event_data: BabyEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a baby event."""
    event = db.query(BabyEvent).filter(BabyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check access
    if event.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = event_data.model_dump(exclude_unset=True)
    # Map metadata to event_metadata for SQLAlchemy model
    if "metadata" in update_data:
        update_data["event_metadata"] = update_data.pop("metadata")
    
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    
    return BabyEventResponse.model_validate(event)


@router.delete("/events/{event_id}")
async def delete_baby_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a baby event."""
    event = db.query(BabyEvent).filter(BabyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check access
    if event.family_id != current_user.family_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(event)
    db.commit()
    
    return {"message": "Event deleted successfully"}


@router.get("/summary/{event_date}", response_model=dict)
async def get_daily_summary(
    event_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-generated summary for a specific date."""
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    
    start_datetime = datetime.combine(event_date, datetime.min.time())
    end_datetime = datetime.combine(event_date, datetime.max.time())
    
    events = db.query(BabyEvent).filter(
        BabyEvent.family_id == current_user.family_id,
        BabyEvent.created_at >= start_datetime,
        BabyEvent.created_at <= end_datetime
    ).order_by(BabyEvent.created_at).all()
    
    if not events:
        return {"summary": None, "events": []}
    
    # Group events by type
    events_by_type = {
        "food": [],
        "skill": [],
        "note": []
    }
    
    for event in events:
        events_by_type[event.event_type.value].append({
            "content": event.content,
            "metadata": event.event_metadata,
            "time": event.created_at.isoformat()
        })
    
    # Try to generate AI summary
    try:
        from ..services.ai_service import generate_baby_summary
        summary = await generate_baby_summary(events_by_type, event_date)
    except Exception as e:
        # Fallback to simple summary if AI fails
        summary = f"За {event_date.strftime('%d.%m.%Y')} было зафиксировано {len(events)} событий."
    
    return {
        "summary": summary,
        "events": [BabyEventResponse.model_validate(e) for e in events],
        "date": event_date.isoformat()
    }
