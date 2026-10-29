from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any, Mapping, Optional

from app.core.task_manager.stores import TaskStore
from app.core.task_manager.strategies import DeliveryStrategy
from app.core.task_manager.types import BaseTask, DeliveryMode, TaskRecord, TaskStatusView


class TaskManager:
    """Trình quản lý tác vụ: cung cấp lối vào thống nhất cho tầng trên (routing/nghiệp vụ).

    init params:
    - store: TaskStore, kho lưu trữ tác vụ

    Tính năng:
    - store tháo lắp được: bộ nhớ hoặc MySQL (qua SQLAlchemy)
    - delivery strategy có thể tháo lắp: streaming / async_polling / ... (mở rộng sau chỉ cần thêm strategy và đăng ký)
    - Cung cấp truy vấn nhẹ cho truy vấn lặp tần suất cao: get_status()
    """

    def __init__(self, *, store: TaskStore, strategies: Mapping[DeliveryMode, DeliveryStrategy]) -> None:
        self.store = store
        self._strategies = dict(strategies)

    def _strategy_for(self, mode: DeliveryMode) -> DeliveryStrategy:
        strategy = self._strategies.get(mode)
        if strategy is None:
            raise ValueError(f"No delivery strategy registered for mode={mode!r}")
        return strategy

    async def create(
        self,
        *,
        task: BaseTask,
        mode: DeliveryMode,
        task_kind: str | None = None,
        run_args: dict[str, Any] | None = None,
    ) -> TaskRecord:
        """Tạo bản ghi tác vụ.

        Tham số:
        - task: Đối tượng Task thực sự cần thực thi, bắt buộc phải implement run/status/is_done/get_result
        - mode: cách bàn giao kết quả (stream / tác vụ + truy vấn lặp)
        - run_args: tham số truyền cho task.run (được serialize vào payload, thuận tiện worker dùng sau)
        """
        payload: dict[str, Any] = {
            "task_class": task.__class__.__name__,
            "task_kind": task_kind or task.__class__.__name__,
            "run_args": run_args or {},
        }
        return await self.store.create(
            payload=payload,
            mode=mode,
            task_kind=str(payload["task_kind"]),
        )

    async def start(self, *, task_id: str) -> Optional[AsyncIterator[Any]]:
        task = await self.store.get(task_id)
        if task is None:
            raise ValueError(f"Task not found: {task_id}")
        strategy = self._strategy_for(task.mode)
        return await strategy.start(task)

    async def get_status(self, *, task_id: str) -> TaskStatusView:
        view = await self.store.get_status_view(task_id)
        if view is None:
            raise ValueError(f"Task not found: {task_id}")
        return view

    async def request_cancel(self, *, task_id: str, reason: str | None = None) -> TaskRecord:
        rec = await self.store.request_cancel(task_id, reason)
        if rec is None:
            raise ValueError(f"Task not found: {task_id}")
        return rec

    async def is_cancel_requested(self, *, task_id: str) -> bool:
        return await self.store.is_cancel_requested(task_id)

    async def mark_cancelled(self, *, task_id: str) -> TaskRecord:
        rec = await self.store.mark_cancelled(task_id)
        if rec is None:
            raise ValueError(f"Task not found: {task_id}")
        return rec

    async def stream(self, *, task_id: str) -> AsyncIterator[Any]:
        task = await self.store.get(task_id)
        if task is None:
            raise ValueError(f"Task not found: {task_id}")
        strategy = self._strategy_for(task.mode)
        return await strategy.stream(task)
