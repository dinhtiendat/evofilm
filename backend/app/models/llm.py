"""Mô hình CSDL liên quan đến cấu hình LLM/nhà cung cấp/Agent/mô hình.

Quy ước chú thích:：
- Chỉ giải thích ràng buộc/lựa chọn thiết kế (ví dụ bảng singleton, trường nhạy cảm, chiến lược cascade), tránh lặp lại ý nghĩa tên trường.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin


class AgentTypeKey(str, Enum):
    """Loại Agent (dùng để điều phối quy trình / phân loại năng lực)."""

    plot = "plot"
    character = "character"
    scene = "scene"
    prop = "prop"
    other = "other"


class ProviderStatus(str, Enum):
    """Trạng thái kích hoạt nhà cung cấp.。"""

    active = "active"
    testing = "testing"
    disabled = "disabled"


class ModelCategoryKey(str, Enum):
    """Hạng mục mô hình: văn bản/ảnh/video."""

    text = "text"
    image = "image"
    video = "video"


class LogLevel(str, Enum):
    """Cấp nhật ký toàn cục.。"""

    debug = "debug"
    info = "info"
    warn = "warn"
    error = "error"


class Provider(Base, TimestampMixin):
    """Cấu hình nhà cung cấp mô hình.。

    Lời nhắc an toàn:：
    - `api_key` / `api_secret` là thông tin nhạy cảm; nếu sau này tích hợp kiểm toán/nhật ký, tránh in ra dưới dạng văn bản thuần.
    """

    __tablename__ = "providers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="id: Mapped[str] = mapped_column(String(64), primary_key=True, comment=ID nhà cung cấp) ID")
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True, comment="name: Mapped[str] = mapped_column(String(255), nullable=False, index=True, comment=Tên nhà cung cấp)")
    base_url: Mapped[str] = mapped_column(String(1024), nullable=False, comment="Base URL API văn bản / dùng chung")
    image_base_url: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
        default=None,
        comment="Base URL của API khả năng tạo ảnh (có thể ghi đè tùy chọn)",
    )
    video_base_url: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
        default=None,
        comment="Base URL của API khả năng tạo video (có thể ghi đè tùy chọn)",
    )
    api_key: Mapped[str] = mapped_column(String(4096), nullable=False, default="", comment="API Key（api_key: Mapped[str] = mapped_column(String(4096), nullable=False, default=, comment=API Key (nhạy cảm))）")
    api_secret: Mapped[str] = mapped_column(String(4096), nullable=False, default="", comment="API Secret（api_secret: Mapped[str] = mapped_column(String(4096), nullable=False, default=, comment=API Secret (nhạy cảm))）")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="description: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Mô tả)")
    status: Mapped[ProviderStatus] = mapped_column(
        String(32),
        nullable=False,
        default=ProviderStatus.testing,
        comment="comment=Trạng thái,",
    )
    created_by: Mapped[str] = mapped_column(String(64), nullable=False, default="", comment="created_by: Mapped[str] = mapped_column(String(64), nullable=False, default=, comment=Người tạo)")

    models: Mapped[list["Model"]] = relationship(
        back_populates="provider",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_providers_updated_at", "updated_at"),
        Index("ix_providers_status", "status"),
    )


class Model(Base, TimestampMixin):
    """Thảo luận cụ thể của mô hình (gắn với nhà cung cấp, hạng mục và tham số)."""

    __tablename__ = "models"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="id: Mapped[str] = mapped_column(String(64), primary_key=True, comment=ID mô hình) ID")
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True, comment="name: Mapped[str] = mapped_column(String(255), nullable=False, index=True, comment=Tên mô hình)")
    category: Mapped[ModelCategoryKey] = mapped_column(String(16), nullable=False, index=True, comment="category: Mapped[ModelCategoryKey] = mapped_column(String(16), nullable=False, index=True, comment=Hạng mục mô hình)")
    provider_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID nhà cung cấp sở thuộc, ID",
    )
    params: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict, comment="params: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict, comment=Tham số mô hình (JSON))（JSON）")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="description: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Mô tả)")
    created_by: Mapped[str] = mapped_column(String(64), nullable=False, default="", comment="created_by: Mapped[str] = mapped_column(String(64), nullable=False, default=, comment=Người tạo)")

    provider: Mapped["Provider"] = relationship(back_populates="models")

    __table_args__ = (
        Index("ix_models_updated_at", "updated_at"),
    )


class ModelSettings(Base):
    """Cài đặt toàn cục quản lý mô hình (bảng đơn thể).

    Giải thích:：
    - Thiết lập giá trị mặc định toàn cục bằng "một bảng một dòng"; tầng ứng dụng thường chỉ đọc/cập nhật id=1.
    - Khóa ngoại dùng `SET NULL`, tránh việc xóa mô hình làm bảng cấu hình không cập nhật được.
    """

    __tablename__ = "model_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID dòng thiết lập (thường là 1)")
    default_text_model_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("models.id", ondelete="SET NULL"),
        nullable=True,
        comment="comment=ID mô hình văn bản mặc định, ID",
    )
    default_image_model_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("models.id", ondelete="SET NULL"),
        nullable=True,
        comment="comment=ID mô hình ảnh mặc định, ID",
    )
    default_video_model_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("models.id", ondelete="SET NULL"),
        nullable=True,
        comment="comment=ID mô hình video mặc định, ID",
    )
    api_timeout: Mapped[int] = mapped_column(Integer, nullable=False, default=30, comment="Hết thời gian API (giây)")
    log_level: Mapped[LogLevel] = mapped_column(String(16), nullable=False, default=LogLevel.info, comment="log_level: Mapped[LogLevel] = mapped_column(String(16), nullable=False, default=LogLevel.info, comment=Cấp nhật ký)")

    default_text_model: Mapped["Model | None"] = relationship(foreign_keys=[default_text_model_id])
    default_image_model: Mapped["Model | None"] = relationship(foreign_keys=[default_image_model_id])
    default_video_model: Mapped["Model | None"] = relationship(foreign_keys=[default_video_model_id])

