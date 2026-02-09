"""Cron jobs for automated tasks."""
import os
import logging
from datetime import date, datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import BabyEvent, FamilyQuest, User
from ..services.github_service import commit_to_github

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def daily_backup_job():
    """Daily backup job - exports baby diary to GitHub."""
    logger.info("Starting daily backup job...")
    
    db: Session = SessionLocal()
    try:
        # Get all families
        families = db.query(User.family_id).distinct().all()
        
        for (family_id,) in families:
            if not family_id:
                continue
            
            try:
                # Get today's events for this family
                today = date.today()
                start_datetime = datetime.combine(today, datetime.min.time())
                end_datetime = datetime.combine(today, datetime.max.time())
                
                events = db.query(BabyEvent).filter(
                    BabyEvent.family_id == family_id,
                    BabyEvent.created_at >= start_datetime,
                    BabyEvent.created_at <= end_datetime
                ).all()
                
                if events:
                    result = await commit_to_github(events, today)
                    logger.info(f"Backed up {len(events)} events for family {family_id}: {result.get('sha', 'N/A')}")
                else:
                    logger.info(f"No events to backup for family {family_id} today")
                    
            except Exception as e:
                logger.error(f"Error backing up family {family_id}: {e}")
        
    except Exception as e:
        logger.error(f"Error in daily backup job: {e}")
    finally:
        db.close()


async def update_family_quests_job():
    """Update family quest progress."""
    logger.info("Starting family quest update job...")
    
    db: Session = SessionLocal()
    try:
        # Get active quests
        today = date.today()
        active_quests = db.query(FamilyQuest).filter(
            FamilyQuest.is_completed == False,
            FamilyQuest.end_date >= today
        ).all()
        
        for quest in active_quests:
            try:
                # Calculate total XP earned by family members since quest start
                family_members = db.query(User).filter(User.family_id == quest.family_id).all()
                
                # Get XP from habit logs since quest start
                from ..models import HabitLog
                from sqlalchemy import func
                
                total_xp = db.query(func.sum(HabitLog.xp_earned)).join(
                    User, HabitLog.user_id == User.id
                ).filter(
                    User.family_id == quest.family_id,
                    HabitLog.date >= quest.start_date,
                    HabitLog.date <= quest.end_date
                ).scalar() or 0
                
                quest.current_xp = min(total_xp, quest.target_xp)
                
                # Check if completed
                if quest.current_xp >= quest.target_xp and not quest.is_completed:
                    quest.is_completed = True
                    logger.info(f"Family quest '{quest.name}' completed!")
                    
                    # Send notification
                    from ..telegram.bot import notify_family_quest_completed
                    await notify_family_quest_completed(str(quest.family_id), quest.name, db)
                
                db.commit()
                
            except Exception as e:
                logger.error(f"Error updating quest {quest.id}: {e}")
                db.rollback()
        
    except Exception as e:
        logger.error(f"Error in family quest update job: {e}")
    finally:
        db.close()


def setup_scheduler():
    """Setup and start the scheduler."""
    scheduler = AsyncIOScheduler()
    
    # Daily backup at 23:00 UTC
    scheduler.add_job(
        daily_backup_job,
        trigger=CronTrigger(hour=23, minute=0),
        id="daily_backup",
        name="Daily baby diary backup",
        replace_existing=True
    )
    
    # Update family quests every hour
    scheduler.add_job(
        update_family_quests_job,
        trigger=CronTrigger(minute=0),
        id="update_quests",
        name="Update family quests",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started")
    
    return scheduler
