from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any, Optional

from app.core.task_manager.types import DeliveryMode, TaskRecord, TaskStatus
from app.core.task_manager.stores import TaskStore


StreamingFn = Callable[[dict[str, Any]], AsyncIterator[Any]]
AsyncWorkerFn = Callable[[TaskRecord, TaskStore], Awaitable[None]]


class DeliveryStrategy(ABC):
    """Chiến lược bàn giao kết quả: tách “thực thi tạo” khỏi “lưu trữ tác vụ”.

Điểm mở rộng:
- Thêm phương thức giao hàng: implement một lớp con và đăng ký vào TaskManager.
"""

    mode: DeliveryMode

    def __init__(self, store: TaskStore) -> None:
        self.store = store

    @abstractmethod
    async def start(self, task: TaskRecord) -> Optional[AsyncIterator[Any]]:
        """Khởi động thực thi tác vụ.

Giá trị trả về:
- Chế độ streaming: trả về async iterator (tầng trên có thể dùng cho StreamingResponse/SSE/WebSocket)
- Chế độ truy vấn lặp: trả về None (chỉ trả task_id, phía trước truy vấn lặp để lấy trạng thái)
"""

    async def stream(self, task: TaskRecord) -> AsyncIterator[Any]:
        raise NotImplementedError(f"mode={self.mode} does not support stream()")


class StreamingDeliveryStrategy(DeliveryStrategy):
    mode = DeliveryMode.streaming

    def __init__(self, store: TaskStore, streaming_fn: StreamingFn) -> None:
        super().__init__(store)
        self._streaming_fn = streaming_fn

    async def start(self, task: TaskRecord) -> AsyncIterator[Any]:
        await self.store.set_status(task.id, TaskStatus.streaming)
        await self.store.set_progress(task.id, 0)

        async def _gen() -> AsyncIterator[Any]:
            try:
                async for chunk in self._streaming_fn(task.payload):
                    yield chunk
                await self.store.set_progress(task.id, 100)
                await self.store.set_status(task.id, TaskStatus.succeeded)
            except Exception as exc:  # noqa: BLE001
                await self.store.set_error(task.id, str(exc))
                await self.store.set_status(task.id, TaskStatus.failed)
                raise

        return _gen()

    async def stream(self, task: TaskRecord) -> AsyncIterator[Any]:
        return await self.start(task)


class AsyncPollingDeliveryStrategy(DeliveryStrategy):
    mode = DeliveryMode.async_polling

    def __init__(
        self,
        store: TaskStore,
        worker_fn: AsyncWorkerFn,
        *,
        background_runner: Callable[[Awaitable[None]], None] | None = None,
    ) -> None:
        super().__init__(store)
        self._worker_fn = worker_fn
        def _spawn(coro: Awaitable[None]) -> None:
            asyncio.create_task(coro)

        self._background_runner = background_runner or _spawn

    async def start(self, task: TaskRecord) -> None:
        await self.store.set_status(task.id, TaskStatus.running)
        await self.store.set_progress(task.id, 0)

        async def _run() -> None:
            try:
                await self._worker_fn(task, self.store)
            except Exception as exc:  # noqa: BLE001
                await self.store.set_error(task.id, str(exc))
                await self.store.set_status(task.id, TaskStatus.failed)

        self._background_runner(_run())
        return None

