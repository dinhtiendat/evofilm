"""Cấu trúc và ánh xạ enum dùng chung cho đường pipeline xử lý video/kịch bản."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Common ----------
DialogueLineMode = Literal["DIALOGUE", "VOICE_OVER", "OFF_SCREEN", "PHONE"]


class EvidenceSpan(BaseModel):
    """bằng chứng truy vết được:định vị nguyên văn (chunk + vị trí bắt đầu/kết thúc/trích đoạn), dùng cho kiểm duyệt và tra lại."""

    model_config = ConfigDict(extra="forbid")

    chunk_id: str = Field(..., description="ID duy nhất của khối văn bản đầu vào (ví dụ chapter1_p03)")
    start_char: Optional[int] = Field(None, description="Vị trí ký tự bắt đầu trong chunk này (tùy chọn)")
    end_char: Optional[int] = Field(None, description="Vị trí ký tự kết thúc trong chunk đó (tùy chọn)")
    quote: Optional[str] = Field(None, description="Trích dẫn nguyên văn không quá 200 chữ (tùy chọn, tiện cho kiểm tra thủ công)")


class DialogueLine(BaseModel):
    """Đoạn thoại đơn: người nói/đối tượng, nội dung chính, cảm xúc và cách thể hiện, chế độ voice-over/điện thoại..., mốc thời điểm trong shot."""

    model_config = ConfigDict(extra="forbid")

    index: Optional[int] = Field(
        None,
        ge=0,
        description="Tùy chọn: thứ tự trong phân cảnh (chuỗi xử lý kịch bản dùng để giữ thứ tự gốc)"
    )
    speaker_character_id: Optional[str] = Field(None, description="ID nhân vật nói, nếu không xác định được có thể để trống")
    target_character_id: Optional[str] = Field(None, description="Nói với ai (ID nhân vật nghe), tùy chọn")
    text: str = Field(..., description="nội dung chính thoại")
    emotion: Optional[str] = Field(None, description="Cảm xúc / ngữ điệu (ví dụ: tức giận, điềm tĩnh, nghẹn ngào)")
    delivery: Optional[str] = Field(None, description="Cách thể hiện (ví dụ: thì thầm, gào thét, giọng kể song song)")
    line_mode: DialogueLineMode = Field(
        "DIALOGUE",
        description="DIALOGUE=thoại thường, VOICE_OVER=kể song song, OFF_SCREEN=giọng ngoại cảnh, PHONE=giọng điện thoại, v.v.",
    )
    start_time_sec: Optional[float] = Field(None, ge=0, description="Thời gian bắt đầu tương đối trong phân cảnh này (giây), dùng cho khớp khẩu hình / cắt phụ đề")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Căn cứ trong nguyên văn")


# ---------- Story / Scenes ----------
SceneTime = Literal["DAY", "NIGHT", "DAWN", "DUSK", "UNKNOWN"]
SceneInterior = Literal["INT", "EXT", "INT_EXT", "UNKNOWN"]


# ---------- Cinematic (Shots / Transitions / VFX) ----------
ShotType = Literal["ECU", "CU", "MCU", "MS", "MLS", "LS", "ELS"]
CameraAngle = Literal["EYE_LEVEL", "HIGH_ANGLE", "LOW_ANGLE", "BIRD_EYE", "DUTCH", "OVER_SHOULDER"]
CameraMovement = Literal[
    "STATIC",
    "PAN",
    "TILT",
    "DOLLY_IN",
    "DOLLY_OUT",
    "TRACK",
    "CRANE",
    "HANDHELD",
    "STEADICAM",
    "ZOOM_IN",
    "ZOOM_OUT",
]
TransitionType = Literal["CUT", "DISSOLVE", "WIPE", "FADE_IN", "FADE_OUT", "MATCH_CUT", "J_CUT", "L_CUT"]
VFXType = Literal[
    "NONE",
    "PARTICLES",
    "VOLUMETRIC_FOG",
    "CG_DOUBLE",
    "DIGITAL_ENVIRONMENT",
    "MATTE_PAINTING",
    "FIRE_SMOKE",
    "WATER_SIM",
    "DESTRUCTION",
    "ENERGY_MAGIC",
    "COMPOSITING_CLEANUP",
    "SLOW_MOTION_TIME",
    "OTHER",
]
ComplexityLevel = Literal["LOW", "MEDIUM", "HIGH"]


# ---------- ánh xạ enum Anh → Việt (thuật ngữ điện ảnh/phân cảnh) ----------
DIALOGUE_LINE_MODE_ZH: dict[str, str] = {
    "DIALOGUE": "Thoại",
    "VOICE_OVER": "Giọng tường thuật",
    "OFF_SCREEN": "Giọng ngoài khung hình",
    "PHONE": "Tiếng điện thoại",
}

SCENE_TIME_ZH: dict[str, str] = {
    "DAY": "Ngày",
    "NIGHT": "Đêm",
    "DAWN": "Bình minh",
    "DUSK": "Hoàng hôn",
    "UNKNOWN": "Không rõ",
}

SCENE_INTERIOR_ZH: dict[str, str] = {
    "INT": "Nội cảnh",
    "EXT": "Ngoài cảnh",
    "INT_EXT": "Vừa nội cảnh vừa ngoại cảnh",
    "UNKNOWN": "Không rõ",
}

SHOT_TYPE_ZH: dict[str, str] = {
    "ECU": "Đặc tả lớn",
    "CU": "Cận cảnh",
    "MCU": "Vừa gần",
    "MS": "Trung cảnh",
    "MLS": "Vừa xa",
    "LS": "Viễn cảnh",
    "ELS": "Xa lớn",
}

CAMERA_ANGLE_ZH: dict[str, str] = {
    "EYE_LEVEL": "Tầm mắt ngang",
    "HIGH_ANGLE": "Quay từ trên cao",
    "LOW_ANGLE": "Quay từ dưới lên",
    "BIRD_EYE": "Nhìn từ trên cao",
    "DUTCH": "Góc Hà Lan",
    "OVER_SHOULDER": "Qua vai",
}

CAMERA_MOVEMENT_ZH: dict[str, str] = {
    "STATIC": "Cố định",
    "PAN": "Xoay ngang",
    "TILT": "Xoay trục",
    "DOLLY_IN": "Đẩy rail",
    "DOLLY_OUT": "Kéo rail",
    "TRACK": "quay theo",
    "CRANE": "nâng hạ",
    "HANDHELD": "Cầm tay",
    "STEADICAM": "Steadicam",
    "ZOOM_IN": "Đẩy zoom",
    "ZOOM_OUT": "Thu phóng xa lại",
}

TRANSITION_TYPE_ZH: dict[str, str] = {
    "CUT": "Cắt",
    "DISSOLVE": "Chồng hình",
    "WIPE": "Chuyển cảnh lau",
    "FADE_IN": "Mờ vào",
    "FADE_OUT": "Đuôi ra",
    "MATCH_CUT": "Cắt khớp (match cut)",
    "J_CUT": "Cắt J",
    "L_CUT": "Cắt L",
}

VFX_TYPE_ZH: dict[str, str] = {
    "NONE": "Không có",
    "PARTICLES": "Hạt",
    "VOLUMETRIC_FOG": "Sương thể tích",
    "CG_DOUBLE": "Thân số (digital double)",
    "DIGITAL_ENVIRONMENT": "bối cảnh số",
    "MATTE_PAINTING": "Sơn nền (matte painting)",
    "FIRE_SMOKE": "Hoa hỏa",
    "WATER_SIM": "Hiệu ứng nước",
    "DESTRUCTION": "Phá vỡ/dịch chuyển (destruction sim)",
    "ENERGY_MAGIC": "Năng lượng/Phép thuật",
    "COMPOSITING_CLEANUP": "ghép ảnh/sửa bẩn",
    "SLOW_MOTION_TIME": "quay slow-motion/hành động chậm",
    "OTHER": "Khác",
}

COMPLEXITY_ZH: dict[str, str] = {
    "LOW": "Thấp",
    "MEDIUM": "Trung",
    "HIGH": "Cao",
}

PROP_CATEGORY_ZH: dict[str, str] = {
    "weapon": "Vũ khí",
    "document": "Văn giấy/chứng từ",
    "vehicle": "Phương tiện",
    "clothing": "Trang phục",
    "device": "Dụng cụ/thiết bị",
    "magic_item": "Phép thuật/Vật phẩm đặc biệt",
    "other": "Khác",
}


class VFXNote(BaseModel):
    """Mô tả VFX đơn: loại, mô tả, độ phức tạp và cơ sở từ nguyên văn."""

    model_config = ConfigDict(extra="forbid")

    vfx_type: VFXType = "NONE"
    description: Optional[str] = Field(None, description="Giải thích hiệu ứng đặc biệt (ngắn, thực thi được)")
    complexity: Optional[ComplexityLevel] = Field(None, description="Độ phức tạp sơ bộ")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Căn cứ nguyên văn (nếu trích xuất trung thực)")


class Transition(BaseModel):
    """Chuyển cảnh giữa các phân cảnh: từ phân cảnh nào sang phân cảnh nào, loại chuyển cảnh và mô tả tùy chọn."""

    model_config = ConfigDict(extra="forbid")

    from_shot_id: str
    to_shot_id: str
    transition: TransitionType = "CUT"
    note: Optional[str] = Field(None, description="Vì sao dùng cảnh chuyển này (tùy chọn)")


class Uncertainty(BaseModel):
    """Cấu trúc mục không chắc chắn: đường dẫn trường, nguyên nhân và bằng chứng tùy chọn, dễ xem xét và truy vết thủ công."""

    model_config = ConfigDict(extra="forbid")

    field_path: str = Field(..., description="Như characters[0].name, scenes[2].location_id")
    reason: str = Field(..., description="nêu ngắn nguyên nhân chưa rõ")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Căn cứ nguyên văn liên quan (tùy chọn)")


__all__ = [
    "DialogueLineMode",
    "EvidenceSpan",
    "DialogueLine",
    "SceneTime",
    "SceneInterior",
    "ShotType",
    "CameraAngle",
    "CameraMovement",
    "TransitionType",
    "VFXType",
    "ComplexityLevel",
    "DIALOGUE_LINE_MODE_ZH",
    "SCENE_TIME_ZH",
    "SCENE_INTERIOR_ZH",
    "SHOT_TYPE_ZH",
    "CAMERA_ANGLE_ZH",
    "CAMERA_MOVEMENT_ZH",
    "TRANSITION_TYPE_ZH",
    "VFX_TYPE_ZH",
    "COMPLEXITY_ZH",
    "PROP_CATEGORY_ZH",
    "VFXNote",
    "Transition",
    "Uncertainty",
]

