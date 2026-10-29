from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.task_manager import DeliveryMode, SqlAlchemyTaskStore, TaskManager
from app.dependencies import get_db
from app.models.task_links import GenerationTaskLink
from app.schemas.studio.shots import ShotVideoPromptPackRead
from app.services.film.generated_video import build_run_args, preview_prompt_and_images
from app.services.studio.shot_status import mark_shot_generating
from app.tasks.execute_task import enqueue_task_execution
from app.schemas.common import ApiResponse, created_response, success_response

from .common import TaskCreated, _CreateOnlyTask
from .video_request import VideoGenerationTaskRequest

router = APIRouter()


class VideoPromptPreviewResponse(BaseModel):
    prompt: str = Field(..., description="Prompt cuối cùng dùng để tạo video")
    images: list[str] = Field(default_factory=list, description="Danh sách file_id ảnh tham chiếu liên kết")
    pack: ShotVideoPromptPackRead | None = Field(None, description="Gói ngữ cảnh xem trước prompt video")



@router.post(
    "/tasks/video/preview-prompt",
    response_model=ApiResponse[VideoPromptPreviewResponse],
    status_code=200,
    summary="Xem trước prompt video",
)
async def preview_video_generation_prompt(
    body: VideoGenerationTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[VideoPromptPreviewResponse]:
    """Xem trước prompt tạo video và tự động liên kết ảnh tham chiếu."""
    prompt, images, pack = await preview_prompt_and_images(
        db,
        shot_id=body.shot_id,
        reference_mode=body.reference_mode,
        prompt=body.prompt,
        images=body.images,
    )
    return success_response(VideoPromptPreviewResponse(prompt=prompt, images=images, pack=pack))


@router.post(
    "/tasks/video",
    response_model=ApiResponse[TaskCreated],
    status_code=201,
    summary="Tạo video (phiên bản tác vụ)",
)
async def create_video_generation_task(
    body: VideoGenerationTaskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskCreated]:
    """Tạo tác vụ tạo video và thực thi ở nền, kết quả nhận qua /tasks/{task_id}/result."""

    store = SqlAlchemyTaskStore(db)
    tm = TaskManager(store=store, strategies={})
    run_args = await build_run_args(
        db,
        shot_id=body.shot_id,
        reference_mode=body.reference_mode,
        prompt=body.prompt,
        images=body.images,
        ratio=body.ratio,
    )

    task_record = await tm.create(
        task=_CreateOnlyTask(),
        mode=DeliveryMode.async_polling,
        task_kind="video_generation",
        run_args=run_args,
    )
    db.add(
        GenerationTaskLink(
            task_id=task_record.id,
            resource_type="video",
            relation_type="video",
            relation_entity_id=body.shot_id,
        )
    )
    await mark_shot_generating(db, shot_id=body.shot_id)

    # đảm bảo bản ghi tác vụ đã commit, tránh runner nền session mới không query được dòng tác vụ và không cập nhật trạng thái.
    await db.commit()

    enqueue_task_execution(task_record.id)
    return created_response(TaskCreated(task_id=task_record.id))
