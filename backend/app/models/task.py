"""Bảng tác vụ dùng chung cho tác vụ tạo (ảnh/video/...).

Mục tiêu thiết kế:
- Thống nhất hỗ trợ nhiều phương thức giao hàng như “xuất streaming”, “tác vụ + truy vấn lặp”
- Tiến độ dùng số nguyên 0-100, frontend truy vấn lặp có thể hiển thị trực tiếp
- payload/result dùng JSON, thuận tiện cho mở rộng theo mô hình/nhà cung cấp khác nhau
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin


class GenerationTaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    streaming = "streaming"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class GenerationDeliveryMode(str, Enum):
    streaming = "streaming"  # Xuất phân đoạn trên kết nối dài (SSE/WebSocket/HTTP chunked)（SSE/WebSocket/HTTP chunked）
    async_polling = "async_polling"  # tác vụ + poll truy vấn trạng thái


class GenerationTask(Base, TimestampMixin):
    __tablename__ = "generation_tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="id: Mapped[str] = mapped_column(String(64), primary_key=True, comment=ID tác vụ) ID")

    mode: Mapped[GenerationDeliveryMode] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment = "交付方式：streaming / async_polling / ..."
    )
    task_kind: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="generic",
        index=True,
        comment = "业务任务类型：用于执行器路由，如 script_divide / video_generation / image_generation"
    )
    status: Mapped[GenerationTaskStatus] = mapped_column(
        String(32),
        nullable=False,
        default=GenerationTaskStatus.pending,
        index=True,
        comment = "任务状态"
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment = "进度 0-100"
    )

    payload: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment = "请求参数（JSON）"
    )
    result: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment = "结果（JSON，例如 url、metadata）"
    )
    error: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
        comment = "失败原因（为空表示无错误）"
    )
    cancel_requested: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment = "是否已请求取消"
    )
    cancel_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment = "请求取消时间"
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment = "任务开始执行时间"
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment = "任务结束时间（成功 / 失败 / 取消）"
    )
    cancel_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment = "取消原因"
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment = "实际取消完成时间"
    )
    executor_type: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
        comment = "执行器类型：如 celery"
    )
    executor_task_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        comment = "执行器侧任务 ID，如 celery task id"
    )

    __table_args__ = (
        # Truy vấn lặp tần suất cao: đọc theo khóa chính id phổ biến nhất; danh sách/dọn dẹp nền có thể lọc theo trạng thái và thời gian cập nhật
        Index("ix_generation_tasks_status_updated_at", "status", "updated_at"),
        Index("ix_generation_tasks_mode_updated_at", "mode", "updated_at"),
        Index("ix_generation_tasks_status_cancel_requested", "status", "cancel_requested"),
    )
