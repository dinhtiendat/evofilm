from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.base import TimestampMixin
from app.models.types import (
    CameraAngle,
    CameraMovement,
    CameraShotType,
    DialogueLineMode,
    ShotCandidateStatus,
    ShotCandidateType,
    ShotDialogueCandidateStatus,
    ShotFrameType,
    ShotStatus,
    VFXType,
)


class Shot(Base,TimestampMixin):
    """Bảng phân cảnh (thông tin cơ bản).

    Giải thích:：
    - Hiện chưa trộn `TimestampMixin`, tránh tạo thêm ghi-phong-toa trong luồng tạo/cập nhật tần suất cao; nếu cần audit có thể bổ sung sau.
    - Chi tiết đặt trong `ShotDetail` để giữ các trường bảng chính ổn định.
    """

    __tablename__ = "shots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, comment="id: Mapped[str] = mapped_column(String(64), primary_key=True, comment=ID phân cảnh) ID")
    chapter_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID chương sở thuộc, ID",
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False, comment="Số thứ tự phân cảnh (duy nhất trong chương)")
    title: Mapped[str] = mapped_column(String(255), nullable=False, comment="title: Mapped[str] = mapped_column(String(255), nullable=False, comment=Tiêu đề phân cảnh)")
    thumbnail: Mapped[str] = mapped_column(String(1024), nullable=False, default="", comment="Ảnh thu nhỏ URL/Đường")
    status: Mapped[ShotStatus] = mapped_column(
        String(32),
        nullable=False,
        default=ShotStatus.pending,
        comment="comment=Trạng thái phân cảnh,",
    )
    skip_extraction: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="có bỏ qua rõ ràng trích xuất thông tin không；true thì có thể vào thẳng phán đoán ready",
    )
    last_extracted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Thời gian hoàn thành trích xuất thông tin gần nhất; dùng để phân biệt chưa trích xuất với kết quả trích xuất rỗng",
    )
    script_excerpt: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="script_excerpt: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Trích đoạn kịch bản)")
    generated_video_file_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="comment=ID tệp liên kết video đã sinh(FileItem, type=video), ID（FileItem，type=video）",
    )

    chapter: Mapped["Chapter"] = relationship(back_populates="shots")
    generated_video_file: Mapped["FileItem | None"] = relationship(
        foreign_keys=[generated_video_file_id]
    )
    detail: Mapped["ShotDetail"] = relationship(
        back_populates="shot",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
    actor_links: Mapped[list["ProjectActorLink"]] = relationship(
        back_populates="shot",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectActorLink.id",
    )
    scene_links: Mapped[list["ProjectSceneLink"]] = relationship(
        back_populates="shot",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectSceneLink.id",
    )
    prop_links: Mapped[list["ProjectPropLink"]] = relationship(
        back_populates="shot",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectPropLink.id",
    )
    costume_links: Mapped[list["ProjectCostumeLink"]] = relationship(
        back_populates="shot",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectCostumeLink.id",
    )
    character_links: Mapped[list["ShotCharacterLink"]] = relationship(
        back_populates="shot",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ShotCharacterLink.index",
    )
    extracted_candidates: Mapped[list["ShotExtractedCandidate"]] = relationship(
        back_populates="shot",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ShotExtractedCandidate.id",
    )
    extracted_dialogue_candidates: Mapped[list["ShotExtractedDialogueCandidate"]] = relationship(
        back_populates="shot",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ShotExtractedDialogueCandidate.index",
    )

    __table_args__ = (
        UniqueConstraint("chapter_id", "index", name="uq_shots_chapter_index"),
        Index("ix_shots_status", "status"),
        Index("ix_shots_chapter_title", "chapter_id", "title"),
    )


class ShotDetail(Base,TimestampMixin):
    """Chi tiết phân cảnh (1:1).（1:1）。

    Điểm thiết kế:：
    - dùng chung khóa chính với `Shot`, đảm bảo một shot tối đa một bản chi tiết, và xóa shot thì chi tiết bị xóa liên kết.
    - `mood_tags` lưu list[str] dạng JSON, đồng bộ với mock phía trước.

    Đảm bảo ở tầng ứng dụng:：
    - bối cảnh mà `scene_id` trỏ nên nhất quán với dự án của shot hoặc là bối cảnh toàn cục, tránh tham chiếu chéo dự án.
    """

    __tablename__ = "shot_details"

    # Chia sẻ khóa chính với Shot (1:1): dùng khóa ngoại làm khóa chính, buộc một-đối-một.
    id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("shots.id", ondelete="CASCADE"),
        primary_key=True,
        comment="ID phân cảnh (chia sẻ khóa chính với shots.id)",
    )
    camera_shot: Mapped[CameraShotType] = mapped_column(
        String(16),
        nullable=False,
        comment="Độ rộng phân cảnh (lưu code: ECU/CU/MCU/MS/MLS/LS/ELS; hiển thị có thể dùng schemas.SHOT_TYPE_ZH)",
    )
    angle: Mapped[CameraAngle] = mapped_column(
        String(16),
        nullable=False,
        comment="Góc máy (lưu code: EYE_LEVEL/HIGH_ANGLE/...; khi hiển thị có thể dùng schemas.CAMERA_ANGLE_ZH)",
    )
    movement: Mapped[CameraMovement] = mapped_column(
        String(16),
        nullable=False,
        comment="Cách chuyển động máy (lưu code: STATIC/PAN/...; hiển thị có thể dùng schemas.CAMERA_MOVEMENT_ZH)",
    )
    scene_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("scenes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID bối cảnh liên kết(để trống được)；tầng ứng dụng phải đảm bảo nhất quán với dự án của shot hoặc toàn cục",
    )
    duration: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Thời lượng (giây); nguồn thời lượng duy nhất của phân cảnh")
    override_video_ratio: Mapped[str | None] = mapped_column(
        String(16),
        nullable=True,
        default=None,
        comment="Ghi đè tỉ lệ video cấp phân cảnh (để trống nghĩa là kế thừa mặc định của dự án)",
    )
    mood_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list, comment="Nhãn cảm xúc (mảng JSON)")
    atmosphere: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="atmosphere: Mapped[str] = mapped_column(Text, nullable=False, default=, comment=Mô tả không khí)")
    follow_atmosphere: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="follow_atmosphere: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment=Có tiếp tục dùng không khí không)")
    has_bgm: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="has_bgm: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment=Có chứa nhạc nền (BGM) không) BGM")
    vfx_type: Mapped[VFXType] = mapped_column(
        String(32),
        nullable=False,
        default=VFXType.none,
        comment="loại VFX (lưu code；hiển thị có thể dùng schemas.VFX_TYPE_ZH)",
    )
    vfx_note: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="Ghi chú hiệu ứng đặc biệt (ngắn, khả thi)")
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
        comment="Mô tả tổng thể của phân cảnh (dùng để bổ sung prompt)",
    )
    action_beats: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="Mốc hành động của phân cảnh (sắp theo thứ tự thời gian, dùng cho khung hình chính và tạo video)",
    )
    prompt_template_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("prompt_templates.id", ondelete="SET NULL"),
        nullable=True,
        comment="ID mẫu prompt phân cảnh (tùy chọn)",
    )
    first_frame_prompt: Mapped[str] = mapped_column(
        Text, nullable=False, default="", comment="Text, nullable=False, default=, comment=Prompt khung hình đầu của phân cảnh,",
    )
    last_frame_prompt: Mapped[str] = mapped_column(
        Text, nullable=False, default="", comment="Text, nullable=False, default=, comment=Prompt khung hình cuối của phân cảnh,",
    )
    key_frame_prompt: Mapped[str] = mapped_column(
        Text, nullable=False, default="", comment="Text, nullable=False, default=, comment=Prompt khung hình chính của phân cảnh,",
    )

    shot: Mapped["Shot"] = relationship(back_populates="detail")
    scene: Mapped["Scene | None"] = relationship()
    frame_images: Mapped[list["ShotFrameImage"]] = relationship(
        back_populates="shot_detail",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ShotFrameImage.id",
    )
    dialog_lines: Mapped[list["ShotDialogLine"]] = relationship(
        back_populates="shot_detail",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ShotDialogLine.index",
    )

    prompt_template: Mapped["PromptTemplate | None"] = relationship()

    __table_args__ = (
        Index("ix_shot_details_camera_shot", "camera_shot"),
        Index("ix_shot_details_angle", "angle"),
        Index("ix_shot_details_prompt_template_id", "prompt_template_id"),
    )


class ShotFrameImage(Base, TimestampMixin):
    """Ảnh khung hình phân cảnh (khung hình đầu/khung hình cuối/khung hình chính). Mỗi phân cảnh mỗi loại một bản ghi, liên kết bảng files qua file_id.

    Đảm bảo ở tầng ứng dụng:：
    - cùng một shot_detail_id + frame_type tối đa một bản ghi (ràng buộc duy nhất của bảng).
    """

    __tablename__ = "shot_frame_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment=ID hàng ảnh) ID")
    shot_detail_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("shot_details.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID chi tiết phân cảnh sở hữu, ID",
    )
    frame_type: Mapped[ShotFrameType] = mapped_column(
        String(16),
        nullable=False,
        index=True,
        comment="comment=Loại khung hình: first/last/key,：first/last/key",
    )
    file_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="comment=ID tệp liên kết (FileItem), ID（FileItem）",
    )
    width: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="width: Mapped[int | None] = mapped_column(Integer, nullable=True, comment=Rộng (px))（px）")
    height: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="height: Mapped[int | None] = mapped_column(Integer, nullable=True, comment=Cao (px))（px）")
    format: Mapped[str] = mapped_column(String(32), nullable=False, default="png", comment="format: Mapped[str] = mapped_column(String(32), nullable=False, default=png, comment=Định dạng)")

    shot_detail: Mapped["ShotDetail"] = relationship(back_populates="frame_images")

    __table_args__ = (
        UniqueConstraint("shot_detail_id", "frame_type", name="uq_shot_frame_images_detail_type"),
    )


class ShotDialogLine(Base,TimestampMixin):
    """Dòng thoại phân cảnh.。

    Điểm thiết kế:：
    - Trong mock phía trước, `dialog` là mảng, ở đây tách bảng để hỗ trợ sắp xếp, tìm kiếm và các năng lực tương ứng với phụ đề/thuyết minh sau này.
    - `shot_detail_id + index` duy nhất, đảm bảo số dòng ổn định.

    Đảm bảo ở tầng ứng dụng:：
    - `speaker_character_id` / `target_character_id` trỏ đến nhân vật nên thống nhất với chương/dự án mà phân cảnh đó thuộc về, tránh tham chiếu xuyên dự án.
    """

    __tablename__ = "shot_dialog_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment=ID tự tăng của dòng hội thoại) ID")
    shot_detail_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("shot_details.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID chi tiết phân cảnh sở hữu, ID",
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Số thứ tự (thứ tự trong phân cảnh)")
    text: Mapped[str] = mapped_column(Text, nullable=False, comment="text: Mapped[str] = mapped_column(Text, nullable=False, comment=Nội dung lời thoại)")
    line_mode: Mapped[DialogueLineMode] = mapped_column(
        String(16),
        nullable=False,
        default=DialogueLineMode.dialogue,
        comment="Chế độ lời thoại (DIALOGUE/VOICE_OVER/OFF_SCREEN/PHONE; thống nhất với schemas.DIALOGUE_LINE_MODE_ZH)",
    )
    speaker_character_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("characters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID nhân vật nói; tầng ứng dụng phải đảm bảo khớp với dự án mà phân cảnh thuộc vào",
    )
    target_character_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("characters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID nhân vật nghe; tầng ứng dụng phải đảm bảo khớp với dự án mà phân cảnh thuộc vào",
    )

    speaker_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Tên nhân vật nói (dùng để điền ngược liên kết nhân vật từ kết quả trích xuất; có thể để trống)",
    )
    target_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Tên nhân vật nghe (dùng để điền ngược liên kết nhân vật từ kết quả trích xuất; có thể để trống)",
    )

    shot_detail: Mapped["ShotDetail"] = relationship(back_populates="dialog_lines")
    speaker_character: Mapped["Character | None"] = relationship(foreign_keys=[speaker_character_id])
    target_character: Mapped["Character | None"] = relationship(foreign_keys=[target_character_id])

    __table_args__ = (
        UniqueConstraint("shot_detail_id", "index", name="uq_shot_dialog_lines_shot_index"),
    )


class ShotCharacterLink(Base,TimestampMixin):
    """Phân cảnh tham chiếu nhân vật (nhiều-đến-nhiều).

    Đảm bảo ở tầng ứng dụng:：
    - nhân vật được tham chiếu nên nhất quán với dự án của shot (bảng nhân vật tự thuộc về dự án, xác thực khi ghi có thể tránh tham chiếu chéo dự án).
    """

    __tablename__ = "shot_character_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment=ID hàng liên kết) ID")
    shot_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("shots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID phân cảnh, ID",
    )
    character_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID nhân vật, ID",
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment=Thứ tự nhân vật trong phân cảnh)")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="Ghi chú (tùy chọn)")

    shot: Mapped["Shot"] = relationship(back_populates="character_links")
    character: Mapped["Character"] = relationship(back_populates="shot_links")

    __table_args__ = (
        UniqueConstraint("shot_id", "character_id", name="uq_shot_character_links_shot_character"),
        UniqueConstraint("shot_id", "index", name="uq_shot_character_links_shot_index"),
    )


class ShotExtractedCandidate(Base, TimestampMixin):
    """Ứng viên trích xuất phân cảnh.。

    Dùng để ghi lại tài nguyên ứng viên thu được sau “trích xuất thông tin” của một phân cảnh cùng trạng thái xác nhận:
    - pending：- pending: Chờ xử lý
    - linked：- linked: đã liên kết với thực thể thật
    - ignored：- ignored: Đã rõ bỏ qua
    """

    __tablename__ = "shot_extracted_candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment=ID tự tăng của mục ứng viên) ID")
    shot_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("shots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID phân cảnh sở hữu, ID",
    )
    candidate_type: Mapped[ShotCandidateType] = mapped_column(
        String(32),
        nullable=False,
        index=True,
        comment="comment=loại ứng viên:character/scene/prop/costume,：character/scene/prop/costume",
    )
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False, comment="candidate_name: Mapped[str] = mapped_column(String(255), nullable=False, comment=Tên ứng viên)")
    candidate_status: Mapped[ShotCandidateStatus] = mapped_column(
        String(32),
        nullable=False,
        default=ShotCandidateStatus.pending,
        index=True,
        comment="comment=Trạng thái xác nhận ứng viên: pending/linked/ignored,：pending/linked/ignored",
    )
    linked_entity_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        comment="comment=ID thực thể đích tương ứng khi đã liên kết, ID",
    )
    source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="extraction",
        comment="nguồn ứng viên, hiện cố định là extraction",
    )
    payload: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Giữ thông tin trích xuất đi kèm, như description/thumbnail/file_id/confidence, v.v.",
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Thời điểm ứng viên được xác nhận (liên kết/bỏ qua)",
    )

    shot: Mapped["Shot"] = relationship(back_populates="extracted_candidates")

    __table_args__ = (
        UniqueConstraint("shot_id", "candidate_type", "candidate_name", name="uq_shot_candidate_name"),
        Index("ix_shot_extracted_candidates_shot_type", "shot_id", "candidate_type"),
    )


class ShotExtractedDialogueCandidate(Base, TimestampMixin):
    """Ứng viên trích xuất thoại phân cảnh.。

    Lưu tách bảng với ứng viên tài nguyên, tránh trộn lẫn luồng xác nhận thoại và luồng liên kết thực thể:
    - pending：- pending: Chờ xác nhận
    - accepted：- accepted: đã chấp nhận và ghi vào ShotDialogLine ShotDialogLine
    - ignored：- ignored: Đã rõ bỏ qua
    """

    __tablename__ = "shot_extracted_dialogue_candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment=ID tự tăng của ứng viên thoại) ID")
    shot_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("shots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="comment=ID phân cảnh sở hữu, ID",
    )
    index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment=Thứ tự ứng viên thoại trong phân cảnh)")
    text: Mapped[str] = mapped_column(Text, nullable=False, comment="text: Mapped[str] = mapped_column(Text, nullable=False, comment=Văn bản lời thoại đã trích xuất)")
    line_mode: Mapped[DialogueLineMode] = mapped_column(
        String(16),
        nullable=False,
        default=DialogueLineMode.dialogue,
        comment="comment=Chế độ thoại (DIALOGUE/VOICE_OVER/OFF_SCREEN/PHONE),（DIALOGUE/VOICE_OVER/OFF_SCREEN/PHONE）",
    )
    speaker_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Tên nhân vật nói (để trống được)\","
    )
    target_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Tên nhân vật nghe (để trống được)",
    )
    candidate_status: Mapped[ShotDialogueCandidateStatus] = mapped_column(
        String(32),
        nullable=False,
        default=ShotDialogueCandidateStatus.pending,
        index=True,
        comment="comment=trạng thái xác nhận ứng viên thoại:pending/accepted/ignored,：pending/accepted/ignored",
    )
    linked_dialog_line_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("shot_dialog_lines.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="comment=ID dòng lời thoại được ghi khi đã chấp nhận, ID",
    )
    source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="extraction",
        comment="nguồn ứng viên, hiện cố định là extraction",
    )
    payload: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Giữ thông tin trích xuất kèm theo, thuận tiện cho mở rộng sau",
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Thời điểm ứng viên lời thoại được xác nhận (chấp nhận/bỏ qua)",
    )

    shot: Mapped["Shot"] = relationship(back_populates="extracted_dialogue_candidates")
    linked_dialog_line: Mapped["ShotDialogLine | None"] = relationship()

    __table_args__ = (
        Index("ix_shot_dialogue_candidates_shot_status", "shot_id", "candidate_status"),
    )


__all__ = [
    "Shot",
    "ShotDetail",
    "ShotFrameImage",
    "ShotDialogLine",
    "ShotCharacterLink",
    "ShotExtractedCandidate",
    "ShotExtractedDialogueCandidate",
]
