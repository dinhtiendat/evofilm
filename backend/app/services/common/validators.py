"""Công cụ kiểm tra dùng chung: kiểm tra tồn tại và trùng lặp của thực thể."""

from __future__ import annotations

from typing import Any, TypeVar

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


async def require_entity(
    db: AsyncSession,
    model: type[ModelT],
    entity_id: Any,
    *,
    detail: str,
    status_code: int = status.HTTP_404_NOT_FOUND,
) -> ModelT:
    """Đảm bảo thực thể tồn tại, và trả về đối tượng thực thể."""
    obj = await db.get(model, entity_id)
    if obj is None:
        raise HTTPException(status_code=status_code, detail=detail)
    return obj


async def require_optional_entity(
    db: AsyncSession,
    model: type[ModelT],
    entity_id: Any | None,
    *,
    detail: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> ModelT | None:
    """Nếu truyền ID thực thể, thì kiểm chứng sự tồn tại của nó."""
    if entity_id is None:
        return None
    return await require_entity(
        db,
        model,
        entity_id,
        detail=detail,
        status_code=status_code,
    )


async def ensure_not_exists(
    db: AsyncSession,
    model: type[Any],
    entity_id: Any,
    *,
    detail: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> None:
    """Đảm bảo thực thể ứng với khóa chính cho trước không tồn tại."""
    obj = await db.get(model, entity_id)
    if obj is not None:
        raise HTTPException(status_code=status_code, detail=detail)
