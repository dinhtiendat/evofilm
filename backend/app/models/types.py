from __future__ import annotations

from enum import Enum


class ProjectStyle(str, Enum):
    """Chiều kích thể loại/phong cách dự án (không dùng để phân biệt live-action/anime)."""

    # live_action: urban, scifi, period; anime: scifi, 3D, guoman, ink-wash
    real_people_city = "real_people_city"
    real_people_scifi = "real_people_scifi"
    real_people_ancient = "real_people_ancient"
    anime_scifi = "anime_scifi"
    anime_3d = "anime_3d"
    guoman = "guoman"
    ink_wash = "ink_wash"


class ProjectVisualStyle(str, Enum):
    """Chiều kích hình thức biểu diễn khung hình: dùng để phân biệt live_action/anime."""

    live_action = "live_action"
    anime = "anime"


class ChapterStatus(str, Enum):
    """Trạng thái sản xuất của chương.。"""

    draft = "draft"
    shooting = "shooting"
    done = "done"


class ShotStatus(str, Enum):
    """Trạng thái tạo của phân cảnh (gần với “dòng sản xuất” hơn là trạng thái cốt truyện)."""

    pending = "pending"
    generating = "generating"
    ready = "ready"


class ShotCandidateType(str, Enum):
    """Kiểu ứng viên trích xuất phân cảnh.。"""

    character = "character"
    scene = "scene"
    prop = "prop"
    costume = "costume"


class ShotCandidateStatus(str, Enum):
    """Trạng thái xác nhận ứng viên trích xuất phân cảnh.。"""

    pending = "pending"
    linked = "linked"
    ignored = "ignored"


class ShotDialogueCandidateStatus(str, Enum):
    """Trạng thái xác nhận ứng viên trích xuất thoại của phân cảnh.。"""

    pending = "pending"
    accepted = "accepted"
    ignored = "ignored"


class CameraShotType(str, Enum):
    """Cận (đồng bộ với `app.schemas.skills.common.ShotType`, lưu mã tiếng Anh)."""

    ecu = "ECU"  # Cận cực đại
    cu = "CU"  # Cận cảnh
    mcu = "MCU"  # Cận giữa
    ms = "MS"  # Trung cảnh
    mls = "MLS"  # Viễn giữa
    ls = "LS"  # Toàn cảnh
    els = "ELS"  # Siêu toàn cảnh


class CameraAngle(str, Enum):
    """Góc máy (đồng bộ với `app.schemas.skills.common.CameraAngle`, lưu mã tiếng Anh)."""

    eye_level = "EYE_LEVEL"  # tầm mắt ngang
    high_angle = "HIGH_ANGLE"  # góc cao
    low_angle = "LOW_ANGLE"  # góc thấp
    bird_eye = "BIRD_EYE"  # Nhìn từ trên cao
    dutch = "DUTCH"  # Góc nghiêng Hà Lan (Dutch angle)
    over_shoulder = "OVER_SHOULDER"  # Qua vai


class CameraMovement(str, Enum):
    """Cách chuyển động máy (đồng bộ với `app.schemas.skills.common.CameraMovement`, lưu code tiếng Anh)."""

    static = "STATIC"  # đứng yên
    pan = "PAN"  # Dịch ngang
    tilt = "TILT"  # Nghiêng
    dolly_in = "DOLLY_IN"  # Thu nhỏ (đẩy vào)
    dolly_out = "DOLLY_OUT"  # thu xa
    track = "TRACK"  # Ray trượt (track)
    crane = "CRANE"  # Cẩu quay
    handheld = "HANDHELD"  # Cầm tay
    steadicam = "STEADICAM"  # gimble ổn định hình
    zoom_in = "ZOOM_IN"
    zoom_out = "ZOOM_OUT"  # Thu nhỏ (đẩy vào)


class AssetQualityLevel(str, Enum):
    """Cấp độ chi tiết tài nguyên (từ thấp đến cao, dần bổ sung thêm ảnh góc/mô tả)."""

    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"
    ultra = "ULTRA"


class AssetViewAngle(str, Enum):
    """Góc ảnh của tài nguyên (dùng mô tả cùng một tài nguyên từ nhiều góc nhìn)."""

    front = "FRONT"
    left = "LEFT"
    right = "RIGHT"
    back = "BACK"
    three_quarter = "THREE_QUARTER"
    top = "TOP"
    detail = "DETAIL"


class ShotFrameType(str, Enum):
    """Loại khung phân cảnh của shot: khung hình đầu/khung hình cuối/khung hình chính."""

    first = "first"
    last = "last"
    key = "key"


class FileType(str, Enum):
    """Loại tệp (dùng cho thư viện tư liệu và tham chiếu trục thời gian)."""

    image = "image"
    video = "video"


class FileUsageKind(str, Enum):
    """mục đích của tệp trong chuỗi nghiệp vụ dự án(file_usages.usage_kind).（file_usages.usage_kind）。"""

    shot_frame = "shot_frame"
    generated_video = "generated_video"
    character_image = "character_image"
    asset_image = "asset_image"
    task_link = "task_link"
    upload = "upload"
    api = "api"


class TimelineClipType(str, Enum):
    """Loại phân mảnh trục thời gian (video/âm thanh)."""

    video = "video"
    audio = "audio"


class DialogueLineMode(str, Enum):
    """Chế độ thoại (đồng bộ với `app.schemas.skills.common.DialogueLineMode`, lưu code tiếng Anh)."""

    dialogue = "DIALOGUE"  # Lời thoại
    voice_over = "VOICE_OVER"  # giọng ngoài hình
    off_screen = "OFF_SCREEN"  # giọng ngoài khung hình
    phone = "PHONE"  # Tiếng điện thoại


class VFXType(str, Enum):
    """Loại hiệu ứng đặc biệt (đồng bộ với `app.schemas.skills.common.VFXType`, lưu mã tiếng Anh)."""

    none = "NONE"  # Không
    particles = "PARTICLES"  # hạt
    volumetric_fog = "VOLUMETRIC_FOG"  # Sương volumetric
    cg_double = "CG_DOUBLE"  # người đại diện số
    digital_environment = "DIGITAL_ENVIRONMENT"  # Bối cảnh số
    matte_painting = "MATTE_PAINTING"  # Vẽ bối cảnh
    fire_smoke = "FIRE_SMOKE"  # lửa khói
    water_sim = "WATER_SIM"  # hiệu ứng nước
    destruction = "DESTRUCTION"  # Vỡ vụn / mô phỏng vật lý
    energy_magic = "ENERGY_MAGIC"  # Năng lượng / ma pháp
    compositing_cleanup = "COMPOSITING_CLEANUP"  # Hợp thành/sửa bẩn
    slow_motion_time = "SLOW_MOTION_TIME"  # phim tốc độ cao/hành động chậm
    other = "OTHER"  # Khác


class PromptCategory(str, Enum):
    """Hạng mục mẫu prompt.。"""

    frame_head_image = "frame_head_image"
    frame_tail_image = "frame_tail_image"
    frame_key_image = "frame_key_image"
    frame_head_prompt = "frame_head_prompt"
    frame_tail_prompt = "frame_tail_prompt"
    frame_key_prompt = "frame_key_prompt"
    video_prompt = "video_prompt"
    storyboard_prompt = "storyboard_prompt"
    bgm = "bgm"
    sfx = "sfx"
    character_image_front = "character_image_front"
    character_image_other = "character_image_other"
    actor_image_front = "actor_image_front"
    actor_image_other = "actor_image_other"
    prop_image_front = "prop_image_front"
    prop_image_other = "prop_image_other"
    scene_image_front = "scene_image_front"
    scene_image_other = "scene_image_other"
    costume_image_front = "costume_image_front"
    costume_image_other = "costume_image_other"
    combined = "combined"
