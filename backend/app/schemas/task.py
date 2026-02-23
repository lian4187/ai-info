from pydantic import BaseModel
from datetime import datetime


class ScheduledTaskCreate(BaseModel):
    task_type: str
    cron_expression: str
    is_enabled: bool = True


class ScheduledTaskUpdate(BaseModel):
    cron_expression: str | None = None
    is_enabled: bool | None = None


class ScheduledTaskResponse(BaseModel):
    id: int
    task_type: str
    cron_expression: str
    is_enabled: bool
    last_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskLogResponse(BaseModel):
    id: int
    task_id: int
    status: str
    message: str | None = None
    started_at: datetime
    finished_at: datetime

    model_config = {"from_attributes": True}


class TaskRunResponse(BaseModel):
    success: bool
    message: str
