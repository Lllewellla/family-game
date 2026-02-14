"""Baby diary events. event_extra in schema matches model."""
from datetime import date, datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, BabyEvent, BabyEventType
from ..schemas import BabyEventCreate, BabyEventUpdate, BabyEventResponse
from ..routers.users import get_current_user

router = APIRouter(prefix="/api/baby", tags=["baby"])


def _get_events_query(db: Session, family_id: UUID, start: date, end: date):
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end, datetime.max.time())
    return (
        db.query(BabyEvent)
        .filter(
            BabyEvent.family_id == family_id,
            BabyEvent.created_at >= start_dt,
            BabyEvent.created_at <= end_dt,
        )
        .order_by(BabyEvent.created_at.desc())
    )


@router.get("/events", response_model=list[BabyEventResponse])
async def get_events(
    start: date | None = Query(None),
    end: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.family_id:
        return []
    if not start:
        start = date.today() - timedelta(days=30)
    if not end:
        end = date.today()
    events = _get_events_query(db, current_user.family_id, start, end).all()
    return [BabyEventResponse.model_validate(e) for e in events]


@router.post("/events", response_model=BabyEventResponse)
async def create_event(
    data: BabyEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family")
    event = BabyEvent(
        family_id=current_user.family_id,
        event_type=data.event_type,
        content=data.content,
        event_extra=data.event_extra,
        created_by=current_user.id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return BabyEventResponse.model_validate(event)


@router.put("/events/{event_id}", response_model=BabyEventResponse)
async def update_event(
    event_id: UUID,
    data: BabyEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(BabyEvent).filter(BabyEvent.id == event_id).first()
    if not event or event.family_id != current_user.family_id:
        raise HTTPException(status_code=404, detail="Event not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(event, k, v)
    db.commit()
    db.refresh(event)
    return BabyEventResponse.model_validate(event)


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(BabyEvent).filter(BabyEvent.id == event_id).first()
    if not event or event.family_id != current_user.family_id:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
    return {"ok": True}


@router.get("/summary/{day}", response_model=dict)
async def get_summary(
    day: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Optional AI summary. Returns simple concatenation if no OPENROUTER_API_KEY."""
    if not current_user.family_id:
        return {"summary": "", "date": str(day)}
    events = _get_events_query(db, current_user.family_id, day, day).all()
    from ..services.ai_service import summarize_events
    summary = summarize_events(events, day)
    return {"summary": summary, "date": str(day)}
