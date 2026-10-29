from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin
from app.models.types import ProjectStyle, ProjectVisualStyle


class Scene(Base, TimestampMixin):
    """Bảng bối cảnh.。"""

    __tablename__ = "scenes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="ID")
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="name: Mapped[str] = mapped_column(String(255), nullable=False, comment=Tên)")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="description: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Mô tả)")
    style: Mapped[ProjectStyle] = mapped_column(String(32), nullable=False, comment="Thể loại/phong cách")
    view_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="Số lượng ảnh góc nhìn dự kiến tạo cho bối cảnh này (không gồm khung hình phân cảnh)",
    )
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment="tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment=Nhãn)")
    prompt_template_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("prompt_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="comment=ID mẫu prompt, ID",
    )
    visual_style: Mapped[ProjectVisualStyle] = mapped_column(
        String(16),
        nullable=False,
        default=ProjectVisualStyle.live_action,
        comment="Hình thức biểu diễn của khung hình (thực tế/hoạt hình...)",
    )

    prompt_template: Mapped["PromptTemplate | None"] = relationship()
    images: Mapped[list["SceneImage"]] = relationship(
        back_populates="scene",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="SceneImage.id",
    )

    __table_args__ = (
        Index("ix_scenes_name", "name"),
        UniqueConstraint("name", name="uq_scenes_name"),
    )


class Prop(Base, TimestampMixin):
    """Bảng đạo cụ. Liên kết nhân vật - đạo cụ xem tại CharacterPropLink."""

    __tablename__ = "props"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="ID")
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="name: Mapped[str] = mapped_column(String(255), nullable=False, comment=Tên)")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="description: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Mô tả)")
    style: Mapped[ProjectStyle] = mapped_column(String(32), nullable=False, comment="Thể loại/phong cách")
    view_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="Số lượng ảnh góc nhìn dự kiến tạo cho đạo cụ này (không gồm khung hình phân cảnh)",
    )
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment="tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment=Nhãn)")
    prompt_template_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("prompt_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="comment=ID mẫu prompt, ID",
    )
    visual_style: Mapped[ProjectVisualStyle] = mapped_column(
        String(16),
        nullable=False,
        default=ProjectVisualStyle.live_action,
        comment="Hình thức biểu diễn của khung hình (thực tế/hoạt hình...)",
    )

    prompt_template: Mapped["PromptTemplate | None"] = relationship()
    images: Mapped[list["PropImage"]] = relationship(
        back_populates="prop",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PropImage.id",
    )
    character_prop_links: Mapped[list["CharacterPropLink"]] = relationship(
        back_populates="prop",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_props_name", "name"),
        UniqueConstraint("name", name="uq_props_name"),
    )


class Costume(Base, TimestampMixin):
    """Bảng trang phục. Trang phục của nhân vật xem tại Character.costume_id."""

    __tablename__ = "costumes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="ID")
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="name: Mapped[str] = mapped_column(String(255), nullable=False, comment=Tên)")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="description: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Mô tả)")
    style: Mapped[ProjectStyle] = mapped_column(String(32), nullable=False, comment="Thể loại/phong cách")
    view_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="Số lượng ảnh góc nhìn dự kiến tạo cho trang phục này (không gồm khung hình phân cảnh)",
    )
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment="tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment=Nhãn)")
    prompt_template_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("prompt_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="comment=ID mẫu prompt, ID",
    )
    visual_style: Mapped[ProjectVisualStyle] = mapped_column(
        String(16),
        nullable=False,
        default=ProjectVisualStyle.live_action,
        comment="Hình thức biểu diễn của khung hình (thực tế/hoạt hình...)",
    )

    prompt_template: Mapped["PromptTemplate | None"] = relationship()
    images: Mapped[list["CostumeImage"]] = relationship(
        back_populates="costume",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CostumeImage.id",
    )
    characters: Mapped[list["Character"]] = relationship(back_populates="costume")

    __table_args__ = (
        Index("ix_costumes_name", "name"),
        UniqueConstraint("name", name="uq_costumes_name"),
    )


class Actor(Base, TimestampMixin):
    """Bảng diễn viên (khác biệt với nhân vật).

    Giải thích:：
    - dùng bộ trường của ActorImage (cũ), làm bảng chính của "tài nguyên hình mẫu/chân dung diễn viên".
    - Thuộc sở hữu được diễn đạt bởi ProjectActorLink (chiều project/chapter/shot).
    """

    __tablename__ = "actors"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="ID")
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="name: Mapped[str] = mapped_column(String(255), nullable=False, comment=Tên)")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="description: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Mô tả)")
    style: Mapped[ProjectStyle] = mapped_column(String(32), nullable=False, comment="Thể loại/phong cách")
    view_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="Số lượng ảnh góc nhìn dự kiến tạo cho hình tượng diễn viên này (không gồm khung hình phân cảnh)",
    )
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment="tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment=Nhãn)")
    prompt_template_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("prompt_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="comment=ID mẫu prompt, ID",
    )
    visual_style: Mapped[ProjectVisualStyle] = mapped_column(
        String(16),
        nullable=False,
        default=ProjectVisualStyle.live_action,
        comment="Hình thức biểu diễn của khung hình (thực tế/hoạt hình...)",
    )

    prompt_template: Mapped["PromptTemplate | None"] = relationship()
    images: Mapped[list["ActorImage"]] = relationship(
        back_populates="actor",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ActorImage.id",
    )
    characters: Mapped[list["Character"]] = relationship(back_populates="actor")

    __table_args__ = (
        Index("ix_actors_name", "name"),
        UniqueConstraint("name", name="uq_actors_name"),
    )


class Character(Base, TimestampMixin):
    """Bảng nhân vật (thuộc dự án).

    Quy ước cấu thành:：
    - nhân vật gồm:Actor (diễn viên) + Costume (trang phục) + Props (đạo cụ).
    - - Cuối cùng trích dẫn nhân vật trong phân cảnh: `ShotCharacterLink` (shot_character_links).：`ShotCharacterLink`（shot_character_links）。

    Đảm bảo ở tầng ứng dụng:：
    - trang phục mà `costume_id` trỏ nên thuộc dự án của nhân vật đó hoặc tài nguyên toàn cục, tránh dùng nhầm chéo dự án.
    """

    __tablename__ = "characters"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="id: Mapped[str] = mapped_column(String(64), primary_key=True, comment=ID nhân vật) ID")
    project_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID dự án sở hữu, ID",
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="name: Mapped[str] = mapped_column(String(255), nullable=False, comment=Tên nhân vật)")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="description: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Mô tả nhân vật)")
    style: Mapped[ProjectStyle] = mapped_column(String(32), nullable=False, comment="Thể loại/phong cách")
    visual_style: Mapped[ProjectVisualStyle] = mapped_column(
        String(16),
        nullable=False,
        default=ProjectVisualStyle.live_action,
        comment="Hình thức biểu diễn của khung hình (thực tế/hoạt hình...)",
    )
    actor_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("actors.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="comment=ID diễn viên tương ứng, ID",
    )
    costume_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("costumes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID trang phục (có thể để trống); tầng ứng dụng phải đảm bảo cùng dự án với nhân vật hoặc toàn cục",
    )

    project: Mapped["Project"] = relationship(back_populates="characters")
    actor: Mapped["Actor"] = relationship(back_populates="characters")
    costume: Mapped["Costume | None"] = relationship(back_populates="characters")
    prop_links: Mapped[list["CharacterPropLink"]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CharacterPropLink.index",
    )
    shot_links: Mapped[list["ShotCharacterLink"]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    images: Mapped[list["CharacterImage"]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CharacterImage.id",
    )

    __table_args__ = (
        Index("ix_characters_name", "name"),
        UniqueConstraint("project_id", "name", name="uq_characters_project_name"),
    )


class CharacterPropLink(Base,TimestampMixin):
    """Liên kết nhân vật với đạo cụ (nhiều-đến-nhiều).

    Đảm bảo ở tầng ứng dụng:：
    - Đạo cụ mà `prop_id` chỉ đến nên thuộc dự án của nhân vật này hoặc tài nguyên toàn cục, tránh dùng nhầm giữa các dự án.
    """

    __tablename__ = "character_prop_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment=ID hàng liên kết) ID")
    character_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID nhân vật, ID",
    )
    prop_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("props.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID đạo cụ, ID",
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment=Thứ tự nhân vật / đạo cụ)")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="Ghi chú (tùy chọn)")

    character: Mapped["Character"] = relationship(back_populates="prop_links")
    prop: Mapped["Prop"] = relationship(back_populates="character_prop_links")

    __table_args__ = (
        UniqueConstraint("character_id", "prop_id", name="uq_character_prop_links_character_prop"),
        UniqueConstraint("character_id", "index", name="uq_character_prop_links_character_index"),
    )


__all__ = [
    "Scene",
    "Prop",
    "Costume",
    "Actor",
    "Character",
    "CharacterPropLink",
]

