from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel, Field

from app.api.utils import apply_order, paginate
from app.core.task_manager import SqlAlchemyTaskStore
from app.core.task_manager.types import TaskStatus
from app.dependencies import get_db
from app.models.task_links import GenerationTaskLink
from app.schemas.common import ApiResponse, PaginatedData, created_response, empty_response, paginated_response, success_response
from app.services.common import entity_not_found
from app.tasks.execute_task import revoke_task_execution

from .common import (
    TaskCancelRead,
    TaskCancelRequest,
    TaskLinkAdoptRead,
    TaskLinkAdoptRequest,
    TaskListItemRead,
    TaskResultRead,
    TaskStatusRead,
    ensure_single_bind_target,
)

router = APIRouter()
TASK_LINK_ORDER_FIELDS = {"updated_at", "created_at", "id", "status"}


class GenerationTaskLinkBase(BaseModel):
    """Thông tin cơ sở dùng chung cho liên kết tác vụ tạo.。"""

    task_id: str = Field(..., description="task_id: str = Field(..., description=tác vụ tạo ID) ID")
    resource_type: str = Field(..., description="Loại tài nguyên tạo (như image/video/text/task_link)")
    relation_type: str = Field(..., description="loại nghiệp vụ (như prop/costume/scene v.v.)")
    relation_entity_id: str = Field(..., description="relation_entity_id: str = Field(..., description=thực thể liên kết ID) ID")
    file_id: str | None = Field(None, description="ID tệp sản phẩm liên kết (files.id; áp dụng cho ảnh/âm thanh/video)")
    status: str = Field(..., description="Trạng thái liên kết: accepted=đã dùng, todo=đang chờ thao tác, rejected=chưa dùng")


class GenerationTaskLinkCreate(BaseModel):
    """Thân yêu cầu tạo liên kết tác vụ.。"""

    task_id: str = Field(..., description="task_id: str = Field(..., description=tác vụ tạo ID) ID")
    resource_type: str = Field(..., description="Loại tài nguyên tạo (như image/video/text/task_link)")
    relation_type: str = Field(..., description="loại nghiệp vụ (như prop/costume/scene v.v.)")
    relation_entity_id: str = Field(..., description="relation_entity_id: str = Field(..., description=thực thể liên kết ID) ID")
    file_id: str | None = Field(None, description="ID tệp sản phẩm liên kết (files.id; áp dụng cho ảnh/âm thanh/video)")
    status: str = Field("todo", description="Trạng thái liên kết: accepted=đã áp dụng, todo=chưa thao tác, rejected=không áp dụng; mặc định todo")


class GenerationTaskLinkUpdate(BaseModel):
    """thân yêu cầu cập nhật liên kết tác vụ sinh (không chứa is_adopted, trạng thái áp dụng thay đổi một chiều bằng API riêng)."""

    resource_type: str | None = Field(None, description="Loại tài nguyên tạo dựng (ví dụ image/video/text/task_link)")
    relation_type: str | None = Field(None, description="Loại nghiệp vụ (như prop/costume/scene...)")
    relation_entity_id: str | None = Field(None, description="relation_entity_id: str | None = Field(None, description=ID thực thể nghiệp vụ liên kết) ID")
    file_id: str | None = Field(None, description="ID tệp sản phẩm liên kết (files.id; áp dụng cho ảnh/âm thanh/video)")
    status: str | None = Field(None, description="Trạng thái liên kết: accepted=đã áp dụng, todo=chưa thao tác, rejected=không áp dụng")


class GenerationTaskLinkRead(GenerationTaskLinkBase):
    """Thân trả về liên kết tác vụ tạo.。"""

    id: int = Field(..., description="id: int = Field(..., description=ID hàng liên kết) ID")

    model_config = {"from_attributes": True}


@router.get(
    "/tasks",
    response_model=ApiResponse[PaginatedData[TaskListItemRead]],
    summary="Danh sách tác vụ toàn cục (trung tâm tác vụ)",
)
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    statuses: list[TaskStatus] | None = Query(None, description="Lọc theo trạng thái tác vụ, được chọn nhiều"),
    task_kind: str | None = Query(None, description="lọc theo task_kind"),
    relation_type: str | None = Query(None, description="theo relation_type lọc"),
    relation_entity_id: str | None = Query(None, description="theo relation_entity_id lọc"),
    recent_seconds: int = Query(300, ge=0, le=86400, description="Cửa sổ thời gian (giây) mặc định trả về các tác vụ vừa kết thúc gần nhất"),
    page: int = Query(1, ge=1, description="page: int = Query(1, ge=1, description=Số trang),"),
    page_size: int = Query(20, ge=1, le=100, description="page_size: int = Query(20, ge=1, le=100, description=số dòng mỗi trang),"),
) -> ApiResponse[PaginatedData[TaskListItemRead]]:
    store = SqlAlchemyTaskStore(db)
    items, total = await store.list_task_views(
        statuses=statuses,
        task_kind=task_kind,
        relation_type=relation_type,
        relation_entity_id=relation_entity_id,
        recent_seconds=recent_seconds,
        page=page,
        page_size=page_size,
    )
    return paginated_response(
        [
            TaskListItemRead(
                task_id=item.id,
                task_kind=item.task_kind,
                status=item.status,
                progress=item.progress,
                cancel_requested=item.cancel_requested,
                cancel_requested_at_ts=item.cancel_requested_at_ts,
                started_at_ts=item.started_at_ts,
                finished_at_ts=item.finished_at_ts,
                elapsed_ms=item.elapsed_ms,
                created_at_ts=item.created_at_ts,
                updated_at_ts=item.updated_at_ts,
                executor_type=item.executor_type,
                executor_task_id=item.executor_task_id,
                relation_type=item.relation_type,
                relation_entity_id=item.relation_entity_id,
                resource_type=item.resource_type,
                navigate_relation_type=item.navigate_relation_type,
                navigate_relation_entity_id=item.navigate_relation_entity_id,
            )
            for item in items
        ],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/tasks/{task_id}/status",
    response_model=ApiResponse[TaskStatusRead],
    summary="Truy vấn trạng thái/tiến độ tác vụ (truy vấn lặp)",
)
async def get_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskStatusRead]:
    store = SqlAlchemyTaskStore(db)
    view = await store.get_status_view(task_id)
    if view is None:
        raise HTTPException(status_code=404, detail=entity_not_found("Task"))
    return success_response(
        TaskStatusRead(
            task_id=view.id,
            status=view.status,
            progress=view.progress,
            cancel_requested=view.cancel_requested,
            cancel_requested_at_ts=view.cancel_requested_at_ts,
            started_at_ts=view.started_at_ts,
            finished_at_ts=view.finished_at_ts,
            elapsed_ms=view.elapsed_ms,
        )
    )


@router.get(
    "/tasks/{task_id}/result",
    response_model=ApiResponse[TaskResultRead],
    summary="summary=Lấy kết quả tác vụ,",
)
async def get_task_result(
    task_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskResultRead]:
    store = SqlAlchemyTaskStore(db)
    rec = await store.get(task_id)
    if rec is None:
        raise HTTPException(status_code=404, detail=entity_not_found("Task"))
    return success_response(
        TaskResultRead(
            task_id=rec.id,
            status=rec.status,
            progress=rec.progress,
            result=rec.result,
            error=rec.error,
            cancel_requested=rec.cancel_requested,
            cancel_requested_at_ts=rec.cancel_requested_at_ts,
            started_at_ts=rec.started_at_ts,
            finished_at_ts=rec.finished_at_ts,
            elapsed_ms=rec.elapsed_ms,
        )
    )


@router.post(
    "/tasks/{task_id}/cancel",
    response_model=ApiResponse[TaskCancelRead],
    summary="summary=Yêu cầu hủy tác vụ,",
)
async def cancel_task(
    task_id: str,
    body: TaskCancelRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskCancelRead]:
    store = SqlAlchemyTaskStore(db)
    rec = await store.request_cancel(task_id, body.reason)
    if rec is None:
        raise HTTPException(status_code=404, detail=entity_not_found("Task"))
    effective_immediately = rec.status == TaskStatus.cancelled
    if not effective_immediately and revoke_task_execution(task_id):
        rec = await store.mark_cancelled(task_id)
        if rec is None:
            raise HTTPException(status_code=404, detail=entity_not_found("Task"))
        effective_immediately = True
    return success_response(
        TaskCancelRead(
            task_id=rec.id,
            status=rec.status,
            cancel_requested=rec.cancel_requested,
            cancel_requested_at_ts=rec.cancel_requested_at_ts,
            effective_immediately=effective_immediately,
        )
    )


@router.patch(
    "/task-links/adopt",
    response_model=ApiResponse[TaskLinkAdoptRead],
    summary="Cập nhật trạng thái áp dụng liên quan tác vụ (chỉ cho phép chuyển theo chiều tiến)",
    description="đặt trạng thái liên kết tác vụ được chỉ định thành accepted；đã áp dụng thì không đổi lại chưa áp dụng.",
)
async def adopt_task_link(
    body: TaskLinkAdoptRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TaskLinkAdoptRead]:
    target_type, entity_id = ensure_single_bind_target(body)

    # Bảng liên kết đã thống nhất thành GenerationTaskLink, không còn phân biệt project/chapter/shot, truy ngược trực tiếp bằng relation_entity_id
    stmt = select(GenerationTaskLink).where(
        GenerationTaskLink.task_id == body.task_id,
        GenerationTaskLink.relation_entity_id == entity_id,
    ).limit(1)
    result = await db.execute(stmt)
    link = result.scalars().first()

    if link is None:
        raise HTTPException(status_code=404, detail=entity_not_found("Task link"))

    if str(link.status) == "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái chỉ cho phép chuyển theo chiều tiến, đã áp dụng không thể đổi sang chưa áp dụng",
        )

    from app.models.task_links import GenerationTaskLinkStatus

    link.status = GenerationTaskLinkStatus.accepted
    await db.flush()

    return success_response(
        TaskLinkAdoptRead(
            task_id=body.task_id,
            link_type=target_type,
            entity_id=entity_id,
            is_adopted=True,
        )
    )


@router.get(
    "/task-links",
    response_model=ApiResponse[PaginatedData[GenerationTaskLinkRead]],
    summary="Danh sách liên kết tác vụ tạo (phân trang, hỗ trợ lọc đa điều kiện)",
)
async def list_task_links(
    db: AsyncSession = Depends(get_db),
    resource_type: str | None = Query(None, description="Lọc theo resource_type"),
    relation_type: str | None = Query(None, description="theo relation_type lọc"),
    relation_entity_id: str | None = Query(None, description="theo relation_entity_id lọc"),
    status: str | None = Query(None, description="status: str | None = Query(None, description=Lọc theo trạng thái liên kết (accepted/todo/rejected)),（accepted/todo/rejected）"),
    task_id: str | None = Query(None, description="lọc theo task_id"),
    order: str | None = Query(None, description="order: str | None = Query(None, description=Trường sắp xếp: updated_at/created_at/id/status),：updated_at/created_at/id/status"),
    is_desc: bool = Query(True, description="Có sắp giảm dần; mặc định true"),
    page: int = Query(1, ge=1, description="page: int = Query(1, ge=1, description=Số trang),"),
    page_size: int = Query(10, ge=1, le=100, description="page_size: int = Query(10, ge=1, le=100, description=số dòng mỗi trang),"),
) -> ApiResponse[PaginatedData[GenerationTaskLinkRead]]:
    stmt = select(GenerationTaskLink)
    if resource_type is not None:
        stmt = stmt.where(GenerationTaskLink.resource_type == resource_type)
    if relation_type is not None:
        stmt = stmt.where(GenerationTaskLink.relation_type == relation_type)
    if relation_entity_id is not None:
        stmt = stmt.where(GenerationTaskLink.relation_entity_id == relation_entity_id)
    if status is not None:
        stmt = stmt.where(GenerationTaskLink.status == status)
    if task_id is not None:
        stmt = stmt.where(GenerationTaskLink.task_id == task_id)
    stmt = apply_order(
        stmt,
        model=GenerationTaskLink,
        order=order,
        is_desc=is_desc,
        allow_fields=TASK_LINK_ORDER_FIELDS,
        default="updated_at",
    )
    items, total = await paginate(db, stmt=stmt, page=page, page_size=page_size)
    return paginated_response(
        [GenerationTaskLinkRead.model_validate(x) for x in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.post(
    "/task-links",
    response_model=ApiResponse[GenerationTaskLinkRead],
    status_code=status.HTTP_201_CREATED,
    summary="summary=Tạo liên kết tác vụ tạo,",
)
async def create_task_link(
    body: GenerationTaskLinkCreate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[GenerationTaskLinkRead]:
    link = GenerationTaskLink(
        task_id=body.task_id,
        resource_type=body.resource_type,
        relation_type=body.relation_type,
        relation_entity_id=body.relation_entity_id,
        file_id=body.file_id,
        status=body.status,
    )
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return created_response(GenerationTaskLinkRead.model_validate(link))


@router.get(
    "/task-links/{link_id}",
    response_model=ApiResponse[GenerationTaskLinkRead],
    summary="summary=Lấy chi tiết liên kết tác vụ tạo,",
)
async def get_task_link(
    link_id: int,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[GenerationTaskLinkRead]:
    link = await db.get(GenerationTaskLink, link_id)
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=entity_not_found("Task link"))
    return success_response(GenerationTaskLinkRead.model_validate(link))


@router.patch(
    "/task-links/{link_id}",
    response_model=ApiResponse[GenerationTaskLinkRead],
    summary="Cập nhật liên kết của tác vụ tạo (không hỗ trợ sửa trực tiếp is_adopted)"
)
async def update_task_link(
    link_id: int,
    body: GenerationTaskLinkUpdate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[GenerationTaskLinkRead]:
    link = await db.get(GenerationTaskLink, link_id)
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=entity_not_found("Task link"))
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(link, k, v)
    await db.flush()
    await db.refresh(link)
    return success_response(GenerationTaskLinkRead.model_validate(link))


@router.delete(
    "/task-links/{link_id}",
    response_model=ApiResponse[None],
    summary="summary=Xóa liên kết tác vụ tạo,",
)
async def delete_task_link(
    link_id: int,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[None]:
    link = await db.get(GenerationTaskLink, link_id)
    if link is None:
        return empty_response()
    await db.delete(link)
    await db.flush()
    return empty_response()
