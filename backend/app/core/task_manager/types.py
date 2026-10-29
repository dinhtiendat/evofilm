from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, AsyncIterator, Optional, Protocol, runtime_checkable


class TaskStatus(str, Enum):
    """Liệt kê (enum) trạng thái tác vụ.。"""

    pending = "pending"
    running = "running"
    streaming = "streaming"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class DeliveryMode(str, Enum):
    """Cách thức chuyển giao kết quả.。

Cách mở rộng:：
- Khi thêm một chế độ mới: thêm một giá trị enum + thực hiện DeliveryStrategy tương ứng
"""

    streaming = "streaming"
    async_polling = "async_polling"


@runtime_checkable
class BaseTask(Protocol):
    """Lớp cơ sở trừu tượng tác vụ.。

    Yêu cầu:：
    - bắt buộc phải implement 4 phương thức run, status, is_done, get_result
    - run: thực thi logic tác vụ thực tế (gọi mô hình / dịch vụ bên ngoài, v.v.), tham số truyền bởi TaskManager.create
    - status: trả về trạng thái hiện tại của tác vụ (dùng cho API truy vấn tùy chỉnh)
    - is_done：- is_done: xác định tác vụ đã hoàn thành chưa
    - get_result：- get_result: Lấy kết quả tác vụ

    run Hai cách thực hiện run:：
    - Chế độ stream: run trả về AsyncIterator[Any], bên gọi tiêu thụ trực tiếp iterator đó
    - chế độ lấy không đồng bộ:run trả về None, kết quả cuối cùng lấy qua get_result()
    """

    async def run(self, *args: Any, **kwargs: Any) -> AsyncIterator[Any] | None: ...

    async def status(self) -> dict[str, Any]: ...

    async def is_done(self) -> bool: ...

    async def get_result(self) -> Any: ...


@dataclass(slots=True)
class TaskRecord:
    """Biểu diễn thống nhất tác vụ ở tầng ứng dụng (phân tách khỏi thực thi lưu trữ)."""

    id: str
    mode: DeliveryMode
    task_kind: str
    status: TaskStatus
    progress: int  # 0-100
    payload: dict[str, Any]
    result: Optional[dict[str, Any]] = None
    error: str = ""
    cancel_requested: bool = False
    cancel_requested_at_ts: Optional[float] = None
    cancel_reason: str = ""
    cancelled_at_ts: Optional[float] = None
    started_at_ts: Optional[float] = None
    finished_at_ts: Optional[float] = None
    elapsed_ms: Optional[int] = None

    created_at_ts: Optional[float] = None
    updated_at_ts: Optional[float] = None
    executor_type: Optional[str] = None
    executor_task_id: Optional[str] = None


@dataclass(slots=True)
class TaskStatusView:
    """View nhẹ cho giao diện truy vấn lặp (thuận hiệu năng)."""

    id: str
    status: TaskStatus
    progress: int  # 0-100
    result: Optional[dict[str, Any]] = None
    error: str = ""
    cancel_requested: bool = False
    cancel_requested_at_ts: Optional[float] = None
    started_at_ts: Optional[float] = None
    finished_at_ts: Optional[float] = None
    elapsed_ms: Optional[int] = None
    updated_at_ts: Optional[float] = None


@dataclass(slots=True)
class TaskListItemView:
    """Góc nhìn danh sách trung tâm tác vụ.。"""

    id: str
    task_kind: str
    status: TaskStatus
    progress: int
    cancel_requested: bool = False
    cancel_requested_at_ts: Optional[float] = None
    started_at_ts: Optional[float] = None
    finished_at_ts: Optional[float] = None
    elapsed_ms: Optional[int] = None
    created_at_ts: Optional[float] = None
    updated_at_ts: Optional[float] = None
    executor_type: Optional[str] = None
    executor_task_id: Optional[str] = None
    relation_type: Optional[str] = None
    relation_entity_id: Optional[str] = None
    resource_type: Optional[str] = None
    navigate_relation_type: Optional[str] = None
    navigate_relation_entity_id: Optional[str] = None
