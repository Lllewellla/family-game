"""FastAPI application entry point. Health checks process + DB only. Bot polling not run here (conflicts with uvicorn event loop)."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .database import engine, Base
from .config import get_settings
from . import models  # noqa: F401 - register models with Base
from .routers import users, habits, baby, gamification, export


def _run_habit_migration():
    """Add description, goal_effective_from and new enum values if not present (e.g. after deploy)."""
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE habits ADD COLUMN IF NOT EXISTS description TEXT"))
        conn.execute(text("ALTER TABLE habits ADD COLUMN IF NOT EXISTS goal_effective_from DATE"))
        conn.commit()
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for stmt in (
            "ALTER TYPE habittype ADD VALUE 'times_per_week'",
            "ALTER TYPE scheduletype ADD VALUE 'weekly_target'",
        ):
            try:
                conn.execute(text(stmt))
            except Exception as e:
                if "already exists" not in str(e).lower():
                    raise
                logging.getLogger(__name__).debug("Enum value already exists: %s", e)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def _error_response(detail: str, code: str = "error", status_code: int = 500):
    return JSONResponse(
        content={"detail": detail, "code": code},
        status_code=status_code,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: DB + tables; optional scheduler, deploy notify, bot."""
    logger.info("Starting FamilyQuest API...")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection OK")
    except Exception as e:
        logger.error("Database connection failed: %s", e)
        raise
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.error("Create tables failed: %s", e)
        raise
    try:
        _run_habit_migration()
        logger.info("Habit migration applied (description, goal_effective_from, enum values)")
    except Exception as e:
        logger.error("Habit migration failed: %s", e)
        raise

    try:
        from .tasks.cron_jobs import setup_scheduler
        setup_scheduler()
    except Exception as e:
        logger.warning("Scheduler not started: %s", e)

    try:
        from .telegram.bot import notify_deploy_complete
        await notify_deploy_complete()
    except Exception as e:
        logger.warning("Deploy notification skipped: %s", e)

    try:
        from .telegram.bot import setup_menu_button
        await setup_menu_button()
    except Exception as e:
        logger.warning("Menu button setup skipped: %s", e)

    yield
    logger.info("Shutting down FamilyQuest API...")


app = FastAPI(
    title="FamilyQuest API",
    description="Геймифицированный семейный трекер привычек",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        content={"detail": exc.detail, "code": "http_error"},
        status_code=exc.status_code,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Single format for all errors: {"detail": "...", "code": "internal_error"}."""
    logger.exception("Unhandled exception: %s", exc)
    return _error_response(str(exc), code="internal_error", status_code=500)


app.include_router(users.router)
app.include_router(habits.router)
app.include_router(baby.router)
app.include_router(gamification.router)
app.include_router(export.router)


@app.get("/")
async def root():
    return {"message": "FamilyQuest API", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    """Health: process alive + DB reachable. No Telegram, no cron."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        logger.exception("Health check failed")
        return JSONResponse(
            content={"status": "unhealthy", "detail": str(e)},
            status_code=503,
        )
