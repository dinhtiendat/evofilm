"""Mô hình và tiện ích dùng chung cho route film: body yêu cầu, view tác vụ, công cụ liên kết."""

from __future__ import annotations

from typing import Tuple

from fastapi import HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.studio import Chapter, Project, Shot
from app.services.common import entity_not_found
from app.models.task_links import GenerationTaskLink
from app.core.task_manager.types import TaskStatus


class TextChunkInput(BaseModel):
    """Khối văn bản đơn lẻ.。"""

    chunk_id: str = Field(..., description="ID khối, ví dụ chapter1_p03")
    text: str = Field(..., description="text: str = Field(..., description=nội dung nguyên văn)")


class EntityExtractRequest(BaseModel):
    """Yêu cầu trích xuất thực thể.。"""

    source_id: str = Field(..., description="danh định tiểu thuyết/chương, như novel_ch01")
    language: str | None = Field(None, description="ngôn ngữ, như zh / en")
    chunks: list[TextChunkInput] = Field(..., description="chunks: list[TextChunkInput] = Field(..., description=Danh sách khối văn bản)")


class ShotlistExtractRequest(BaseModel):
    """Yêu cầu trích xuất phân cảnh.。"""

    source_id: str = Field(..., description="Định danh tiểu thuyết/chương")
    source_title: str | None = Field(None, description="tên sách/tên chương")
    language: str | None = Field(None, description="ngôn ngữ, như zh / en")
    chunks: list[TextChunkInput] = Field(..., description="chunks: list[TextChunkInput] = Field(..., description=Danh sách khối văn bản)")


class BindTarget(BaseModel):
    """Đối tượng gắn tác vụ: chọn một trong ba."""

    project_id: str | None = Field(None, description="ID dự án liên kết (tùy chọn)")
    chapter_id: str | None = Field(None, description="ID chương liên kết (tùy chọn)")
    shot_id: str | None = Field(None, description="ID phân cảnh liên kết (tùy chọn)")


class EntityExtractTaskRequest(EntityExtractRequest, BindTarget):
    """Yêu cầu tác vụ trích xuất thực thể: thêm đối tượng gắn kết trên cơ sở tham số trích xuất."""


class ShotlistExtractTaskRequest(ShotlistExtractRequest, BindTarget):
    """Yêu cầu tác vụ trích xuất phân cảnh: thêm đối tượng gắn kết trên cơ sở tham số trích xuất."""


class ShotFramePromptRequest(BaseModel):
    """Yêu cầu tác vụ tạo prompt khung hình phân cảnh.。"""

    shot_id: str = Field(..., description="shot_id: str = Field(..., description=ID phân cảnh) ID")
    frame_type: str = Field(..., description="first | last | key")


class TaskCreated(BaseModel):
    task_id: str = Field(..., description="task_id: str = Field(..., description=ID tác vụ) ID")


class AsyncTaskCreateRead(BaseModel):
    task_id: str = Field(..., description="task_id: str = Field(..., description=ID tác vụ) ID")
    status: TaskStatus = Field(..., description="status: TaskStatus = Field(..., description=Trạng thái tác vụ)")
    reused: bool = Field(False, description="reused: bool = Field(False, description=liệu đã tái sử dụng tác vụ đang hoạt động có sẵn của thực thể nghiệp vụ hiện tại hay chưa)")
    relation_type: str | None = Field(None, description="relation_type: str | None = Field(None, description=loại liên kết nghiệp vụ)")
    relation_entity_id: str | None = Field(None, description="relation_entity_id: str | None = Field(None, description=thực thể liên kết nghiệp vụ ID) ID")


class TaskStatusRead(BaseModel):
    task_id: str
    status: TaskStatus
    progress: int = Field(..., ge=0, le=100)
    cancel_requested: bool = Field(False, description="cancel_requested: bool = Field(False, description=Đã yêu cầu hủy chưa)")
    cancel_requested_at_ts: float | None = Field(None, description="cancel_requested_at_ts: float | None = Field(None, description=Định thời gian yêu cầu hủy)")
    started_at_ts: float | None = Field(None, description="started_at_ts: float | None = Field(None, description=Định thời gian bắt đầu thực thi tác vụ)")
    finished_at_ts: float | None = Field(None, description="finished_at_ts: float | None = Field(None, description=Định thời gian kết thúc tác vụ)")
    elapsed_ms: int | None = Field(None, description="Tổng thời gian thực thi tác vụ ( mili giây)")


class TaskListItemRead(BaseModel):
    task_id: str
    task_kind: str = Field(..., description="task_kind: str = Field(..., description=Loại tác vụ nghiệp vụ)")
    status: TaskStatus
    progress: int = Field(..., ge=0, le=100)
    cancel_requested: bool = Field(False, description="cancel_requested: bool = Field(False, description=Đã yêu cầu hủy chưa)")
    cancel_requested_at_ts: float | None = Field(None, description="cancel_requested_at_ts: float | None = Field(None, description=Định thời gian yêu cầu hủy)")
    started_at_ts: float | None = Field(None, description="started_at_ts: float | None = Field(None, description=Định thời gian bắt đầu thực thi tác vụ)")
    finished_at_ts: float | None = Field(None, description="finished_at_ts: float | None = Field(None, description=Định thời gian kết thúc tác vụ)")
    elapsed_ms: int | None = Field(None, description="Tổng thời gian thực thi tác vụ ( mili giây)")
    created_at_ts: float | None = Field(None, description="created_at_ts: float | None = Field(None, description=dấu thời gian tạo tác vụ)")
    updated_at_ts: float | None = Field(None, description="updated_at_ts: float | None = Field(None, description=dấu thời gian cập nhật tác vụ)")
    executor_type: str | None = Field(None, description="Loại executor, ví dụ celery")
    executor_task_id: str | None = Field(None, description="executor_task_id: str | None = Field(None, description=ID tác vụ phía executor) ID")
    relation_type: str | None = Field(None, description="relation_type: str | None = Field(None, description=loại liên kết nghiệp vụ)")
    relation_entity_id: str | None = Field(None, description="relation_entity_id: str | None = Field(None, description=thực thể liên kết nghiệp vụ ID) ID")
    resource_type: str | None = Field(None, description="resource_type: str | None = Field(None, description=Loại tài nguyên)")
    navigate_relation_type: str | None = Field(None, description="navigate_relation_type: str | None = Field(None, description=Loại liên kết chuyển hướng mặc định phía frontend)")
    navigate_relation_entity_id: str | None = Field(None, description="navigate_relation_entity_id: str | None = Field(None, description=ID thực thể liên kết để phía trước chuyển hướng mặc định) ID")


class TaskResultRead(BaseModel):
    task_id: str
    status: TaskStatus
    progress: int = Field(..., ge=0, le=100)
    result: dict | None = None
    error: str = ""
    cancel_requested: bool = Field(False, description="cancel_requested: bool = Field(False, description=Đã yêu cầu hủy chưa)")
    cancel_requested_at_ts: float | None = Field(None, description="cancel_requested_at_ts: float | None = Field(None, description=Định thời gian yêu cầu hủy)")
    started_at_ts: float | None = Field(None, description="started_at_ts: float | None = Field(None, description=Định thời gian bắt đầu thực thi tác vụ)")
    finished_at_ts: float | None = Field(None, description="finished_at_ts: float | None = Field(None, description=Định thời gian kết thúc tác vụ)")
    elapsed_ms: int | None = Field(None, description="Tổng thời gian thực thi tác vụ ( mili giây)")


class TaskCancelRequest(BaseModel):
    reason: str | None = Field(None, description="Lý do hủy (tùy chọn)")


class TaskCancelRead(BaseModel):
    task_id: str
    status: TaskStatus
    cancel_requested: bool = Field(..., description="cancel_requested: bool = Field(..., description=liệu yêu cầu hủy đã được đăng ký hay chưa)")
    cancel_requested_at_ts: float | None = Field(None, description="cancel_requested_at_ts: float | None = Field(None, description=Định thời gian yêu cầu hủy)")
    effective_immediately: bool = Field(False, description="effective_immediately: bool = Field(False, description=Liệu đã hoàn tất hủy lập tức chưa)")


class TaskLinkAdoptRequest(BindTarget):
    """Yêu cầu cập nhật trạng thái áp dụng: task_id + đối tượng liên kết chọn một trong ba (project_id/chapter_id/shot_id)."""

    task_id: str = Field(..., description="task_id: str = Field(..., description=ID tác vụ) ID")


class TaskLinkAdoptRead(BaseModel):
    """Kết quả cập nhật trạng thái chấp nhận.。"""

    task_id: str
    link_type: str = Field(..., description="project | chapter | shot")
    entity_id: str = Field(..., description="ID dự án/chương/phân cảnh")
    is_adopted: bool = Field(..., description="liệu đã áp dụng hay không (chỉ được đổi thuận chiều sang true)")


class _CreateOnlyTask:
    """Chỉ dùng cho TaskManager.create: cung cấp __class__.__name__, tránh truyền vào lambda."""

    async def run(self, *args: object, **kwargs: object):  # noqa: ANN001, ANN003
        return None

    async def status(self) -> dict[str, object]:
        return {}

    async def is_done(self) -> bool:
        return False

    async def get_result(self) -> object:
        return None


def ensure_single_bind_target(body: BindTarget) -> Tuple[str, str]:
    """Xác thực và trả về (target_type, target_id). (target_type, target_id)。"""
    targets = [
        ("project", body.project_id),
        ("chapter", body.chapter_id),
        ("shot", body.shot_id),
    ]
    provided = [(t, v) for (t, v) in targets if v]
    if len(provided) != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide exactly one of project_id/chapter_id/shot_id",
        )
    return provided[0][0], provided[0][1]  # type: ignore[return-value]


async def bind_task(
    db: AsyncSession,
    *,
    task_id: str,
    target_type: str,
    target_id: str,
    relation_type: str,
) -> None:
    """Thiết lập liên kết giữa miền studio và GenerationTask."

    Hiện tại target_type vẫn là ba-một-lựa-một project/chapter/shot, ở đây giữ nguyên logic xác thực,
    nhưng không còn lưu project_id/chapter_id/shot_id trong bảng liên kết nữa, mà thông qua:
    - resource_type: cố định là "task_link" (cấp trên mở rộng theo nhu cầu)
    - relation_type: sử dụng loại nghiệp vụ do bên gọi truyền vào (như entities/shotlist/shot_first_frame_prompt...)
    - relation_entity_id: dùng ID thực thể nghiệp vụ cụ thể (hiện là project_id/chapter_id/shot_id)
    """
    if target_type == "project":
        if await db.get(Project, target_id) is None:
            raise HTTPException(status_code=404, detail=entity_not_found("Project"))
        db.add(
            GenerationTaskLink(
                task_id=task_id,
                resource_type="task_link",
                relation_type=relation_type,
                relation_entity_id=target_id,
            )
        )
        return
    if target_type == "chapter":
        if await db.get(Chapter, target_id) is None:
            raise HTTPException(status_code=404, detail=entity_not_found("Chapter"))
        db.add(
            GenerationTaskLink(
                task_id=task_id,
                resource_type="task_link",
                relation_type=relation_type,
                relation_entity_id=target_id,
            )
        )
        return
    if target_type == "shot":
        if await db.get(Shot, target_id) is None:
            raise HTTPException(status_code=404, detail=entity_not_found("Shot"))
        db.add(
            GenerationTaskLink(
                task_id=task_id,
                resource_type="task_link",
                relation_type=relation_type,
                relation_entity_id=target_id,
            )
        )
        return
    raise HTTPException(status_code=400, detail="Invalid bind target type")
