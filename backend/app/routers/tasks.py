from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task import ScheduledTask, TaskLog
from app.schemas.task import (
    ScheduledTaskCreate,
    ScheduledTaskUpdate,
    ScheduledTaskResponse,
    TaskLogResponse,
    TaskRunResponse,
)
from app.services.scheduler_service import reschedule_task, run_task_now

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.get("/", response_model=list[ScheduledTaskResponse])
async def list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduledTask).order_by(ScheduledTask.id))
    return result.scalars().all()


@router.post("/", response_model=ScheduledTaskResponse)
async def create_task(data: ScheduledTaskCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(ScheduledTask).where(ScheduledTask.task_type == data.task_type)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"Task type '{data.task_type}' already exists")

    task = ScheduledTask(**data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)

    if task.is_enabled:
        await reschedule_task(task.task_type, task.cron_expression, True)

    return task


@router.put("/{task_id}", response_model=ScheduledTaskResponse)
async def update_task(
    task_id: int, data: ScheduledTaskUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ScheduledTask).where(ScheduledTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    await db.commit()
    await db.refresh(task)

    await reschedule_task(task.task_type, task.cron_expression, task.is_enabled)

    return task


@router.post("/{task_id}/run", response_model=TaskRunResponse)
async def trigger_task(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScheduledTask).where(ScheduledTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    try:
        message = await run_task_now(task.task_type)
        return TaskRunResponse(success=True, message=message)
    except Exception as e:
        return TaskRunResponse(success=False, message=str(e))


@router.get("/{task_id}/logs", response_model=list[TaskLogResponse])
async def get_task_logs(
    task_id: int, limit: int = 20, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TaskLog)
        .where(TaskLog.task_id == task_id)
        .order_by(desc(TaskLog.finished_at))
        .limit(limit)
    )
    return result.scalars().all()
