"""Hàm hỗ trợ chung cho tác vụ async worker."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.task_manager import SqlAlchemyTaskStore


async def cancel_if_requested_async(
    *,
    store: SqlAlchemyTaskStore,
    task_id: str,
    session: AsyncSession,
) -> bool:
    """Thực hiện kiểm tra hủy phối hợp tại ranh giới giai đoạn của service async."""

    if not await store.is_cancel_requested(task_id):
        return False
    await store.mark_cancelled(task_id)
    await session.commit()
    return True
