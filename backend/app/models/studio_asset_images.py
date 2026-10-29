from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin
from app.models.types import AssetQualityLevel, AssetViewAngle


class CharacterImage(Base, TimestampMixin):
    """ảnh nhân vật (nhiều góc/nhiều độ phân giải). Thuộc nhân vật；cùng một nhân vật tối đa một ảnh is_primary=True.

    Đảm bảo ở tầng ứng dụng:
    - Cùng một character_id chỉ có tối đa một is_primary=True.
    """

    __tablename__ = "character_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng ảnh")
    character_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID nhân vật sở thuộc",
    )
    file_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="ID tệp liên kết (FileItem, để trống được, hỗ trợ tạo trước vị trí giữ rồi điền sau)",
    )
    quality_level: Mapped[AssetQualityLevel] = mapped_column(
        String(16),
        nullable=False,
        default=AssetQualityLevel.low,
        index=True,
        comment="Cấp độ chi tiết",
    )
    view_angle: Mapped[AssetViewAngle] = mapped_column(
        String(32),
        nullable=False,
        default=AssetViewAngle.front,
        index=True,
        comment="Góc nhìn",
    )
    width: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Rộng (px)")
    height: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Cao (px)")
    format: Mapped[str] = mapped_column(String(32), nullable=True, default="png", comment="Định dạng")
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Có phải ảnh chính không; tầng ứng dụng cần đảm bảo mỗi nhân vật tối đa một ảnh chính",
    )

    character: Mapped["Character"] = relationship(back_populates="images")

    __table_args__ = (
        UniqueConstraint(
            "character_id",
            "quality_level",
            "view_angle",
            name="uq_character_images_quality_angle",
        ),
    )


class ActorImage(Base, TimestampMixin):
    """Ảnh hình tượng diễn viên/character nhiều góc.

    Đảm bảo ở tầng ứng dụng:
    - Cùng một `actor_id` có tối đa một `is_primary=True`; bảng trong CSDL không có constraint duy nhất, phải bảo đảm khi ghi/cập nhật.
    """

    __tablename__ = "actor_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng ảnh")
    actor_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("actors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID diễn viên sở thuộc",
    )
    file_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="ID tệp liên kết (FileItem, để trống được, hỗ trợ tạo trước vị trí giữ rồi điền sau)",
    )
    quality_level: Mapped[AssetQualityLevel] = mapped_column(
        String(16),
        nullable=False,
        default=AssetQualityLevel.low,
        index=True,
        comment="Cấp độ chi tiết",
    )
    view_angle: Mapped[AssetViewAngle] = mapped_column(
        String(32),
        nullable=False,
        default=AssetViewAngle.front,
        index=True,
        comment="Góc nhìn",
    )
    width: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Rộng (px)")
    height: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Cao (px)")
    format: Mapped[str] = mapped_column(String(32), nullable=False, default="png", comment="Định dạng")

    actor: Mapped["Actor"] = relationship(back_populates="images")

    __table_args__ = (
        UniqueConstraint("actor_id", "quality_level", "view_angle", name="uq_actor_images_quality_angle"),
    )


class SceneImage(Base, TimestampMixin):
    """Ảnh nhiều góc bối cảnh.

    Đảm bảo ở tầng ứng dụng:
    - Cùng một `scene_id` có tối đa một `is_primary=True`; bảng trong CSDL không có constraint duy nhất, phải bảo đảm khi ghi/cập nhật.
    """

    __tablename__ = "scene_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng ảnh")
    scene_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("scenes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID bối cảnh sở thuộc",
    )
    file_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="ID tệp liên kết (FileItem, để trống được, hỗ trợ tạo trước vị trí giữ rồi điền sau)",
    )
    quality_level: Mapped[AssetQualityLevel] = mapped_column(
        String(16),
        nullable=False,
        default=AssetQualityLevel.low,
        index=True,
        comment="Cấp độ chi tiết",
    )
    view_angle: Mapped[AssetViewAngle] = mapped_column(
        String(32),
        nullable=False,
        default=AssetViewAngle.front,
        index=True,
        comment="Góc nhìn",
    )
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    format: Mapped[str] = mapped_column(String(32), nullable=False, default="png")

    scene: Mapped["Scene"] = relationship(back_populates="images")

    __table_args__ = (
        UniqueConstraint("scene_id", "quality_level", "view_angle", name="uq_scene_images_quality_angle"),
    )


class PropImage(Base, TimestampMixin):
    """Ảnh nhiều góc đạo cụ.

    Đảm bảo ở tầng ứng dụng:
    - Cùng một `prop_id` có tối đa một `is_primary=True`; bảng trong CSDL không có constraint duy nhất, phải bảo đảm khi ghi/cập nhật.
    """

    __tablename__ = "prop_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng ảnh")
    prop_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("props.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID đạo cụ sở thuộc",
    )
    file_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="ID tệp liên kết (FileItem, để trống được, hỗ trợ tạo trước vị trí giữ rồi điền sau)",
    )
    quality_level: Mapped[AssetQualityLevel] = mapped_column(
        String(16),
        nullable=False,
        default=AssetQualityLevel.low,
        index=True,
    )
    view_angle: Mapped[AssetViewAngle] = mapped_column(
        String(32),
        nullable=False,
        default=AssetViewAngle.front,
        index=True,
    )
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    format: Mapped[str] = mapped_column(String(32), nullable=False, default="png")

    prop: Mapped["Prop"] = relationship(back_populates="images")

    __table_args__ = (
        UniqueConstraint("prop_id", "quality_level", "view_angle", name="uq_prop_images_quality_angle"),
    )


class CostumeImage(Base, TimestampMixin):
    """Ảnh nhiều góc trang phục.

    Đảm bảo ở tầng ứng dụng:
    - Dưới cùng một `costume_id` chỉ có tối đa một `is_primary=True`; bảng thư viện không có ràng buộc duy nhất, cần đảm bảo khi ghi/cập nhật.
    """

    __tablename__ = "costume_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="ID hàng ảnh")
    costume_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("costumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID trang phục sở thuộc",
    )
    file_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="ID tệp liên kết (FileItem, để trống được, hỗ trợ tạo trước vị trí giữ rồi điền sau)",
    )
    quality_level: Mapped[AssetQualityLevel] = mapped_column(
        String(16),
        nullable=False,
        default=AssetQualityLevel.low,
        index=True,
    )
    view_angle: Mapped[AssetViewAngle] = mapped_column(
        String(32),
        nullable=False,
        default=AssetViewAngle.front,
        index=True,
    )
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    format: Mapped[str] = mapped_column(String(32), nullable=False, default="png")

    costume: Mapped["Costume"] = relationship(back_populates="images")

    __table_args__ = (
        UniqueConstraint(
            "costume_id",
            "quality_level",
            "view_angle",
            name="uq_costume_images_quality_angle",
        ),
    )


__all__ = [
    "CharacterImage",
    "ActorImage",
    "SceneImage",
    "PropImage",
    "CostumeImage",
]

