from __future__ import annotations

from sqlalchemy import Boolean, JSON, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin
from app.models.types import FileType, PromptCategory, TimelineClipType


class PromptTemplate(Base,TimestampMixin):
    """Bảng mẫu prompt.。

    Đảm bảo ở tầng ứng dụng:：
    - cùng một category tối đa một is_default=True, được tầng API duy trì khi ghi/cập nhật.
    - Bản ghi is_system=True do script khởi tạo ghi vào, tầng interface từ chối xóa và sửa.
    """

    __tablename__ = "prompt_templates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="id: Mapped[str] = mapped_column(String(64), primary_key=True, comment=ID mẫu (UUID)) ID（UUID）")
    category: Mapped[PromptCategory] = mapped_column(String(32), nullable=False, index=True, comment="category: Mapped[PromptCategory] = mapped_column(String(32), nullable=False, index=True, comment=Hạng mục mẫu)")
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="name: Mapped[str] = mapped_column(String(255), nullable=False, comment=Tên mẫu)")
    preview: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="preview: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Văn bản xem trước)")
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="content: Mapped[str] = mapped_column(Text, nullable=False, comment=Nội dung mẫu)")
    variables: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment="Danh sách tên biến (mảng JSON)")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="Có là prompt mặc định không (duy nhất trong cùng hạng mục, đảm bảo ở tầng ứng dụng)")
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="Có là hệ thống cài sẵn không (chỉ script khởi tạo ghi vào, tầng API cấm xóa sửa)")

    __table_args__ = (
        Index("ix_prompt_templates_name", "name"),
    )


class FileItem(Base, TimestampMixin):
    """Bảng tệp tư liệu.。"""

    __tablename__ = "files"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="id: Mapped[str] = mapped_column(String(64), primary_key=True, comment=ID tệp (UUID)) ID（UUID）")
    type: Mapped[FileType] = mapped_column(String(16), nullable=False, index=True, comment="type: Mapped[FileType] = mapped_column(String(16), nullable=False, index=True, comment=Loại tệp)")
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="Tên tệp/tiêu đề")
    thumbnail: Mapped[str] = mapped_column(String(1024), nullable=False, default="", comment="Ảnh thu nhỏ URL/Đường")
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment="Thẻ (mảng JSON)")
    storage_key: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
        comment="key trong bộ lưu trữ đối tượng (ví dụ files/xxx.png)",
    )

    usages: Mapped[list["FileUsage"]] = relationship(
        "FileUsage",
        back_populates="file",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_files_updated_at", "updated_at"),
    )


class TimelineClip(Base):
    """Trích đoạn trục thời gian.。

    Giải thích:：
    - `source_id` là tham chiếu logic (ví dụ ID tệp/âm thanh), không áp đặt khóa ngoại, thuận tiện kết nối các nguồn nguyên liệu khác nhau.
    - Trong bảng không có project_id/chapter_id, không trực tiếp thuộc về dự án/chương.

    Đảm bảo ở tầng ứng dụng:：
    - nếu nghiệp vụ cần trục thời gian theo chiều dự án/chương, phải ràng buộc sở hữu ở tầng ứng dụng qua source_id hoặc bảng liên kết.
    """

    __tablename__ = "timeline_clips"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="id: Mapped[str] = mapped_column(String(64), primary_key=True, comment=ID đoạn) ID")
    type: Mapped[TimelineClipType] = mapped_column(String(16), nullable=False, index=True, comment="type: Mapped[TimelineClipType] = mapped_column(String(16), nullable=False, index=True, comment=Loại clip)")
    source_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True, comment="ID nguyên liệu nguồn (tham chiếu logic)")
    label: Mapped[str] = mapped_column(String(255), nullable=False, comment="label: Mapped[str] = mapped_column(String(255), nullable=False, comment=Nhãn hiển thị)")
    start: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Thời gian bắt đầu (giây)")
    end: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Thời gian kết thúc (giây)")
    track: Mapped[int] = mapped_column(Integer, nullable=False, default=1, comment="track: Mapped[int] = mapped_column(Integer, nullable=False, default=1, comment=Số thứ tự đạo)")

    __table_args__ = (
        Index("ix_timeline_clips_track", "track"),
    )


__all__ = ["PromptTemplate", "FileItem", "TimelineClip"]

