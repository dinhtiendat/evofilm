"""dịch vụ khung phân cảnh của shot:query phân trang và CRUD của ShotFrameImage."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import apply_order, paginate
from app.models.studio import ShotDetail, ShotFrameImage
from app.schemas.common import ApiResponse, PaginatedData, paginated_response
from app.schemas.studio.shots import ShotFrameImageCreate, ShotFrameImageRead, ShotFrameImageUpdate
from app.services.common import (
    create_and_refresh,
    delete_if_exists,
    entity_not_found,
    flush_and_refresh,
    get_or_404,
    patch_model,
    require_entity,
)


async def list_paginated(
    db: AsyncSession,
    *,
    shot_detail_id: str | None,
    order: str | None,
    is_desc: bool,
    page: int,
    page_size: int,
    allow_fields: set[str],
) -> ApiResponse[PaginatedData[ShotFrameImageRead]]:
    """Truy vấn phân trang ảnh khung phân cảnh."""
    stmt = select(ShotFrameImage)
    if shot_detail_id is not None:
        stmt = stmt.where(ShotFrameImage.shot_detail_id == shot_detail_id)
    stmt = apply_order(
        stmt,
        model=ShotFrameImage,
        order=order,
        is_desc=is_desc,
        allow_fields=allow_fields,
        default="id",
    )
    items, total = await paginate(db, stmt=stmt, page=page, page_size=page_size)
    return paginated_response(
        [ShotFrameImageRead.model_validate(x) for x in items],
        page=page,
        page_size=page_size,
        total=total,
    )


async def create(
    db: AsyncSession,
    *,
    body: ShotFrameImageCreate,
) -> ShotFrameImage:
    """Tạo ảnh khung phân cảnh của phân cảnh."""
    await require_entity(db, ShotDetail, body.shot_detail_id, detail=entity_not_found("ShotDetail"), status_code=400)
    return await create_and_refresh(db, ShotFrameImage(**body.model_dump()))


async def update(
    db: AsyncSession,
    *,
    image_id: int,
    body: ShotFrameImageUpdate,
) -> ShotFrameImage:
    """Cập nhật ảnh khung phân cảnh của phân cảnh."""
    obj = await get_or_404(db, ShotFrameImage, image_id, detail=entity_not_found("ShotFrameImage"))
    patch_model(obj, body.model_dump(exclude_unset=True))
    return await flush_and_refresh(db, obj)


async def delete(
    db: AsyncSession,
    *,
    image_id: int,
) -> None:
    """Xóa ảnh khung phân cảnh của phân cảnh."""
    await delete_if_exists(db, ShotFrameImage, image_id)
