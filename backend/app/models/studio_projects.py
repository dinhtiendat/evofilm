from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin
from app.models.types import ChapterStatus, ProjectStyle, ProjectVisualStyle

if TYPE_CHECKING:
    from app.models.studio_assets import Actor, Character, Costume, Prop, Scene
    from app.models.studio_shots import Shot


class Project(Base, TimestampMixin):
    """Bảng dự án.

    Giải thích:
    - `stats` lưu thống kê tổng hợp bằng JSON, thuận tiện cho kết xuất nhanh và mở rộng dần; nếu cần thống kê nhất quán chặt có thể chuyển sang vật hóa/từu trình sau.
    """

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="ID dự án")
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="Tên dự án")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="Giới thiệu dự án")
    style: Mapped[ProjectStyle] = mapped_column(String(32), nullable=False, comment="Thể loại/phong cách")
    visual_style: Mapped[ProjectVisualStyle] = mapped_column(
        String(16),
        nullable=False,
        default=ProjectVisualStyle.live_action,
        comment="Hình thức biểu diễn khung hình (live-action/anime...)",
    )
    seed: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Hạt ngẫu nhiên")
    unify_style: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="Có thống nhất phong cách (giữa các chương) không")
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Tỷ lệ tiến độ (0-100)")
    default_video_ratio: Mapped[str | None] = mapped_column(
        String(16),
        nullable=True,
        default=None,
        comment="Tỷ lệ video mặc định cấp dự án (có thể để trống; dùng khi phân cảnh chưa ghi đè)",
    )
    stats: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict, comment="Thống kê gộp (JSON)")

    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    characters: Mapped[list["Character"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Character.id",
    )
    actor_links: Mapped[list["ProjectActorLink"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectActorLink.id",
    )
    scene_links: Mapped[list["ProjectSceneLink"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectSceneLink.id",
    )
    prop_links: Mapped[list["ProjectPropLink"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectPropLink.id",
    )
    costume_links: Mapped[list["ProjectCostumeLink"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectCostumeLink.id",
    )

    __table_args__ = (
        Index("ix_projects_updated_at", "updated_at"),
        Index("ix_projects_style", "style"),
        Index("ix_projects_visual_style", "visual_style"),
    )


class Chapter(Base, TimestampMixin):
    """Bảng chương.

    Ràng buộc:
    - `project_id + index` duy nhất, đảm bảo số thứ tự tập trong cùng một dự án không trùng.
    """

    __tablename__ = "chapters"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="ID chương")
    project_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID dự án sở hữu",
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False, comment="Số thứ tự chương (duy nhất trong dự án)")
    title: Mapped[str] = mapped_column(String(255), nullable=False, comment="Tiêu đề chương")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="Tóm tắt chương")
    raw_text: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="Văn bản gốc của chương (chưa làm sạch / có thể dài)")
    condensed_text: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="Văn bản gốc đã được mô hình rút gọn (dùng cho trích xuất / prompt)")
    storyboard_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Số lượng phân cảnh")
    status: Mapped[ChapterStatus] = mapped_column(
        String(32),
        nullable=False,
        default=ChapterStatus.draft,
        comment="Trạng thái chương",
    )

    project: Mapped["Project"] = relationship(back_populates="chapters")
    shots: Mapped[list["Shot"]] = relationship(
        back_populates="chapter",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("project_id", "index", name="uq_chapters_project_index"),
        Index("ix_chapters_updated_at", "updated_at"),
        Index("ix_chapters_status", "status"),
        Index("ix_chapters_project_title", "project_id", "title"),
    )


class ProjectActorLink(Base, TimestampMixin):
    """Dự án/chương/phân cảnh -> liên kết diễn viên."""

    __tablename__ = "project_actor_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng liên kết")
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
        comment="ID chương",
    )
    shot_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("shots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID phân cảnh",
    )
    actor_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("actors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID diễn viên",
    )

    project: Mapped["Project"] = relationship(back_populates="actor_links")
    shot: Mapped["Shot"] = relationship(back_populates="actor_links")
    actor: Mapped["Actor"] = relationship()

    __table_args__ = (
        UniqueConstraint("actor_id", "project_id", "chapter_id", "shot_id", name="uq_project_actor_links_actor_scope"),
    )


class ProjectSceneLink(Base, TimestampMixin):
    """Dự án/chương/phân cảnh -> liên kết bối cảnh."""

    __tablename__ = "project_scene_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng liên kết")
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True, comment="ID dự án")
    chapter_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True, index=True, comment="ID chương")
    shot_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("shots.id", ondelete="SET NULL"), nullable=True, index=True, comment="ID phân cảnh")
    scene_id: Mapped[str] = mapped_column(String(64), ForeignKey("scenes.id", ondelete="CASCADE"), nullable=False, index=True, comment="ID bối cảnh")

    project: Mapped["Project"] = relationship(back_populates="scene_links")
    shot: Mapped["Shot"] = relationship(back_populates="scene_links")
    scene: Mapped["Scene"] = relationship()

    __table_args__ = (
        UniqueConstraint("scene_id", "project_id", "chapter_id", "shot_id", name="uq_project_scene_links_scene_scope"),
    )


class ProjectPropLink(Base, TimestampMixin):
    """Dự án/chương/phân cảnh -> liên kết đạo cụ."""

    __tablename__ = "project_prop_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng liên kết")
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True, comment="ID dự án")
    chapter_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True, index=True, comment="ID chương")
    shot_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("shots.id", ondelete="SET NULL"), nullable=True, index=True, comment="ID phân cảnh")
    prop_id: Mapped[str] = mapped_column(String(64), ForeignKey("props.id", ondelete="CASCADE"), nullable=False, index=True, comment="ID đạo cụ")

    project: Mapped["Project"] = relationship(back_populates="prop_links")
    shot: Mapped["Shot"] = relationship(back_populates="prop_links")
    prop: Mapped["Prop"] = relationship()

    __table_args__ = (
        UniqueConstraint("prop_id", "project_id", "chapter_id", "shot_id", name="uq_project_prop_links_prop_scope"),
    )


class ProjectCostumeLink(Base, TimestampMixin):
    """Dự án/chương/phân cảnh -> liên kết trang phục."""

    __tablename__ = "project_costume_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng liên kết")
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True, comment="ID dự án")
    chapter_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True, index=True, comment="ID chương")
    shot_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("shots.id", ondelete="SET NULL"), nullable=True, index=True, comment="ID phân cảnh")
    costume_id: Mapped[str] = mapped_column(String(64), ForeignKey("costumes.id", ondelete="CASCADE"), nullable=False, index=True, comment="ID trang phục")

    project: Mapped["Project"] = relationship(back_populates="costume_links")
    shot: Mapped["Shot"] = relationship(back_populates="costume_links")
    costume: Mapped["Costume"] = relationship()

    __table_args__ = (
        UniqueConstraint("costume_id", "project_id", "chapter_id", "shot_id", name="uq_project_costume_links_costume_scope"),
    )


__all__ = [
    "Project",
    "Chapter",
    "ProjectActorLink",
    "ProjectSceneLink",
    "ProjectPropLink",
    "ProjectCostumeLink",
]
