"""bảng liên kết giữa domain Studio và tác vụ sinh (GenerationTask)(phương án B:phân bảng, khóa ngoại mạnh)。

Mục tiêu thiết kế:
- Không làm bẩn `GenerationTask` (giữ module task độc lập)
- Mối quan hệ liên kết (Project/Chapter/Shot -> GenerationTask) do miền studio bảo trì
- Ràng buộc mạnh ở tầng database: khóa ngoại đảm bảo tham chiếu tồn tại; xóa đối tượng nghiệp vụ hoặc tác vụ thì tự động dọn liên kết theo cascade
"""

from __future__ import annotations

from enum import Enum

from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin


class GenerationTaskLinkStatus(str, Enum):
    """Trạng thái liên kết tác vụ tạo.。"""

    accepted = "accepted"  # đã áp dụng
    todo = "todo"  # Chờ thao tác
    rejected = "rejected"  # chưa áp dụng


class GenerationTaskLink(Base, TimestampMixin):
    """Bảng liên kết tác vụ tạo dùng chung.。

    Biểu diễn mối liên kết với tài nguyên nghiệp vụ cấp trên qua resource_type + relation_type + relation_entity_id:
    - resource_type: kiểu tài nguyên sinh, ví dụ image / video / text
    - relation_type: loại nghiệp vụ, ví dụ prop / costume / scene / shot_first_frame_prompt, v.v.
    - relation_entity_id: ID thực thể nghiệp vụ cụ thể, như khóa chính của một prop/costume/scene/shot nào đó
    """

    __tablename__ = "generation_task_links"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment = "关联行 ID"
    )
    task_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("generation_tasks.id", ondelete="CASCADE"),
        nullable=False,
        comment = "生成任务 ID"
    )
    resource_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="",
        comment = "生成资源类型（如 image/video/text）"
    )
    relation_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="",
        comment = "业务类型（如 prop/costume/scene 等）"
    )
    relation_entity_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="",
        comment = "关联业务实体 ID（如具体的 prop/costume/scene/shot 等对象 ID）"
    )
    file_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="SET NULL"),
        nullable=True,
        comment = "关联产物文件 ID（files.id；适用于图片/音频/视频）"
    )
    status: Mapped[GenerationTaskLinkStatus] = mapped_column(
        String(32),
        nullable=False,
        default=GenerationTaskLinkStatus.todo,
        comment = "关联状态：accepted=已采用、todo=待操作、rejected=未采用"
    )

    __table_args__ = (
        UniqueConstraint(
            "task_id",
            "resource_type",
            "relation_type",
            "relation_entity_id",
            name="uq_task_resource_relation_entity",
        ),
        Index(
            "ix_task_link_task_id_resource",
            "task_id",
            "resource_type",
        ),
        Index(
            "ix_task_link_relation_entity",
            "relation_type",
            "relation_entity_id",
        ),
        Index("ix_task_link_file_id", "file_id"),
        Index(
            "ix_task_link_status_updated_at",
            "status",
            "updated_at",
        ),
    )

