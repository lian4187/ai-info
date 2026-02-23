import logging
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.task import ScheduledTask, TaskLog

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

SEED_TASKS = [
    {"task_type": "fetch_feeds", "cron_expression": "0 */2 * * *"},
    {"task_type": "daily_digest", "cron_expression": "0 22 * * *"},
    {"task_type": "weekly_digest", "cron_expression": "0 10 * * 1"},
    {"task_type": "monthly_digest", "cron_expression": "0 10 1 * *"},
]


async def _run_fetch_feeds():
    """Execute feed fetching task."""
    async with AsyncSessionLocal() as db:
        try:
            from app.services.feed_service import fetch_all_active_feeds
            result = await fetch_all_active_feeds(db)
            await _log_task_run(db, "fetch_feeds", "success", f"Fetched {result} feeds")
        except Exception as e:
            logger.error(f"fetch_feeds failed: {e}")
            await _log_task_run(db, "fetch_feeds", "failed", str(e))


async def _run_daily_digest():
    """Execute daily digest generation."""
    async with AsyncSessionLocal() as db:
        try:
            from app.services.digest_service import generate_daily_digest
            report = await generate_daily_digest(db)
            msg = f"Generated daily digest with {report.article_count} articles" if report else "No articles to digest"
            await _log_task_run(db, "daily_digest", "success", msg)
        except Exception as e:
            logger.error(f"daily_digest failed: {e}")
            await _log_task_run(db, "daily_digest", "failed", str(e))


async def _run_weekly_digest():
    """Execute weekly digest generation."""
    async with AsyncSessionLocal() as db:
        try:
            from app.services.digest_service import generate_weekly_digest
            report = await generate_weekly_digest(db)
            msg = f"Generated weekly digest with {report.article_count} articles" if report else "No articles to digest"
            await _log_task_run(db, "weekly_digest", "success", msg)
        except Exception as e:
            logger.error(f"weekly_digest failed: {e}")
            await _log_task_run(db, "weekly_digest", "failed", str(e))


async def _run_monthly_digest():
    """Execute monthly digest generation."""
    async with AsyncSessionLocal() as db:
        try:
            from app.services.digest_service import generate_monthly_digest
            report = await generate_monthly_digest(db)
            msg = f"Generated monthly digest with {report.article_count} articles" if report else "No articles to digest"
            await _log_task_run(db, "monthly_digest", "success", msg)
        except Exception as e:
            logger.error(f"monthly_digest failed: {e}")
            await _log_task_run(db, "monthly_digest", "failed", str(e))


TASK_HANDLERS = {
    "fetch_feeds": _run_fetch_feeds,
    "daily_digest": _run_daily_digest,
    "weekly_digest": _run_weekly_digest,
    "monthly_digest": _run_monthly_digest,
}


async def _log_task_run(db: AsyncSession, task_type: str, status: str, message: str):
    """Log a task execution and update last_run_at."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(ScheduledTask).where(ScheduledTask.task_type == task_type)
    )
    task = result.scalar_one_or_none()
    if task:
        task.last_run_at = now
        log = TaskLog(
            task_id=task.id,
            status=status,
            message=message,
            started_at=now - timedelta(seconds=1),
            finished_at=now,
        )
        db.add(log)
        await db.commit()


async def seed_default_tasks(db: AsyncSession):
    """Create default scheduled tasks if they don't exist."""
    for seed in SEED_TASKS:
        result = await db.execute(
            select(ScheduledTask).where(ScheduledTask.task_type == seed["task_type"])
        )
        if not result.scalar_one_or_none():
            task = ScheduledTask(**seed)
            db.add(task)
    await db.commit()


async def load_and_schedule_tasks():
    """Load tasks from DB and add them to the scheduler."""
    async with AsyncSessionLocal() as db:
        await seed_default_tasks(db)
        result = await db.execute(
            select(ScheduledTask).where(ScheduledTask.is_enabled == True)
        )
        tasks = result.scalars().all()
        for task in tasks:
            handler = TASK_HANDLERS.get(task.task_type)
            if handler:
                try:
                    parts = task.cron_expression.split()
                    trigger = CronTrigger(
                        minute=parts[0],
                        hour=parts[1],
                        day=parts[2],
                        month=parts[3],
                        day_of_week=parts[4],
                    )
                    scheduler.add_job(
                        handler,
                        trigger=trigger,
                        id=f"task_{task.task_type}",
                        replace_existing=True,
                    )
                    logger.info(f"Scheduled {task.task_type}: {task.cron_expression}")
                except Exception as e:
                    logger.error(f"Failed to schedule {task.task_type}: {e}")


async def reschedule_task(task_type: str, cron_expression: str, is_enabled: bool):
    """Reschedule or remove a task from the scheduler."""
    job_id = f"task_{task_type}"
    existing = scheduler.get_job(job_id)
    if existing:
        scheduler.remove_job(job_id)

    if is_enabled:
        handler = TASK_HANDLERS.get(task_type)
        if handler:
            parts = cron_expression.split()
            trigger = CronTrigger(
                minute=parts[0],
                hour=parts[1],
                day=parts[2],
                month=parts[3],
                day_of_week=parts[4],
            )
            scheduler.add_job(
                handler,
                trigger=trigger,
                id=job_id,
                replace_existing=True,
            )


async def run_task_now(task_type: str) -> str:
    """Manually trigger a task immediately."""
    handler = TASK_HANDLERS.get(task_type)
    if not handler:
        raise ValueError(f"Unknown task type: {task_type}")
    await handler()
    return f"Task {task_type} executed"


async def start_scheduler():
    """Start the APScheduler."""
    await load_and_schedule_tasks()
    scheduler.start()
    logger.info("Scheduler started")


async def stop_scheduler():
    """Stop the APScheduler."""
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
