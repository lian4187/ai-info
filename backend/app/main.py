import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import feeds, opml, articles
from app.routers import llm as llm_router
from app.routers import summaries as summaries_router
from app.routers import tasks as tasks_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.scheduler_service import start_scheduler, stop_scheduler
    await start_scheduler()
    yield
    await stop_scheduler()


app = FastAPI(title="AI Info Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers with relative prefix (feeds, opml, articles use /feeds, /opml, /articles)
app.include_router(feeds.router, prefix="/api/v1")
app.include_router(opml.router, prefix="/api/v1")
app.include_router(articles.router, prefix="/api/v1")

# Routers with full prefix baked in (/api/v1/...)
app.include_router(llm_router.router)
app.include_router(summaries_router.router)
app.include_router(tasks_router.router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
