"""Optional cron jobs. One session per job, always closed in finally. Do not block startup on failure."""
import logging
from datetime import date, datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from ..database import session_scope
from ..models import BabyEvent, FamilyQuest, User, HabitLog

logger = logging.getLogger(__name__)


async def daily_backup_job():
    """Export today's baby events to GitHub per family. Optional: skip if GitHub not configured."""
    logger.info("Daily backup job starting...")
    with session_scope() as db:
        try:
            family_ids = [f[0] for f in db.query(User.family_id).distinct().all() if f[0]]
            today = date.today()
            start_dt = datetime.combine(today, datetime.min.time())
            end_dt = datetime.combine(today, datetime.max.time())
            for fid in family_ids:
                try:
                    events = (
                        db.query(BabyEvent)
                        .filter(
                            BabyEvent.family_id == fid,
                            BabyEvent.created_at >= start_dt,
                            BabyEvent.created_at <= end_dt,
                        )
                        .all()
                    )
                    if events:
                        from ..services.github_service import commit_to_github
                        result = await commit_to_github(events, today)
                        logger.info("Backed up family %s: %s", fid, result.get("sha", "N/A"))
                except ValueError:
                    pass
                except Exception as e:
                    logger.warning("Backup family %s failed: %s", fid, e)
        except Exception as e:
            logger.warning("Daily backup job failed: %s", e)


async def update_family_quests_job():
    """Recalc family quest progress and mark completed; notify if just completed."""
    logger.info("Update family quests job starting...")
    with session_scope() as db:
        try:
            today = date.today()
            active = (
                db.query(FamilyQuest)
                .filter(FamilyQuest.is_completed == False, FamilyQuest.end_date >= today)
                .all()
            )
            from sqlalchemy import func
            for quest in active:
                try:
                    sum_xp = db.query(func.coalesce(func.sum(HabitLog.xp_earned), 0)).join(
                        User, HabitLog.user_id == User.id
                    ).filter(
                        User.family_id == quest.family_id,
                        HabitLog.date >= quest.start_date,
                        HabitLog.date <= quest.end_date,
                    ).scalar() or 0
                    quest.current_xp = min(int(sum_xp), quest.target_xp)
                    if quest.current_xp >= quest.target_xp:
                        quest.is_completed = True
                        from ..telegram.bot import notify_family_quest_completed
                        await notify_family_quest_completed(str(quest.family_id), quest.name, db)
                except Exception as e:
                    logger.warning("Quest %s update failed: %s", quest.id, e)
        except Exception as e:
            logger.warning("Update quests job failed: %s", e)


def setup_scheduler() -> AsyncIOScheduler:
    """Start scheduler. Call from lifespan; on failure log and continue."""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        daily_backup_job,
        trigger=CronTrigger(hour=23, minute=0),
        id="daily_backup",
        replace_existing=True,
    )
    scheduler.add_job(
        update_family_quests_job,
        trigger=CronTrigger(minute=0),
        id="update_quests",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started")
    return scheduler
