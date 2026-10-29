from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin
from app.models.types import FileUsageKind

if TYPE_CHECKING:
    from app.models.studio_prompts_files_timeline import FileItem


class FileUsage(Base, TimestampMixin):
    """vị trí dùng tệp trong chuỗi nghiệp vụ dự án (nhiều-một tới files；cùng một tệp có thể nhiều dòng)."""

    __tablename__ = "file_usages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID dòng")
    file_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID tệp",
    )
    project_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID dự án",
    )
    chapter_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("chapters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID chương (để trống được)",
    )
    shot_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("shots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID phân cảnh (để trống được)",
    )
    usage_kind: Mapped[FileUsageKind] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="Kiểu mục đích",
    )
    source_ref: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        default="",
        comment="Khóa idempotent (ví dụ upsert cùng vị trí giữ; không có thì chuỗi rỗng)",
    )

    file: Mapped["FileItem"] = relationship(back_populates="usages")

    __table_args__ = (
        UniqueConstraint("file_id", "usage_kind", "source_ref", name="uq_file_usages_file_kind_ref"),
        Index("ix_file_usages_project_shot", "project_id", "shot_id"),
    )


__all__ = ["FileUsage"]
