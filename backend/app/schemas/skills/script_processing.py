"""mô hình xuất có cấu trúc của luồng xử lý kịch bản (phân cảnh, trích xuất yếu tố, ghép, tối ưu, nháp import...)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.studio import CameraAngle, CameraMovement, CameraShotType
from app.schemas.skills.common import DialogueLine, DialogueLineMode, EvidenceSpan
from app.schemas.skills.film import Character, Location, Prop, Scene, ProjectCinematicBreakdown


SceneTimeLoose = Literal["DAY", "NIGHT", "DAWN", "DUSK", "UNKNOWN", "日", "夜", "黎明", "黄昏", "不明", "未知"]


class ShotDivision(BaseModel):
    """Thông tin một phân cảnh trong kịch bản phân cảnh: số dòng + văn bản xem trước (ngữ nghĩa yếu tùy chọn)."""

    model_config = ConfigDict(extra="forbid")

    index: int = Field(..., ge=1, description="Số thứ tự phân cảnh (duy nhất trong chương)")
    start_line: int = Field(..., ge=1, description="start_line: int = Field(..., ge=1, description=số dòng bắt đầu (1-based))（1-based）")
    end_line: int = Field(..., ge=1, description="end_line: int = Field(..., ge=1, description=số dòng kết thúc (1-based))（1-based）")
    script_excerpt: str = Field(..., description="trích đoạn kịch bản/văn bản tương ứng với phân cảnh")

    shot_name: str = Field("", description="Tên phân cảnh (tên phân cảnh / tiêu đề phân cảnh)")
    time_of_day: Optional[SceneTimeLoose] = Field(None, description="Thời điểm trong ngày (ban ngày/ban đêm/không rõ..., tùy chọn)")


class ScriptDivisionResult(BaseModel):
    """Kết quả phân cảnh kịch bản: danh sách phân cảnh (số dòng bắt đầu/kết thúc mỗi cảnh + văn bản xem trước)."""

    model_config = ConfigDict(extra="forbid")

    shots: List[ShotDivision] = Field(default_factory=list, description="shots: List[ShotDivision] = Field(default_factory=list, description=Danh sách phân cảnh)")
    total_shots: int = Field(..., ge=0, description="total_shots: int = Field(..., ge=0, description=Tổng số phân cảnh)")
    notes: Optional[str] = Field(None, description="giải thích hoặc gợi ý tách (tùy chọn)")


class ShotCharacterInfo(BaseModel):
    """Thông tin trích xuất của một nhân vật trong một phân cảnh (ID yếu/truy vết được)."""

    model_config = ConfigDict(extra="forbid")

    character_key: str = Field(..., description="Khóa nhân vật (có thể là ID tạm thời hoặc tên đã chuẩn hóa; phân bổ ID ổn định ở giai đoạn gộp)")
    name_in_text: Optional[str] = Field(None, description="Cách ghi xuất hiện trong văn bản của phân cảnh này (tên thân mật/tên riêng...)")

    appearance: str = Field("", description="Mô tả ngoại hình: tuổi tác, thể hình, kiểu tóc, ngũ quan, sẹo, màu da, v.v.")
    clothing: str = Field("", description="Mô tả trang phục của phân cảnh này: kiểu dáng, màu sắc, chất liệu, trạng thái (hư hỏng, ướt sũng, dính bùn, v.v.)")
    accessories: str = Field("", description="Phụ kiện, kính, mũ, trang sức, v.v.")
    state: str = Field("", description="Trạng thái tạm thời của phân cảnh này: chủ đạo cảm xúc, bị thương, dính bẩn, mệt mỏi, v.v.")

    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Bằng chứng từ nguyên văn (tùy chọn)")
    raw_appearance_text: str = Field("", description="Đoạn kịch bản gốc dẫn đến trường appearance")
    raw_clothing_text: str = Field("", description="Đoạn kịch bản gốc dẫn đến trường clothing")
    raw_state_text: str = Field("", description="đoạn kịch bản gốc dẫn đến trường state")


class ShotPropInfo(BaseModel):
    """Thông tin trích xuất của một đạo cụ trong một phân cảnh (ID yếu/truy vết được)."""

    model_config = ConfigDict(extra="forbid")

    prop_key: str = Field(..., description="Khóa đạo cụ (có thể là ID tạm hoặc tên chuẩn hóa; pha hợp nhất mới gán ID ổn định)")
    name_in_text: Optional[str] = Field(None, description="name_in_text: Optional[str] = Field(None, description=Cách viết xuất hiện trong văn bản của phân cảnh này)")
    description: str = Field("", description="ngoại hình, chất liệu, màu sắc, kích thước, đánh dấu đặc biệt, v.v.")
    state: str = Field("", description="Trạng thái hiện tại: mới, hư hỏng, dính máu, mở/đóng, v.v.")
    interaction: str = Field("", description="cách sử dụng trong phân cảnh này: cầm lên, vứt đi, chỉ về phía, sử dụng, v.v.")

    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Bằng chứng từ nguyên văn (tùy chọn)")
    raw_text: str = Field("", description="raw_text: str = Field(, description=Đoạn văn bản gốc gây ra các mô tả phía trên)")


class ShotSceneInfo(BaseModel):
    """Mô tả bối cảnh của một phân cảnh (ID yếu/truy vết được)."""

    model_config = ConfigDict(extra="forbid")

    scene_key: str = Field(..., description="Khóa bối cảnh (có thể là ID tạm hoặc tên chuẩn hóa; pha hợp nhất mới gán ID ổn định)")
    name: Optional[str] = Field(None, description="Tên bối cảnh (tùy chọn)")
    location_detail: str = Field("", description="Mô tả địa điểm cụ thể: phòng khách cũ kỹ, phố trong mưa, nhà máy bỏ hoang, v.v.")
    atmosphere: str = Field("", description="Không khí, ánh sáng, tone màu, gợi ý âm thanh, v.v.")
    time_weather: str = Field("", description="bổ sung thời gian + thời tiết (nếu có trong văn bản)")

    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Bằng chứng từ nguyên văn (tùy chọn)")
    raw_description_text: str = Field("", description="raw_description_text: str = Field(, description=nguyên văn mô tả chính liên quan bối cảnh)")


class ShotElements(BaseModel):
    """Thông tin yếu tố trích xuất của một phân cảnh (chỉ mục + mức độ hạt mịn + thoại/hành động)."""

    model_config = ConfigDict(extra="forbid")

    character_keys: List[str] = Field(default_factory=list, description="Danh sách khóa nhân vật (ID yếu)")
    scene_keys: List[str] = Field(default_factory=list, description="Danh sách khóa bối cảnh (ID yếu)")
    costume_keys: List[str] = Field(default_factory=list, description="Danh sách khóa trang phục (ID yếu)")
    prop_keys: List[str] = Field(default_factory=list, description="Danh sách khóa đạo cụ (ID yếu)")

    characters_detailed: List[ShotCharacterInfo] = Field(default_factory=list, description="characters_detailed: List[ShotCharacterInfo] = Field(default_factory=list, description=Trích xuất chi tiết nhân vật)")
    props_detailed: List[ShotPropInfo] = Field(default_factory=list, description="props_detailed: List[ShotPropInfo] = Field(default_factory=list, description=Trích xuất chi tiết đạo cụ)")
    scene_detailed: Optional[ShotSceneInfo] = Field(None, description="scene_detailed: Optional[ShotSceneInfo] = Field(None, description=Trích xuất chi tiết bối cảnh)")

    dialogue_lines: List[DialogueLine] = Field(default_factory=list, description="dialogue_lines: List[DialogueLine] = Field(default_factory=list, description=Danh sách thoại có cấu trúc)")
    actions: List[str] = Field(default_factory=list, description="Mô tả hành động/bối cảnh")

    shot_type_hints: List[str] = Field(default_factory=list, description="Loại phân cảnh suy luận: close-up, wide-shot, tracking v.v.")
    confidence_breakdown: Dict[str, float] = Field(default_factory=dict, description="confidence_breakdown: Dict[str, float] = Field(default_factory=dict, description=Độ tin cậy theo từng hạng mục)")


class ShotElementExtractionResult(BaseModel):
    """Kết quả trích xuất thông tin một phân cảnh.。"""

    model_config = ConfigDict(extra="forbid")

    index: int = Field(..., ge=1, description="Số thứ tự phân cảnh (duy nhất trong chương)")
    shot_division: Optional[ShotDivision] = Field(None, description="Siêu dữ liệu phân cảnh (từ đầu ra của ScriptDivider)")
    elements: ShotElements = Field(..., description="elements: ShotElements = Field(..., description=Các phần tử đã trích xuất)")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="confidence: Optional[float] = Field(None, ge=0, le=1, description=Độ tin cậy trích xuất (0-1))（0-1）")
    notes: Optional[str] = Field(None, description="notes: Optional[str] = Field(None, description=Mô tả trích xuất hoặc mục không chắc chắn)")


class EntityVariant(BaseModel):
    """Mục biến thể thực thể (cấu trúc tối thiểu dùng được, thuận tiện cho diễn biến trang phục/ngoại hình)."""

    model_config = ConfigDict(extra="forbid")

    variant_key: str = Field(..., description="Khóa biến thể (ví dụ outfit_v1, wounded_state...)")
    description: Optional[str] = Field(None, description="mô tả biến thể (ngắn gọn)")
    affected_shots: List[int] = Field(default_factory=list, description="affected_shots: List[int] = Field(default_factory=list, description=Số thứ tự phân cảnh bị ảnh hưởng)")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Bằng chứng từ nguyên văn (tùy chọn)")


class EntityEntry(BaseModel):
    """Mục thực thể sau gộp (trạng thái trung gian của xử lý kịch bản)."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="ID ổn định của thực thể (gán ở giai đoạn gộp)")
    name: str = Field(..., description="name: str = Field(..., description=Tên thực thể)")
    type: Literal["character", "scene", "prop", "location"] = Field(..., description="type: Literal[character, scene, prop, location] = Field(..., description=Loại thực thể)")
    normalized_name: Optional[str] = Field(None, description="Tên chuẩn hóa (từ văn bản, tùy chọn)")
    aliases: List[str] = Field(default_factory=list, description="Tên khác/cách gọi (lấy từ văn bản, tùy chọn)")
    description: Optional[str] = Field(None, description="Chân dung / mô tả cơ bản (trung thành văn bản, ngắn)")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Độ chắc chắn gộp 0-1 (tùy chọn)")
    first_appearance: Optional[EvidenceSpan] = Field(None, description="Bằng chứng lần xuất hiện đầu tiên (tùy chọn)")

    costume_note: Optional[str] = Field(None, description="Mô tả trang phục/tạo hình (tùy chọn, thuận tiện cho liên kết biến thể và tài nguyên)")
    traits: List[str] = Field(default_factory=list, description="Từ tính cách / đặc điểm (tùy chọn)")

    location_type: Optional[str] = Field(None, description="Loại địa điểm: phòng/phố/rừng/toa xe... (tùy chọn)")

    category: Optional[str] = Field(None, description="Hạng mục đạo cụ (tùy chọn: weapon/document/vehicle/clothing/device/magic_item/other)")
    owner_character_id: Optional[str] = Field(None, description="ID nhân vật chủ sở hữu (tùy chọn)")

    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Đoạn dẫn chứng hỗ trợ hồ sơ thực thể này (tùy chọn)")
    first_shot: Optional[int] = Field(None, description="first_shot: Optional[int] = Field(None, description=số thứ tự phân cảnh xuất hiện lần đầu)")
    appearances: List[int] = Field(default_factory=list, description="appearances: List[int] = Field(default_factory=list, description=Danh sách phân cảnh xuất hiện)")
    variants: List[EntityVariant] = Field(default_factory=list, description="variants: List[EntityVariant] = Field(default_factory=list, description=Danh sách biến thể)")


class EntityLibrary(BaseModel):
    """Thư viện thực thể đã gộp (trạng thái trung gian xử lý kịch bản)."""

    model_config = ConfigDict(extra="forbid")

    characters: List[EntityEntry] = Field(default_factory=list, description="characters: List[EntityEntry] = Field(default_factory=list, description=Thư viện nhân vật)")
    locations: List[EntityEntry] = Field(default_factory=list, description="locations: List[EntityEntry] = Field(default_factory=list, description=Thư viện địa điểm)")
    scenes: List[EntityEntry] = Field(default_factory=list, description="scenes: List[EntityEntry] = Field(default_factory=list, description=Thư viện bối cảnh)")
    props: List[EntityEntry] = Field(default_factory=list, description="props: List[EntityEntry] = Field(default_factory=list, description=Thư viện đạo cụ)")
    total_entries: int = Field(..., ge=0, description="total_entries: int = Field(..., ge=0, description=Tổng số thực thể)")


class EntityMergeResult(BaseModel):
    """Kết quả gộp thực thể (trạng thái trung gian xử lý kịch bản)."""

    model_config = ConfigDict(extra="forbid")

    merged_library: EntityLibrary = Field(..., description="merged_library: EntityLibrary = Field(..., description=thư viện thực thể sau khi gộp)")
    merge_stats: Dict[str, Any] = Field(default_factory=dict, description="merge_stats: Dict[str, Any] = Field(default_factory=dict, description=Thông tin thống kê gộp)")
    conflicts: List[str] = Field(default_factory=list, description="Xung đột/mục đang chờ xử lý đã phát hiện")
    notes: Optional[str] = Field(None, description="notes: Optional[str] = Field(None, description=Mô tả gộp)")


class ConflictResolutionSuggestion(BaseModel):
    """Gợi ý giải quyết xung đột (dùng khi thử lại gộp)."""

    model_config = ConfigDict(extra="forbid")

    conflict: str = Field(..., description="Mô tả xung đột tương ứng với EntityMergeResult.conflicts (nguyên văn/không sửa đổi)")
    resolution: str = Field(..., description="Gợi ý xử lý (ví dụ: giữ lại tên nào / hợp nhất những thực thể nào / tách thành biến thể, v.v.)")
    entity_ids: List[str] = Field(default_factory=list, description="ID thực thể ổn định liên quan (nếu đã tồn tại)")
    preferred_entity_id: Optional[str] = Field(None, description="ID thực thể được đề xuất ưu tiên giữ lại (tùy chọn)")
    notes: Optional[str] = Field(None, description="Mô tả bổ sung (tùy chọn)")


class ScriptConsistencyIssue(BaseModel):
    """vấn đề nhất quán loại nhầm lẫn nhân vật:cùng một nhân vật ở các shot khác nhau được gán thân phận/chủ thể hành động khác nhau gây nhầm lẫn."""

    model_config = ConfigDict(extra="forbid")

    issue_type: Literal["character_confusion"] = Field("character_confusion", description="issue_type: Literal[character_confusion] = Field(character_confusion, description=Cố định là vấn đề nhầm lẫn nhân vật)")
    character_candidates: List[str] = Field(default_factory=list, description="Ứng viên nhân vật liên quan (tên / cách gọi / ID đều được, ưu tiên dùng cách gọi trong văn bản gốc)")
    description: str = Field(..., description="Mô tả vấn đề (tại sao bị nhầm lẫn)")
    suggestion: str = Field(..., description="Gợi ý sửa đổi (viết lại như thế nào để loại bỏ nhầm lẫn)")
    affected_lines: Optional[Dict[str, int]] = Field(None, description="Khoảng số dòng bị ảnh hưởng, dạng {start_line: x, end_line: y}")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Bằng chứng từ nguyên văn (tùy chọn)")


class ScriptConsistencyCheckResult(BaseModel):
    """Kết quả kiểm tra nhất quán dựa trên nguyên văn (tập trung vào nhầm lẫn nhân vật)."""

    model_config = ConfigDict(extra="forbid")

    issues: List[ScriptConsistencyIssue] = Field(default_factory=list, description="issues: List[ScriptConsistencyIssue] = Field(default_factory=list, description=Danh sách vấn đề)")
    has_issues: bool = Field(..., description="has_issues: bool = Field(..., description=Có phát hiện vấn đề không)")
    summary: Optional[str] = Field(None, description="Tóm tắt (tùy chọn)")


class ScriptOptimizationResult(BaseModel):
    """Đầu ra tối ưu kịch bản: chỉ dùng khi phát hiện vấn đề nhầm lẫn nhân vật."""

    model_config = ConfigDict(extra="forbid")

    optimized_script_text: str = Field(..., description="optimized_script_text: str = Field(..., description=văn bản kịch bản đã tối ưu)")
    change_summary: str = Field(..., description="tóm tắt thay đổi (chỉ xoay quanh issues)")


class ScriptSimplificationResult(BaseModel):
    """Đầu ra tinh giản kịch bản: rút ngắn dung lượng trong khi giữ vững cốt truyện chủ đạo và tính liên tục."""

    model_config = ConfigDict(extra="forbid")

    simplified_script_text: str = Field(..., description="simplified_script_text: str = Field(..., description=văn bản kịch bản đã rút gọn)")
    simplification_summary: str = Field(..., description="Tóm tắt chiến lược thu gọn (giải thích nguyên tắc lược bỏ/sửa đổi)")


class ScriptShotExtraction(BaseModel):
    """Kết quả trích xuất của một phân cảnh (dùng cho đầu ra cuối, tham chiếu ID ổn định của thực thể toàn cục)."""

    model_config = ConfigDict(extra="forbid")

    shot_index: int = Field(..., ge=1, description="Chỉ số phân cảnh (khớp với ScriptDivisionResult.shots.index)")
    shot_division: ShotDivision = Field(..., description="shot_division: ShotDivision = Field(..., description=thông tin metadata phân cảnh của phân cảnh này)")

    scene_id: Optional[str] = Field(None, description="ID bối cảnh sở thuộc (scene_###, nếu có thể xác định)")
    character_ids: List[str] = Field(default_factory=list, description="Danh sách ID nhân vật xuất hiện trong phân cảnh này (char_###)")
    prop_ids: List[str] = Field(default_factory=list, description="Danh sách ID đạo cụ quan trọng của phân cảnh này (prop_###)")
    location_ids: List[str] = Field(default_factory=list, description="Danh sách ID địa điểm liên kết của phân cảnh này (loc_###)")

    dialogue_lines: List[DialogueLine] = Field(default_factory=list, description="dialogue_lines: List[DialogueLine] = Field(default_factory=list, description=Danh sách thoại có cấu trúc)")
    actions: List[str] = Field(default_factory=list, description="Mô tả hành động/bối cảnh")
    notes: Optional[str] = Field(None, description="ghi chú bổ sung cho phân cảnh này (tùy chọn)")


class ScriptExtractionResult(BaseModel):
    """Đầu ra cuối: bảng thực thể toàn cục + liên kết theo từng phân cảnh (trích xuất thông tin chính là kết quả cuối cùng)."""

    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(..., description="danh định nguồn (như demo_script_001)")
    script_text: str = Field(..., description="Kịch bản đầu vào (có thể là phiên bản đã tối ưu)")
    division: ScriptDivisionResult = Field(..., description="division: ScriptDivisionResult = Field(..., description=kết quả phân cảnh)")

    characters: List[Character] = Field(default_factory=list, description="characters: List[Character] = Field(default_factory=list, description=Bảng nhân vật toàn cục)")
    locations: List[Location] = Field(default_factory=list, description="locations: List[Location] = Field(default_factory=list, description=Bảng địa điểm toàn cục)")
    props: List[Prop] = Field(default_factory=list, description="props: List[Prop] = Field(default_factory=list, description=Bảng đạo cụ toàn cục)")
    scenes: List[Scene] = Field(default_factory=list, description="Bảng bối cảnh toàn cục (có thể nhập tùy chọn)")

    shots: List[ScriptShotExtraction] = Field(default_factory=list, description="shots: List[ScriptShotExtraction] = Field(default_factory=list, description=Kết quả trích xuất và liên kết theo từng phân cảnh)")

    consistency: Optional[ScriptConsistencyCheckResult] = Field(None, description="Kết quả kiểm tra tính nhất quán (tùy chọn, full-process có thể truyền ngược)")


class StudioAssetDraft(BaseModel):
    """Studio Bản nháp tài nguyên của Studio (Scene/Prop/Costume).（Scene/Prop/Costume）。

    Khi API import không truyền id, phía server sẽ tạo; khi điền ngược chi tiết phân cảnh có thể kèm scene_id/prop_id/costume_id.
    """

    model_config = ConfigDict(extra="forbid")

    id: Optional[str] = Field(None, description="ID tài nguyên (truyền ngược sau khi đã lưu CSDL, ví dụ scene_id / prop_id / costume_id)")
    file_id: Optional[str] = Field(None, description="tệp liên kết ID(để trống được)")
    thumbnail: Optional[str] = Field(None, description="Đường dẫn tải ảnh thu nhỏ (để trống được)")
    name: str = Field(..., description="Tên (khuyến nghị duy nhất trong cùng dự án)")
    description: str = Field("", description="description: str = Field(, description=Mô tả)")
    tags: List[str] = Field(default_factory=list, description="tags: List[str] = Field(default_factory=list, description=nhãn)")
    prompt_template_id: Optional[str] = Field(None, description="ID mẫu prompt (để trống được)")
    view_count: int = Field(1, ge=1, description="view_count: int = Field(1, ge=1, description=Số ảnh góc nhìn dự kiến tạo)")


class StudioCharacterDraft(BaseModel):
    """Studio Bản nháp nhân vật Studio.。

    Import API không truyền id thì phía server sinh ra; khi ghi ngược chi tiết phân cảnh có thể kèm character_id.
    """

    model_config = ConfigDict(extra="forbid")

    id: Optional[str] = Field(None, description="ID nhân vật (nếu đã lưu CSDL thì ghi ngược character_id)")
    file_id: Optional[str] = Field(None, description="tệp liên kết ID(để trống được)")
    thumbnail: Optional[str] = Field(None, description="Đường dẫn tải ảnh thu nhỏ (để trống được)")
    index: Optional[int] = Field(None, description="index: Optional[int] = Field(None, description=Thứ tự nhân vật trong phân cảnh (shot_character_links.index))（shot_character_links.index）")
    name: str = Field(..., description="Tên nhân vật (khuyến nghị duy nhất trong cùng dự án)")
    description: str = Field("", description="description: str = Field(, description=Mô tả nhân vật)")
    tags: List[str] = Field(default_factory=list, description="Nhãn (tùy chọn)")
    costume_name: Optional[str] = Field(None, description="Tên trang phục (tùy chọn, ánh xạ sang costume_id khi nhập)")
    prop_names: List[str] = Field(default_factory=list, description="Danh sách tên đạo cụ thường dùng của nhân vật (tùy chọn)")


class StudioShotDraftDialogueLine(BaseModel):
    """Nháp thoại phân cảnh: speaker/target dùng name nhân vật, khi import ánh xạ sang character_id."""

    model_config = ConfigDict(extra="forbid")

    index: int = Field(0, ge=0, description="index: int = Field(0, ge=0, description=thứ tự trong shot)")
    text: str = Field(..., description="text: str = Field(..., description=Nội dung lời thoại)")
    line_mode: DialogueLineMode = Field("DIALOGUE", description="line_mode: DialogueLineMode = Field(DIALOGUE, description=Chế độ thoại)")
    speaker_name: Optional[str] = Field(None, description="Tên nhân vật nói (null được)")
    target_name: Optional[str] = Field(None, description="tên nhân vật nghe (để trống được)")


class ShotSemanticSuggestion(BaseModel):
    """Gợi ý ngữ nghĩa mặc định của phân cảnh: dùng để khởi tạo ngôn ngữ phân cảnh và mốc hành động ở giai đoạn chuẩn bị."""

    model_config = ConfigDict(extra="forbid")

    camera_shot: Optional[CameraShotType] = Field(None, description="camera_shot: Optional[CameraShotType] = Field(None, description=Gợi ý cận)")
    angle: Optional[CameraAngle] = Field(None, description="angle: Optional[CameraAngle] = Field(None, description=góc máy gợi ý)")
    movement: Optional[CameraMovement] = Field(None, description="movement: Optional[CameraMovement] = Field(None, description=Gợi ý chuyển động máy)")
    duration: Optional[int] = Field(None, ge=1, description="thời lượng gợi ý (giây)")
    action_beats: List[str] = Field(default_factory=list, description="action_beats: List[str] = Field(default_factory=list, description=Các mốc hành động được sắp xếp theo trình tự thời gian)")
    notes: Optional[str] = Field(None, description="notes: Optional[str] = Field(None, description=Giải thích các mục không chắc chắn)")


class StudioShotDraft(BaseModel):
    """nháp shot:không chứa shot_id, do API import sinh；thực thể tham chiếu dùng name."""

    model_config = ConfigDict(extra="forbid")

    index: int = Field(..., ge=1, description="Số thứ tự phân cảnh (duy nhất trong chương)")
    title: str = Field(..., description="title: str = Field(..., description=Tiêu đề phân cảnh)")
    script_excerpt: str = Field("", description="script_excerpt: str = Field(, description=Trích đoạn kịch bản)")

    scene_name: Optional[str] = Field(None, description="tên bối cảnh (tùy chọn)")
    character_names: List[str] = Field(default_factory=list, description="character_names: List[str] = Field(default_factory=list, description=Danh sách tên nhân vật xuất hiện trong phân cảnh này)")
    prop_names: List[str] = Field(default_factory=list, description="prop_names: List[str] = Field(default_factory=list, description=Danh sách tên đạo cụ quan trọng của phân cảnh này)")
    costume_names: List[str] = Field(default_factory=list, description="costume_names: List[str] = Field(default_factory=list, description=Danh sách tên trang phục của phân cảnh này)")

    dialogue_lines: List[StudioShotDraftDialogueLine] = Field(default_factory=list, description="dialogue_lines: List[StudioShotDraftDialogueLine] = Field(default_factory=list, description=Danh sách thoại)")
    actions: List[str] = Field(default_factory=list, description="Mô tả hành động/bối cảnh")
    semantic_suggestion: Optional[ShotSemanticSuggestion] = Field(
        None,
        description="description=Gợi ý mặc định ngôn ngữ phân cảnh và ứng viên mốc hành động,",
    )


class StudioScriptExtractionDraft(BaseModel):
    """Dùng để nhập bản nháp kết quả trích xuất của Studio (name-based)."""

    model_config = ConfigDict(extra="forbid")

    project_id: str = Field(..., description="ID dự án (bắt buộc)")
    chapter_id: str = Field(..., description="ID chương (bắt buộc, dùng để tạo shots/links)")
    script_text: str = Field(..., description="Văn bản kịch bản (có thể là phiên bản đã tối ưu)")

    characters: List[StudioCharacterDraft] = Field(default_factory=list)
    scenes: List[StudioAssetDraft] = Field(default_factory=list)
    props: List[StudioAssetDraft] = Field(default_factory=list)
    costumes: List[StudioAssetDraft] = Field(default_factory=list)

    shots: List[StudioShotDraft] = Field(default_factory=list, description="shots: List[StudioShotDraft] = Field(default_factory=list, description=Danh sách bản nháp phân cảnh)")


class CostumeTimelineEntry(BaseModel):
    """Mục trục thời gian tiến hóa trang phục của một nhân vật.。"""

    model_config = ConfigDict(extra="forbid")

    shot_index: int = Field(..., ge=1, description="shot_index: int = Field(..., ge=1, description=Thứ tự của phân cảnh)")
    scene_id: Optional[str] = Field(None, description="Tùy chọn: ID ổn định của bối cảnh sở hữu (nếu đã suy ra được)")
    costume_note: Optional[str] = Field(None, description="Điểm chính trang phục / ngoại hình (ngắn)")
    changes: List[str] = Field(default_factory=list, description="changes: List[str] = Field(default_factory=list, description=Điểm thay đổi so với mục trước đó)")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Bằng chứng từ nguyên văn (tùy chọn)")


class CostumeTimeline(BaseModel):
    """Trục thời gian biến đổi trang phục của một nhân vật.。"""

    model_config = ConfigDict(extra="forbid")

    character_id: str = Field(..., description="character_id: str = Field(..., description=ID ổn định của nhân vật)ID")
    character_name: str = Field(..., description="character_name: str = Field(..., description=Tên nhân vật)")
    timeline_entries: List[CostumeTimelineEntry] = Field(default_factory=list, description="timeline_entries: List[CostumeTimelineEntry] = Field(default_factory=list, description=Mục trên trục thời gian)")


class VariantSuggestion(BaseModel):
    """Gợi ý biến thể.。"""

    model_config = ConfigDict(extra="forbid")

    entity_id: str = Field(..., description="entity_id: str = Field(..., description=ID thực thể)ID")
    entity_name: str = Field(..., description="entity_name: str = Field(..., description=tên thực thể)")
    entity_type: str = Field(..., description="entity_type: str = Field(..., description=Loại thực thể (character/scene/prop/location))（character/scene/prop/location）")
    suggestion: str = Field(..., description="suggestion: str = Field(..., description=Mô tả gợi ý biến thể)")
    affected_shots: List[int] = Field(default_factory=list, description="affected_shots: List[int] = Field(default_factory=list, description=Các phân cảnh bị ảnh hưởng)")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Bằng chứng từ nguyên văn (tùy chọn)")


class VariantAnalysisResult(BaseModel):
    """Kết quả phân tích biến thể.。"""

    model_config = ConfigDict(extra="forbid")

    costume_timelines: List[CostumeTimeline] = Field(default_factory=list, description="costume_timelines: List[CostumeTimeline] = Field(default_factory=list, description=Trục thời gian biến đổi trang phục của từng nhân vật)")
    variant_suggestions: List[VariantSuggestion] = Field(default_factory=list, description="variant_suggestions: List[VariantSuggestion] = Field(default_factory=list, description=Danh sách gợi ý biến thể)")
    chapter_variants: Dict[str, List[str]] = Field(default_factory=dict, description="chapter_variants: Dict[str, List[str]] = Field(default_factory=dict, description=Gợi ý biến thể theo chương)")
    notes: Optional[str] = Field(None, description="notes: Optional[str] = Field(None, description=Mô tả phân tích)")


class ConsistencyWarning(BaseModel):
    """Cảnh báo kiểm tra tính nhất quán đơn lẻ.。"""

    model_config = ConfigDict(extra="forbid")

    warning_type: str = Field(..., description="Loại cảnh báo (character_name_conflict/location_inconsistency/v.v.)")
    severity: Literal["low", "medium", "high"] = Field(..., description="severity: Literal[low, medium, high] = Field(..., description=Mức độ nghiêm trọng)")
    description: str = Field(..., description="description: str = Field(..., description=mô tả vấn đề)")
    entity_ids: List[str] = Field(default_factory=list, description="entity_ids: List[str] = Field(default_factory=list, description=ID thực thể liên quan)ID")
    affected_shots: List[int] = Field(default_factory=list, description="affected_shots: List[int] = Field(default_factory=list, description=Số thứ tự phân cảnh bị ảnh hưởng)")
    affected_lines: Optional[Dict[str, int]] = Field(None, description="Tùy chọn: khoảng số dòng gợi ý chỉnh sửa, dạng {start_line: x, end_line: y}")
    suggestion: Optional[str] = Field(None, description="suggestion: Optional[str] = Field(None, description=Gợi ý chỉnh sửa)")
    evidence: List[EvidenceSpan] = Field(default_factory=list, description="Bằng chứng từ nguyên văn (tùy chọn)")


class ConsistencyCheckResult(BaseModel):
    """Kết quả kiểm tra tính nhất quán.。"""

    model_config = ConfigDict(extra="forbid")

    warnings: List[ConsistencyWarning] = Field(default_factory=list, description="warnings: List[ConsistencyWarning] = Field(default_factory=list, description=Danh sách cảnh báo)")
    total_issues: int = Field(..., ge=0, description="total_issues: int = Field(..., ge=0, description=Tổng số vấn đề)")
    critical_issues: int = Field(..., ge=0, description="critical_issues: int = Field(..., ge=0, description=Số lượng vấn đề nghiêm trọng (độ nghiêm high))（high severity）")
    consistency_score: float = Field(..., ge=0, le=100, description="consistency_score: float = Field(..., ge=0, le=100, description=Điểm nhất quán (0-100))（0-100）")
    notes: Optional[str] = Field(None, description="notes: Optional[str] = Field(None, description=Mô tả kiểm tra)")


class TableData(BaseModel):
    """Dữ liệu bảng có thể xuất trực tiếp.。"""

    model_config = ConfigDict(extra="forbid")

    table_type: str = Field(..., description="table_type: str = Field(..., description=Loại bảng (character_table/location_table/prop_table/shot_table))（character_table/location_table/prop_table/shot_table）")
    headers: List[str] = Field(..., description="headers: List[str] = Field(..., description=tiêu đề bảng)")
    rows: List[List[Any]] = Field(..., description="rows: List[List[Any]] = Field(..., description=Dữ liệu hàng)")
    row_count: int = Field(..., ge=0, description="row_count: int = Field(..., ge=0, description=Số dòng)")


class OutputCompileResult(BaseModel):
    """Kết quả biên dịch đầu ra cuối cùng.。"""

    model_config = ConfigDict(extra="forbid")

    project_json: ProjectCinematicBreakdown = Field(..., description="JSON đầy đủ của dự án (schema nghiêm ngặt)")
    tables: List[TableData] = Field(default_factory=list, description="tables: List[TableData] = Field(default_factory=list, description=Dữ liệu bảng có thể xuất)")
    export_stats: Dict[str, Any] = Field(default_factory=dict, description="export_stats: Dict[str, Any] = Field(default_factory=dict, description=Thông tin thống kê xuất)")
    summary: Optional[str] = Field(None, description="summary: Optional[str] = Field(None, description=Tóm tắt dự án)")


__all__ = [
    "ShotDivision",
    "ScriptDivisionResult",
    "ShotCharacterInfo",
    "ShotPropInfo",
    "ShotSceneInfo",
    "ShotElements",
    "ShotElementExtractionResult",
    "EntityVariant",
    "EntityEntry",
    "EntityLibrary",
    "EntityMergeResult",
    "ConflictResolutionSuggestion",
    "ScriptConsistencyIssue",
    "ScriptConsistencyCheckResult",
    "ScriptOptimizationResult",
    "ScriptSimplificationResult",
    "ScriptShotExtraction",
    "ScriptExtractionResult",
    "StudioAssetDraft",
    "StudioCharacterDraft",
    "StudioShotDraftDialogueLine",
    "StudioShotDraft",
    "StudioScriptExtractionDraft",
    "CostumeTimelineEntry",
    "CostumeTimeline",
    "VariantSuggestion",
    "VariantAnalysisResult",
    "ConsistencyWarning",
    "ConsistencyCheckResult",
    "TableData",
    "OutputCompileResult",
]
