"""Mô hình đầu ra có cấu trúc liên quan trích xuất/phân cảnh điện ảnh (dùng để lộ ra API)."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.skills.common import (
    CameraAngle,
    CameraMovement,
    DialogueLine,
    EvidenceSpan,
    SceneInterior,
    SceneTime,
    ShotType,
    Transition,
    Uncertainty,
    VFXNote,
)


# ---------- Entities ----------
class Character(BaseModel):
    """nhân vật trích từ tiểu thuyết: tên chính, tên khác, ngoại hình & tính cách, mô tả trang phục, bằng chứng lần xuất hiện đầu và độ tin cậy trích xuất."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="ID ổn định, ví dụ char_001")
    name: str = Field(..., description="Tên chính (ưu tiên lấy cách gọi phổ biến nhất trong nguyên văn)")
    normalized_name: Optional[str] = Field(None, description="Tên chính sau chuẩn hóa, ví dụ gộp「Vương Nhị / Nhị ca / Vương Nhị ca」về cùng một tên chính (từ văn bản)")
    aliases: List[str] = Field(default_factory=list, description="Tên khác/cách gọi (đã xuất hiện trong nguyên văn)")
    description: Optional[str] = Field(None, description="Ngoại hình/địa vị/tố chất (trung thành nguyên văn, phân biệt với trang phục)")
    costume_note: Optional[str] = Field(
        None,
        description="Mô tả trang phục / kiểu dáng trích xuất từ nguyên văn (như kiểu dáng, màu sắc, phụ kiện), phân biệt với description, tiện cho việc liên kết tài nguyên trang phục về sau",
    )
    traits: List[str] = Field(default_factory=list, description="Tính cách/từ chỉ đặc điểm (càng bám sát nguyên văn càng tốt)")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Độ tin cậy trích xuất 0-1 (đầu ra mô hình)")
    first_appearance: Optional[EvidenceSpan] = None


class Location(BaseModel):
    """Địa điểm rút từ tiểu thuyết: tên, loại, mô tả bối cảnh cùng bằng chứng xuất hiện đầu tiên, độ tin cậy."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="ID ổn định, ví dụ loc_001")
    name: str = Field(..., description="tên địa điểm(nguyên văn)")
    normalized_name: Optional[str] = Field(None, description="Tên chuẩn hóa (từ văn bản)")
    type: Optional[str] = Field(None, description="Loại địa điểm: phòng/phố/rừng/toa tàu, v.v. (tùy chọn)")
    description: Optional[str] = Field(None, description="Mô tả bối cảnh (trung thành nguyên văn, ngắn)")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Độ tin cậy trích xuất 0-1 (đầu ra mô hình)")
    first_appearance: Optional[EvidenceSpan] = None


class Prop(BaseModel):
    """đạo cụ trích từ tiểu thuyết:tên, hạng mục, ngoại hình/mục đích dùng, nhân vật sở hữu và bằng chứng lần xuất hiện đầu, độ tin cậy."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="ID ổn định, ví dụ prop_001")
    name: str = Field(..., description="tên đạo cụ(nguyên văn)")
    normalized_name: Optional[str] = Field(None, description="Tên chuẩn hóa (từ văn bản)")
    category: Optional[str] = Field(None, description="Tùy chọn: weapon/document/vehicle/clothing/device/magic_item/other")
    description: Optional[str] = Field(None, description="Ngoại hình / công dụng (trung thành nguyên văn)")
    owner_character_id: Optional[str] = Field(None, description="Chủ sở hữu (nếu rõ ràng)")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Độ tin cậy trích xuất 0-1 (đầu ra mô hình)")
    first_appearance: Optional[EvidenceSpan] = None


# ---------- Story / Scenes ----------
class Scene(BaseModel):
    """bối cảnh:nội/thoại cảnh, thời điểm, địa điểm & nhân vật/đạo cụ liên kết, kèm tiêu đề nguyên văn và tiêu đề định dạng hệ thống."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="ví dụ scene_001")
    raw_title: Optional[str] = Field(None, description="Tiêu đề bối cảnh từ nguyên văn (nếu có)")
    formatted_title: Optional[str] = Field(None, description="Tiêu đề theo định dạng kịch do hệ thống sinh ra, ví dụ INT. Địa điểm - THỜI GIAN")
    interior: SceneInterior = "UNKNOWN"
    time_of_day: SceneTime = "UNKNOWN"

    location_id: Optional[str] = Field(None, description="loc_xxx, nếu có thể xác định")
    summary: Optional[str] = Field(None, description="Điều gì đã xảy ra trong bối cảnh (trung thành nguyên văn, ngắn)")

    character_ids: List[str] = Field(default_factory=list, description="ID nhân vật xuất hiện trong bối cảnh này")
    prop_ids: List[str] = Field(default_factory=list, description="ID đạo cụ trọng yếu của bối cảnh này")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Đoạn dẫn chứng hỗ trợ bối cảnh này (có thể nhiều mục)")


class Shot(BaseModel):
    """shot đơn:cận/góc máy/vận camera, thời lượng & mô tả khung, danh sách thoại, sound effect và VFX, nhân vật & đạo cụ liên kết."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="ví dụ shot_001_003 (phân cảnh số 3 của scene_001)")
    scene_id: str = Field(..., description="Thuộc về scene_xxx")
    order: int = Field(..., ge=1, description="Thứ tự phân cảnh trong bối cảnh, bắt đầu từ 1")

    shot_type: ShotType
    camera_angle: CameraAngle = "EYE_LEVEL"
    camera_movement: CameraMovement = "STATIC"

    # Thông tin có thể quay/thực thi
    duration_sec: Optional[float] = Field(None, ge=0.5, le=30, description="Thời lượng đề xuất (tùy chọn)")
    description: str = Field(..., description="Hành động / hình ảnh diễn ra trong phân cảnh (giọng ngành, ngắn gọn, quay được)")

    character_ids: List[str] = Field(default_factory=list)
    prop_ids: List[str] = Field(default_factory=list)

    vfx: List[VFXNote] = Field(default_factory=list)
    sfx: List[str] = Field(default_factory=list, description="Gợi ý âm thanh, ví dụ footsteps, rain, explosion (tùy chọn)")
    dialogue_lines: List[DialogueLine] = Field(
        default_factory=list,
        description="Danh sách thoại trong phân cảnh này (cấu trúc: người nói, đối tượng, cảm xúc, voice-over/điện thoại, v.v., thời điểm)",
    )
    dialogue: Optional[str] = Field(None, description="[Tương thích] Nếu phân cảnh này mang lời thoại quan trọng, có thể trích dẫn/tóm tắt (tùy chọn)")

    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Căn cứ nguyên văn tương ứng (tùy chọn)")


class ProjectCinematicBreakdown(BaseModel):
    """toàn bộ phân cảnh điện ảnh trích từ tiểu thuyết:thông tin meta, bảng thực thể, bảng bối cảnh, bảng shot, bảng chuyển cảnh và các mục chưa rõ."""

    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(..., description="tiểu thuyết/định danh tiểu thuyết/chương, ví dụ novel_x_ch05")
    source_title: Optional[str] = Field(None, description="Tên sách/tên chương (trích từ trang tên sách hoặc tiêu đề chương)")
    source_author: Optional[str] = Field(None, description="Tác giả (nếu trích được từ văn bản)")
    language: Optional[str] = Field(None, description="Ví dụ zh, en, tiện cho prompt và tách từ sau này")
    extraction_version: Optional[str] = Field(None, description="Phiên bản bộ trích xuất lần này, thuận tiện truy vết sự khác biệt")
    schema_version: Optional[str] = Field(None, description="Phiên bản schema sử dụng cho đầu ra này")

    chunks: List[str] = Field(default_factory=list, description="xử lý trong lần này chunk_id danh sách")

    characters: List[Character] = Field(default_factory=list)
    locations: List[Location] = Field(default_factory=list)
    props: List[Prop] = Field(default_factory=list)

    scenes: List[Scene] = Field(default_factory=list)
    shots: List[Shot] = Field(default_factory=list)
    transitions: List[Transition] = Field(default_factory=list)

    notes: List[str] = Field(default_factory=list, description="Ghi chú chung/điểm chưa chắc chắn (tùy chọn)")
    uncertainties: List[Uncertainty] = Field(
        default_factory=list,
        description="mục chưa rõ cấu trúc:field_path, reason, evidence",
    )


# ---------- Skill Results (API-level) ----------
class TextChunk(BaseModel):
    """Khối văn bản đầu vào. chunk_id được viết vào EvidenceSpan.chunk_id để truy vấn lại."""

    model_config = ConfigDict(extra="forbid")

    chunk_id: str = Field(..., description="Ví dụ chapter1_p03 / ch05_para12")
    text: str = Field(..., description="Văn bản nguyên của chunk này")


class FilmEntityExtractionResult(BaseModel):
    """Kết quả trích xuất thực thể (tái dụng Character/Location/Prop/Uncertainty)."""

    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(..., description="tiểu thuyết/định danh tiểu thuyết/chương, ví dụ novel_x_ch05")
    language: Optional[str] = Field(None, description="như zh/en (tùy chọn)")
    extraction_version: Optional[str] = Field(None, description="Phiên bộ trích xuất (tùy chọn)")
    schema_version: Optional[str] = Field(None, description="Phiên bản schemas (tùy chọn)")

    chunks: List[str] = Field(default_factory=list, description="xử lý trong lần này chunk_id danh sách")

    characters: List[Character] = Field(default_factory=list)
    locations: List[Location] = Field(default_factory=list)
    props: List[Prop] = Field(default_factory=list)

    notes: List[str] = Field(default_factory=list, description="Ghi chú toàn cục (tùy chọn)")
    uncertainties: List[Uncertainty] = Field(default_factory=list, description="Các mục không chắc chắn có cấu trúc")


class FilmShotlistResult(BaseModel):
    """xuất phân cảnh(dùng lại trực tiếp ProjectCinematicBreakdown)."""

    model_config = ConfigDict(extra="forbid")

    breakdown: ProjectCinematicBreakdown = Field(..., description="Kết quả phân tích thành phim")


__all__ = [
    "Character",
    "Location",
    "Prop",
    "Scene",
    "Shot",
    "ProjectCinematicBreakdown",
    "TextChunk",
    "FilmEntityExtractionResult",
    "FilmShotlistResult",
]

