import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import feeds, opml, articles
from app.routers import llm as llm_router
from app.routers import summaries as summaries_router
from app.routers import tasks as tasks_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    client = request.client.host if request.client else "-"
    logger.info(
        "[IN ] %s %s - client=%s",
        request.method,
        request.url.path,
        client,
    )
    start = time.perf_counter()

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "[OUT] %s %s - status=%d elapsed=%.0fms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


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
