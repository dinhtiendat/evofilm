"""Định tuyến liên quan mẫu prompt: CRUD.

Quy tắc nghiệp vụ:
- Cấm sửa và xóa bản ghi có is_system=True (403).
- Cấm xóa bản ghi có is_default=True (403).
- Tối đa một bản ghi is_default=True trong mỗi category: khi tạo/cập nhật, các bản ghi còn lại cùng category sẽ bị đặt False.
- id do phía sau tự sinh UUID；is_system không nhận giá trị từ client (cố định False).
"""

from __future__ import annotations

import uuid
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils import apply_keyword_filter, apply_order, paginate
from app.dependencies import get_db
from app.models.studio import PromptCategory, PromptTemplate
from app.schemas.common import ApiResponse, PaginatedData, created_response, empty_response, paginated_response, success_response
from app.schemas.studio.prompts import (
    PromptCategoryOptionRead,
    PromptTemplateCreate,
    PromptTemplateRead,
    PromptTemplateUpdate,
)
from app.services.common import entity_not_found

router = APIRouter()

_ORDER_FIELDS = {"name", "category", "created_at", "updated_at"}
_PROMPT_CATEGORY_ZH: dict[PromptCategory, tuple[str, str]] = {
    # Prompt dùng để gửi cho mô hình hình ảnh
    PromptCategory.frame_head_image: ("Ảnh khung hình đầu", "Prompt dùng để tạo ảnh khung hình đầu"),
    PromptCategory.frame_tail_image: ("Ảnh khung hình cuối", "Prompt dùng để tạo ảnh khung hình cuối"),
    PromptCategory.frame_key_image: ("Ảnh khung hình chính", "Prompt dùng để tạo ảnh khung hình chính"),
    PromptCategory.character_image_front: ("Hình ảnh phía trước của nhân vật", "Prompt dùng để tạo hình ảnh phía trước của nhân vật"),
    PromptCategory.character_image_other: ("Hình ảnh mặt bên / mặt sau của nhân vật", "Prompt dùng để tạo hình ảnh mặt bên hoặc mặt sau của nhân vật"),
    PromptCategory.actor_image_front: ("Ảnh mặt trước diễn viên", "Prompt dùng để tạo ảnh mặt trước diễn viên"),
    PromptCategory.actor_image_other: ("Hình ảnh bên cạnh / phía sau của diễn viên", "Prompt dùng để tạo hình ảnh bên cạnh hoặc phía sau của diễn viên"),
    PromptCategory.prop_image_front: ("Ảnh mặt trước đạo cụ", "Prompt dùng để tạo ảnh mặt trước đạo cụ"),
    PromptCategory.prop_image_other: ("Hình ảnh bên cạnh / phía sau của đạo cụ", "Prompt dùng để tạo hình ảnh bên cạnh hoặc phía sau của đạo cụ"),
    PromptCategory.scene_image_front: ("Ảnh mặt trước bối cảnh", "Prompt dùng để tạo ảnh mặt trước bối cảnh"),
    PromptCategory.scene_image_other: ("Hình ảnh bên cạnh / phía sau của bối cảnh", "Prompt dùng để tạo hình ảnh bên cạnh hoặc phía sau của bối cảnh"),
    PromptCategory.costume_image_front: ("Ảnh mặt trước trang phục", "Prompt dùng để tạo ảnh mặt trước trang phục"),
    PromptCategory.costume_image_other: ("Hình ảnh bên cạnh / phía sau của trang phục", "Prompt dùng để tạo hình ảnh bên cạnh hoặc phía sau của trang phục"),
    # Prompt dùng để gửi cho mô hình văn bản
    PromptCategory.frame_head_prompt: ("Prompt ảnh khung hình đầu", "Prompt dùng để tạo nội dung cho ảnh khung hình đầu"),
    PromptCategory.frame_tail_prompt: ("Prompt ảnh khung hình cuối", "Prompt dùng để tạo nội dung cho ảnh khung hình cuối"),
    PromptCategory.frame_key_prompt: ("Prompt ảnh khung hình chính", "Prompt dùng để tạo nội dung cho ảnh khung hình chính"),
    PromptCategory.video_prompt: ("Prompt video", "Prompt tổng thể dùng để tạo video"),
    PromptCategory.storyboard_prompt: ("Prompt phân cảnh", "Prompt dùng để phân tách và mô tả phân cảnh"),
    # Hạng mục dự phòng/mở rộng (ngay cả khi tạm thời chưa dùng, vẫn cần ánh xạ đầy đủ để frontend hiển thị và kiểm tra)
    PromptCategory.combined: ("Prompt ghép", "Mẫu dùng để ghép nhiều đoạn prompt"),
    PromptCategory.bgm: ("Prompt nhạc nền", "Prompt dùng để tạo mô tả nhạc nền"),
    PromptCategory.sfx: ("prompt effect âm thanh", "prompt dùng để sinh mô tả effect âm thanh"),
}


async def _clear_category_default(
    db: AsyncSession,
    *,
    category: PromptCategory,
    exclude_id: str | None = None,
) -> None:
    """Đặt is_default của tất cả bản ghi cùng category thành False (loại trừ exclude_id)."""
    stmt = (
        update(PromptTemplate)
        .where(PromptTemplate.category == category, PromptTemplate.is_default.is_(True))
    )
    if exclude_id:
        stmt = stmt.where(PromptTemplate.id != exclude_id)
    await db.execute(stmt)


# ---------- Danh sách ----------

@router.get(
    "",
    response_model=ApiResponse[PaginatedData[PromptTemplateRead]],
    summary="Danh sách mẫu prompt (phân trang)",
)
async def list_prompt_templates(
    db: AsyncSession = Depends(get_db),
    category: PromptCategory | None = Query(None, description="Lọc theo hạng mục"),
    q: str | None = Query(None, description="từ khóa, lọc name"),
    is_default: bool | None = Query(None, description="lọc liệu là mặc định hay không"),
    is_system: bool | None = Query(None, description="lọc liệu là hệ thống có sẵn hay không"),
    order: str | None = Query(None),
    is_desc: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> ApiResponse[PaginatedData[PromptTemplateRead]]:
    stmt = select(PromptTemplate)
    if category is not None:
        stmt = stmt.where(PromptTemplate.category == category)
    if is_default is not None:
        stmt = stmt.where(PromptTemplate.is_default.is_(is_default))
    if is_system is not None:
        stmt = stmt.where(PromptTemplate.is_system.is_(is_system))
    stmt = apply_keyword_filter(stmt, q=q, fields=[PromptTemplate.name])
    stmt = apply_order(
        stmt,
        model=PromptTemplate,
        order=order,
        is_desc=is_desc,
        allow_fields=_ORDER_FIELDS,
        default="created_at",
    )
    items, total = await paginate(db, stmt=stmt, page=page, page_size=page_size)
    return paginated_response(
        [PromptTemplateRead.model_validate(x) for x in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/categories",
    response_model=ApiResponse[list[PromptCategoryOptionRead]],
    summary="Lấy enum hạng mục prompt (kèm ánh xạ tiếng Trung)",
)
async def list_prompt_categories() -> ApiResponse[list[PromptCategoryOptionRead]]:
    items: list[PromptCategoryOptionRead] = []
    for category in PromptCategory:
        label, description = _PROMPT_CATEGORY_ZH.get(category, (category.value, ""))
        items.append(PromptCategoryOptionRead(value=category, label=label, description=description))
    return success_response(items)


# ---------- Chi tiết ----------

@router.get(
    "/{template_id}",
    response_model=ApiResponse[PromptTemplateRead],
    summary="Lấy chi tiết mẫu prompt",
)
async def get_prompt_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PromptTemplateRead]:
    obj = await db.get(PromptTemplate, template_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=entity_not_found("PromptTemplate"))
    return success_response(PromptTemplateRead.model_validate(obj))


# ---------- Tạo mới ----------

@router.post(
    "",
    response_model=ApiResponse[PromptTemplateRead],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mẫu prompt",
)
async def create_prompt_template(
    body: PromptTemplateCreate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PromptTemplateRead]:
    # Nếu đặt làm mặc định, trước tiên xóa các mặc định khác cùng hạng mục
    if body.is_default:
        await _clear_category_default(db, category=body.category)

    obj = PromptTemplate(
        id=str(uuid.uuid4()),
        category=body.category,
        name=body.name,
        content=body.content,
        preview=body.preview,
        variables=body.variables,
        is_default=body.is_default,
        is_system=False,  # Client không được đặt
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return created_response(PromptTemplateRead.model_validate(obj))


# ---------- Cập nhật ----------

@router.patch(
    "/{template_id}",
    response_model=ApiResponse[PromptTemplateRead],
    summary="Cập nhật cục bộ mẫu prompt",
)
async def update_prompt_template(
    template_id: str,
    body: PromptTemplateUpdate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PromptTemplateRead]:
    obj = await db.get(PromptTemplate, template_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=entity_not_found("PromptTemplate"))
    if obj.is_system:
        raise HTTPException(status_code=403, detail="Prompt do hệ thống cài đặt sẵn không thể chỉnh sửa")

    # Nếu đặt bản ghi hiện tại làm mặc định, trước tiên xóa các mặc định khác cùng hạng mục
    if body.is_default is True:
        await _clear_category_default(db, category=cast(PromptCategory, cast(object, obj.category)), exclude_id=template_id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return success_response(PromptTemplateRead.model_validate(obj))


# ---------- Xóa ----------

@router.delete(
    "/{template_id}",
    response_model=ApiResponse[None],
    summary="Xóa mẫu prompt",
)
async def delete_prompt_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[None]:
    obj = await db.get(PromptTemplate, template_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=entity_not_found("PromptTemplate"))
    if obj.is_system:
        raise HTTPException(status_code=403, detail="Prompt do hệ thống cài đặt sẵn không thể xóa")
    if obj.is_default:
        raise HTTPException(status_code=403, detail="Prompt mặc định không thể xóa, vui lòng đặt prompt khác làm mặc định trước")
    await db.delete(obj)
    return empty_response()
