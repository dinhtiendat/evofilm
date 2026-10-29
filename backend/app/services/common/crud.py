"""Trợ lý CRUD dùng chung: giảm mã rập khuôn ở tầng routing."""

from __future__ import annotations

from typing import Any, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.common.validators import require_entity

ModelT = TypeVar("ModelT")


async def create_and_refresh(db: AsyncSession, obj: ModelT) -> ModelT:
    """Ghi vào đối tượng và refresh, trả về trạng thái mới nhất."""
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


def patch_model(obj: Any, data: dict[str, Any]) -> Any:
    """Cập nhật các trường từ điển lên phiên bản mô hình."""
    for field, value in data.items():
        setattr(obj, field, value)
    return obj


async def get_or_404(
    db: AsyncSession,
    model: type[ModelT],
    entity_id: Any,
    *,
    detail: str,
) -> ModelT:
    """Lấy thực thể, ném 404 nếu không tồn tại."""
    return await require_entity(db, model, entity_id, detail=detail)


async def flush_and_refresh(db: AsyncSession, obj: ModelT) -> ModelT:
    """Làm mới đối tượng đã cập nhật và trả về."""
    await db.flush()
    await db.refresh(obj)
    return obj


async def delete_if_exists(
    db: AsyncSession,
    model: type[Any],
    entity_id: Any,
) -> None:
    """Xóa nếu thực thể tồn tại; im lặng trả về nếu không có."""
    obj = await db.get(model, entity_id)
    if obj is None:
        return
    await db.delete(obj)
    await db.flush()
