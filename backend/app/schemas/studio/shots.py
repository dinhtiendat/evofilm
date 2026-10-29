"""Các schemas liên quan phân cảnh: Shot / ShotDetail / ShotDialogLine / bảng Link."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.studio import (
    CameraAngle,
    CameraMovement,
    CameraShotType,
    DialogueLineMode,
    ShotFrameType,
    ShotCandidateStatus,
    ShotCandidateType,
    ShotDialogueCandidateStatus,
    ShotStatus,
    VFXType,
)


class ShotBase(BaseModel):
    id: str = Field(..., description="ID shot")
    chapter_id: str = Field(..., description="ID chương sở thuộc")
    index: int = Field(..., description="Thứ tự của phân cảnh (duy nhất trong chương)")
    title: str = Field(..., description="Tiêu đề phân cảnh")
    thumbnail: str = Field("", description="Ảnh thu nhỏ URL/Đường")
    status: ShotStatus = Field(ShotStatus.pending, description="trạng thái phân cảnh")
    skip_extraction: bool = Field(False, description="liệu bỏ qua trích xuất thông tin hay không")
    script_excerpt: str = Field("", description="Trích đoạn kịch bản")
    generated_video_file_id: str | None = Field(
        None,
        description="ID tệp liên kết video đã sinh(files.id, type=video)",
    )


class ShotExtractionSummaryRead(BaseModel):
    state: Literal[
        "not_extracted",
        "extracted_empty",
        "extracted_pending",
        "extracted_resolved",
        "skipped",
    ] = Field(..., description="Tóm tắt trạng thái xác nhận trích xuất của phân cảnh")
    has_extracted: bool = Field(..., description="Đã thực thi trích xuất chưa")
    last_extracted_at: datetime | None = Field(None, description="Thời điểm hoàn tất trích xuất gần nhất")
    asset_candidate_total: int = Field(0, description="Tổng số ứng viên tài nguyên")
    dialogue_candidate_total: int = Field(0, description="tổng số ứng viên thoại")
    pending_asset_count: int = Field(0, description="Số ứng viên tài nguyên chờ xác nhận")
    pending_dialogue_count: int = Field(0, description="số ứng viên thoại chờ xác nhận")


class ShotCreate(ShotBase):
    pass


class ShotUpdate(BaseModel):
    chapter_id: str | None = None
    index: int | None = None
    title: str | None = None
    thumbnail: str | None = None
    status: ShotStatus | None = None
    skip_extraction: bool | None = None
    script_excerpt: str | None = None
    generated_video_file_id: str | None = None


class ShotRead(ShotBase):
    last_extracted_at: datetime | None = Field(None, description="Thời điểm gần nhất hoàn tất trích xuất thông tin")
    extraction: ShotExtractionSummaryRead = Field(..., description="Tóm tắt trạng thái trích xuất phân cảnh")
    model_config = ConfigDict(from_attributes=True)


class ShotSkipExtractionUpdate(BaseModel):
    skip: bool = Field(..., description="Có rõ ràng bỏ qua việc trích xuất thông tin không")


class ShotExtractedCandidateLinkRequest(BaseModel):
    linked_entity_id: str = Field(..., description="ID thực thể đã xác nhận liên kết")


class ShotExtractedCandidateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="ID mục ứng viên")
    shot_id: str = Field(..., description="phân cảnh thuộc ID")
    candidate_type: ShotCandidateType = Field(..., description="loại ứng viên")
    candidate_name: str = Field(..., description="Tên ứng viên đã trích xuất")
    candidate_status: ShotCandidateStatus = Field(..., description="Trạng thái xác nhận ứng viên")
    linked_entity_id: str | None = Field(None, description="ID thực thể đã liên kết")
    source: str = Field(..., description="nguồn ứng viên")
    payload: dict = Field(default_factory=dict, description="thông tin bổ trợ cho ứng viên")
    confirmed_at: datetime | None = Field(None, description="Thời điểm xác nhận")
    created_at: datetime = Field(..., description="Thời gian tạo")
    updated_at: datetime = Field(..., description="Thời gian cập nhật")


class ShotExtractedDialogueCandidateAcceptRequest(BaseModel):
    index: int | None = Field(None, description="Thứ tự dùng khi ghi dòng thoại; để trống thì dùng thứ tự ứng viên")
    text: str | None = Field(None, description="Khi chấp nhận có thể ghi đè văn bản thoại")
    line_mode: DialogueLineMode | None = Field(None, description="Có thể ghi đè chế độ thoại khi chấp nhận")
    speaker_name: str | None = Field(None, description="khi chấp nhận có thể ghi đè tên nhân vật nói")
    target_name: str | None = Field(None, description="khi chấp nhận có thể ghi đè tên nhân vật nghe")


class ShotExtractedDialogueCandidateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="ID ứng viên thoại")
    shot_id: str = Field(..., description="phân cảnh thuộc ID")
    index: int = Field(..., description="thứ tự ứng viên thoại trong shot")
    text: str = Field(..., description="văn bản thoại đã trích xuất")
    line_mode: DialogueLineMode = Field(..., description="chế độ thoại")
    speaker_name: str | None = Field(None, description="tên nhân vật nói")
    target_name: str | None = Field(None, description="Tên nhân vật người nghe")
    candidate_status: ShotDialogueCandidateStatus = Field(..., description="Trạng thái xác nhận ứng viên lời thoại")
    linked_dialog_line_id: int | None = Field(None, description="ID dòng thoại được liên kết sau khi chấp nhận")
    source: str = Field(..., description="nguồn ứng viên")
    payload: dict = Field(default_factory=dict, description="thông tin bổ trợ cho ứng viên")
    confirmed_at: datetime | None = Field(None, description="Thời điểm xác nhận")
    created_at: datetime = Field(..., description="Thời gian tạo")
    updated_at: datetime = Field(..., description="Thời gian cập nhật")


class ShotDetailBase(BaseModel):
    id: str = Field(..., description="ID phân cảnh (chia sẻ khóa chính với shots.id)")
    camera_shot: CameraShotType = Field(..., description="Cận (độ rộng shot)")
    angle: CameraAngle = Field(..., description="Góc máy")
    movement: CameraMovement = Field(..., description="Chuyển động máy")
    scene_id: str | None = Field(None, description="ID bối cảnh liên kết (để trống được)")
    duration: int = Field(0, description="thời lượng(giây)")
    override_video_ratio: str | None = Field(None, description="Ghi đè tỷ lệ video cấp phân cảnh; để trống nghĩa là kế thừa mặc định của dự án")
    mood_tags: list[str] = Field(default_factory=list, description="Nhãn cảm xúc")
    atmosphere: str = Field("", description="Mô tả không khí")
    follow_atmosphere: bool = Field(True, description="Có kế thừa không khí không")
    has_bgm: bool = Field(False, description="Có chứa BGM không")
    vfx_type: VFXType = Field(VFXType.none, description="Loại hiệu ứng đặc biệt")
    vfx_note: str = Field("", description="giải thích effect hình ảnh")
    action_beats: list[str] = Field(default_factory=list, description="Các mốc hành động (sắp xếp theo trình tự thời gian)")
    first_frame_prompt: str = Field(
        "",
        description="Prompt khung hình đầu của phân cảnh shot",
    )
    last_frame_prompt: str = Field(
        "",
        description="Prompt khung hình cuối của phân cảnh shot",
    )
    key_frame_prompt: str = Field(
        "",
        description="Prompt khung hình chính của phân cảnh shot",
    )


class ShotDetailCreate(ShotDetailBase):
    pass


class ShotDetailUpdate(BaseModel):
    camera_shot: CameraShotType | None = None
    angle: CameraAngle | None = None
    movement: CameraMovement | None = None
    scene_id: str | None = None
    duration: int | None = None
    override_video_ratio: str | None = None
    mood_tags: list[str] | None = None
    atmosphere: str | None = None
    follow_atmosphere: bool | None = None
    has_bgm: bool | None = None
    vfx_type: VFXType | None = None
    vfx_note: str | None = None
    action_beats: list[str] | None = None
    first_frame_prompt: str | None = None
    last_frame_prompt: str | None = None
    key_frame_prompt: str | None = None


class ShotDetailRead(ShotDetailBase):
    model_config = ConfigDict(from_attributes=True)


class ShotDialogLineBase(BaseModel):
    id: int = Field(..., description="ID dòng hội thoại")
    shot_detail_id: str = Field(..., description="chi tiết phân cảnh thuộc ID")
    index: int = Field(0, description="số dòng(thứ tự trong shot)")
    text: str = Field(..., description="Nội dung lời thoại")
    line_mode: DialogueLineMode = Field(DialogueLineMode.dialogue, description="Chế độ lời thoại")
    speaker_character_id: str | None = Field(None, description="ID nhân vật nói")
    target_character_id: str | None = Field(None, description="ID nhân vật người nghe")
    speaker_name: str | None = Field(None, description="Tên nhân vật nói (dùng để ghi ngược liên kết; null được)")
    target_name: str | None = Field(None, description="Tên nhân vật người nghe (dùng để ghi ngược liên kết; null được)")


class ShotDialogLineCreate(BaseModel):
    shot_detail_id: str
    index: int = 0
    text: str
    line_mode: DialogueLineMode = DialogueLineMode.dialogue
    speaker_character_id: str | None = None
    target_character_id: str | None = None
    speaker_name: str | None = None
    target_name: str | None = None


class ShotDialogLineUpdate(BaseModel):
    index: int | None = None
    text: str | None = None
    line_mode: DialogueLineMode | None = None
    speaker_character_id: str | None = None
    target_character_id: str | None = None
    speaker_name: str | None = None
    target_name: str | None = None


class ShotDialogLineRead(ShotDialogLineBase):
    model_config = ConfigDict(from_attributes=True)


class ProjectLinkBase(BaseModel):
    id: int = Field(..., description="ID hàng liên kết")
    project_id: str = Field(..., description="ID dự án")
    chapter_id: str | None = Field(None, description="ID chương (để trống được)")
    shot_id: str | None = Field(None, description="ID phân cảnh (có thể để trống)")


class ProjectAssetLinkCreate(BaseModel):
    project_id: str
    chapter_id: str | None = None
    shot_id: str | None = None
    asset_id: str


class ProjectActorLinkRead(ProjectLinkBase):
    model_config = ConfigDict(from_attributes=True)

    actor_id: str
    thumbnail: str = Field("", description="URL tải về ảnh thu nhỏ diễn viên")


class ProjectSceneLinkRead(ProjectLinkBase):
    model_config = ConfigDict(from_attributes=True)

    scene_id: str
    thumbnail: str = Field("", description="URL tải về ảnh thu nhỏ bối cảnh")


class ProjectPropLinkRead(ProjectLinkBase):
    model_config = ConfigDict(from_attributes=True)

    prop_id: str
    thumbnail: str = Field("", description="URL tải về ảnh thu nhỏ đạo cụ")


class ProjectCostumeLinkRead(ProjectLinkBase):
    model_config = ConfigDict(from_attributes=True)

    costume_id: str
    thumbnail: str = Field("", description="URL tải về ảnh thu nhỏ trang phục")


class ShotFrameImageBase(BaseModel):
    id: int = Field(..., description="dòng hình ảnh ID")
    shot_detail_id: str = Field(..., description="chi tiết phân cảnh thuộc ID")
    frame_type: ShotFrameType = Field(..., description="Loại khung hình: first/last/key")
    file_id: str | None = Field(None, description="ID FileItem liên kết (có thể để trống, cho phép tạo giữ chỗ trước)")
    width: int | None = Field(None, description="Rộng(px)")
    height: int | None = Field(None, description="Cao(px)")
    format: str = Field("png", description="Định dạng")


class ShotFrameImageCreate(BaseModel):
    shot_detail_id: str
    frame_type: ShotFrameType
    file_id: str | None = None
    width: int | None = None
    height: int | None = None
    format: str = "png"


class ShotFrameImageUpdate(BaseModel):
    frame_type: ShotFrameType | None = None
    file_id: str | None = None
    width: int | None = None
    height: int | None = None
    format: str | None = None


class ShotFrameImageRead(ShotFrameImageBase):
    model_config = ConfigDict(from_attributes=True)


ShotLinkedAssetType = Literal["character", "prop", "scene", "costume"]


class ShotLinkedAssetItem(BaseModel):
    """Mục tài nguyên liên kết được tổng hợp theo phân cảnh để trả về (nhân vật/đạo cụ/bối cảnh/trang phục)."""

    type: ShotLinkedAssetType = Field(..., description="Loại thực thể: character/prop/scene/costume")
    id: str = Field(..., description="thực thể ID( character_id/prop_id/scene_id/costume_id)")
    image_id: int | None = Field(
        None,
        description="ID của dòng image ứng với ảnh thu nhỏ tốt nhất (ví dụ PropImage.id); null nếu không có ảnh",
    )
    file_id: str | None = Field(
        None,
        description="File ID của ảnh thu nhỏ tối ưu (files.id); dùng cho đầu vào ảnh tham chiếu; không có ảnh thì null",
    )
    name: str = Field(..., description="Tên thực thể")
    thumbnail: str = Field("", description="Đường dẫn tải ảnh thu nhỏ (/api/v1/studio/files/{file_id}/download)")


class ShotFramePromptMappingRead(BaseModel):
    """Quan hệ ánh xạ ảnh sau khi render prompt khung hình chính."""

    token: str = Field(..., description="token giữ chỗ cho ảnh trong prompt, như 图1 / 图2")
    type: ShotLinkedAssetType = Field(..., description="Loại thực thể: character/prop/scene/costume")
    id: str = Field(..., description="thực thể ID( character_id/prop_id/scene_id/costume_id)")
    name: str = Field(..., description="Tên thực thể")
    file_id: str = Field(..., description="File ID dùng cho lần kết xuất và tạo này")


class FrameGuidanceDecisionRead(BaseModel):
    """Kết quả quyết định giữ lại/nén guidance của khung hình phân cảnh."""

    text: str = Field(..., description="Nguyên văn guidance")
    category: str = Field(..., description="Hạng mục guidance, ví dụ summary / continuity / composition / screen")
    reason_tag: str = Field("", description="nhãn lý do ngắn gọn, như Giữ không gian ở khung đầu / Giữ trục kịch ở khung chính")
    reason: str = Field(..., description="giải thích lý do guidance này được giữ lại hay nén")


class RenderedShotFramePromptRead(BaseModel):
    """Kết quả render prompt tạo cuối cùng của khung hình chính."""

    base_prompt: str = Field(..., description="prompt cơ sở gốc (không bao gồm diễn giải ánh xạ hình ảnh)")
    rendered_prompt: str = Field(..., description="Prompt cuối cùng gửi cho mô hình (kèm giải thích ánh xạ hình ảnh)")
    selected_guidance: list[str] = Field(default_factory=list, description="Danh sách guidance thực sự giữ lại trong prompt cuối cùng")
    dropped_guidance: list[str] = Field(default_factory=list, description="Danh sách guidance bị nén bớt trong lần kết xuất này")
    selected_guidance_details: list[FrameGuidanceDecisionRead] = Field(default_factory=list, description="Chi tiết quyết định của guidance giữ lại cuối cùng")
    dropped_guidance_details: list[FrameGuidanceDecisionRead] = Field(default_factory=list, description="Chi tiết quyết định của guidance bị nén bớt")
    images: list[str] = Field(default_factory=list, description="Danh sách file_id ảnh tham chiếu cuối cùng, thứ tự khớp với mappings")
    mappings: list[ShotFramePromptMappingRead] = Field(
        default_factory=list,
        description="quan hệ ánh xạ giữa ảnh và tên thực thể, thứ tự hoàn toàn nhất quán với images",
    )


ShotAssetOverviewSource = Literal["linked", "candidate", "both"]


class ShotAssetOverviewItem(BaseModel):
    """Mục tổng quan tài nguyên phân cảnh: thống nhất trả về view hợp nhất của tài nguyên đã liên kết và ứng viên trích xuất."""

    key: str = Field(..., description="Khóa gộp: type:name")
    type: ShotLinkedAssetType = Field(..., description="Loại thực thể: character/prop/scene/costume")
    name: str = Field(..., description="Tên tài nguyên")
    description: str | None = Field(None, description="Mô tả ứng viên (lấy từ payload trích xuất)")
    thumbnail: str | None = Field(None, description="Ảnh thu nhỏ")
    file_id: str | None = Field(None, description="ID tệp ảnh thu nhỏ hoặc ảnh tham chiếu")

    source: ShotAssetOverviewSource = Field(..., description="Nguồn: linked/candidate/both")
    candidate_id: int | None = Field(None, description="ID ứng viên")
    candidate_status: ShotCandidateStatus | None = Field(None, description="Trạng thái xác nhận ứng viên")

    linked_entity_id: str | None = Field(None, description="ID thực thể đã liên kết hiện tại")
    linked_image_id: int | None = Field(None, description="ID dòng image của thực thể đã liên kết hiện tại")
    is_linked: bool = Field(..., description="Hiện tại đã được liên kết tới phân cảnh chưa")


class ShotAssetsOverviewSummary(BaseModel):
    linked_count: int = Field(..., description="Số mục đã liên kết")
    pending_count: int = Field(..., description="Số lượng ứng viên chờ xác nhận")
    ignored_count: int = Field(..., description="Số lượng ứng viên đã bỏ qua")
    total_count: int = Field(..., description="Tổng số mục (gồm cả ignored)")


class ShotAssetsOverviewRead(BaseModel):
    shot_id: str = Field(..., description="ID phân cảnh")
    skip_extraction: bool = Field(..., description="Có rõ ràng bỏ qua trích xuất không")
    status: ShotStatus = Field(..., description="Trạng thái quy trình của phân cảnh")
    summary: ShotAssetsOverviewSummary = Field(..., description="Thống kê tổng quan")
    items: list[ShotAssetOverviewItem] = Field(default_factory=list, description="Mục tổng quan tài nguyên")


class ShotPreparationLinkEntityType(str, Enum):
    character = "character"
    scene = "scene"
    prop = "prop"
    costume = "costume"


class ShotPreparationLinkRequest(BaseModel):
    project_id: str = Field(..., description="ID dự án")
    chapter_id: str = Field(..., description="ID chương")
    entity_type: ShotPreparationLinkEntityType = Field(..., description="Loại thực thể liên kết của trang chuẩn bị")
    linked_entity_id: str = Field(..., description="ID thực thể cần liên kết")


class ActionBeatPhaseRead(BaseModel):
    """Kết quả suy luận giai đoạn nhẹ của mốc hành động."""

    text: str = Field(..., description="nguyên văn mốc hành động")
    phase: Literal["trigger", "peak", "aftermath"] = Field(..., description="Giai đoạn suy luận: kích hoạt / đỉnh / khép lại")


class ShotPreparationStateRead(BaseModel):
    """Trạng thái tổng hợp trang chuẩn bị phân cảnh."""

    shot: ShotRead = Field(..., description="Trạng thái mới nhất của phân cảnh hiện tại")
    assets_overview: ShotAssetsOverviewRead = Field(..., description="Trạng thái tổng hợp khu vực xác nhận tài nguyên")
    dialogue_candidates: list[ShotExtractedDialogueCandidateRead] = Field(
        default_factory=list,
        description="Ứng viên thoại đang chờ xử lý/đã tồn tại hiện tại",
    )
    saved_dialogue_lines: list[ShotDialogLineRead] = Field(
        default_factory=list,
        description="Dòng lời thoại đã lưu hiện tại",
    )
    pending_confirm_count: int = Field(..., description="Tổng số mục vẫn chờ xác nhận hiện tại (tài nguyên + thoại)")
    basic_info_ready: bool = Field(..., description="liệu tiêu đề và trích đoạn kịch bản đã được bổ sung đủ hay chưa")
    semantic_defaults_ready: bool = Field(..., description="Giá trị mặc định ngôn ngữ điện ảnh đã được xác nhận chưa")
    action_beats_ready: bool = Field(..., description="liệu mốc hành động đã được xác nhận hay chưa")
    action_beats_count: int = Field(0, description="số mốc hành động đã xác nhận hiện tại")
    action_beat_phases: list[ActionBeatPhaseRead] = Field(default_factory=list, description="Kết quả suy luận giai đoạn của mốc hành động hiện tại")
    ready_for_generation: bool = Field(..., description="Phân cảnh hiện tại đã hoàn tất chuẩn bị, có thể vào khâu tạo tiếp theo chưa")


class ShotPreparationMutationAction(str, Enum):
    link_asset_candidate = "link_asset_candidate"
    ignore_asset_candidate = "ignore_asset_candidate"
    accept_dialogue_candidate = "accept_dialogue_candidate"
    ignore_dialogue_candidate = "ignore_dialogue_candidate"
    skip_extraction = "skip_extraction"
    resume_extraction = "resume_extraction"


class ShotPreparationMutationResultRead(BaseModel):
    """Phản hồi thống nhất sau khi thực thi lệnh của trang chuẩn bị."""

    action: ShotPreparationMutationAction = Field(..., description="Thao tác trang chuẩn bị được thực thi lần này")
    state: ShotPreparationStateRead = Field(..., description="Trạng thái tổng hợp mới nhất của trang chuẩn bị sau khi thao tác hoàn tất")


class ShotPromptAssetRef(BaseModel):
    """Tham chiếu tài nguyên của phân cảnh dùng cho render prompt."""

    type: ShotLinkedAssetType = Field(..., description="Loại tài nguyên")
    name: str = Field(..., description="Tên tài nguyên")
    description: str = Field("", description="Mô tả tài nguyên hoặc mô tả ứng viên trích xuất")
    file_id: str | None = Field(None, description="ID tệp có thể dùng làm ảnh tham chiếu")
    thumbnail: str | None = Field(None, description="Ảnh thu nhỏ")


class ShotPromptCameraInfo(BaseModel):
    """Thông tin ngôn ngữ điện ảnh dùng cho render prompt."""

    camera_shot: str = Field("", description="cận (độ rộng shot)")
    angle: str = Field("", description="góc máy")
    movement: str = Field("", description="cách vận camera")
    duration: int | None = Field(None, description="Thời lượng phân cảnh (giây)")


class ShotVideoPromptPackRead(BaseModel):
    """Gói ngữ cảnh chuẩn trước khi render prompt video."""

    shot_id: str = Field(..., description="ID phân cảnh")
    title: str = Field("", description="tiêu đề shot")
    script_excerpt: str = Field("", description="Trích đoạn kịch bản")
    action_beats: list[str] = Field(default_factory=list, description="Điểm chính của hành động/bối cảnh")
    action_beat_phases: list[ActionBeatPhaseRead] = Field(default_factory=list, description="Kết quả suy luận giai đoạn của mốc hành động")
    previous_shot_summary: str = Field("", description="Tóm tắt phân cảnh trước, dùng cho ràng buộc liên tục của prompt")
    next_shot_goal: str = Field("", description="mục tiêu phân cảnh tiếp theo, dùng cho ràng buộc liên tục của prompt")
    continuity_guidance: str = Field("", description="gợi ý tiếp nối giữa phân cảnh hiện tại và phân cảnh liền kề")
    composition_anchor: str = Field("", description="gợi ý mỏ neo bố cục và không gian của phân cảnh hiện tại")
    screen_direction_guidance: str = Field("", description="Gợi ý hướng nhìn, tầm mắt và trục trái-phải của nhân vật trong phân cảnh hiện tại")
    dialogue_summary: str = Field("", description="Tóm tắt thoại")
    characters: list[ShotPromptAssetRef] = Field(default_factory=list, description="Tham chiếu nhân vật")
    scene: ShotPromptAssetRef | None = Field(None, description="tham chiếu bối cảnh")
    props: list[ShotPromptAssetRef] = Field(default_factory=list, description="Tham chiếu đạo cụ")
    costumes: list[ShotPromptAssetRef] = Field(default_factory=list, description="Tham chiếu trang phục")
    camera: ShotPromptCameraInfo = Field(default_factory=ShotPromptCameraInfo, description="Ngôn ngữ điện ảnh")
    atmosphere: str = Field("", description="Mô tả không khí")
    visual_style: str = Field("", description="Phong cách thị giác của dự án")
    style: str = Field("", description="thể loại/phong cách dự án")
    negative_prompt: str = Field("", description="Prompt tiêu cực mặc định")


class ShotVideoPromptPreviewRead(BaseModel):
    """Kết quả xem trước prompt video."""

    shot_id: str = Field(..., description="ID phân cảnh")
    template_id: str | None = Field(None, description="ID mẫu prompt đang sử dụng")
    template_name: str | None = Field(None, description="tên mẫu prompt đang sử dụng")
    rendered_prompt: str = Field(..., description="Prompt sau khi kết xuất")
    pack: ShotVideoPromptPackRead = Field(..., description="gói ngữ cảnh kết xuất")
    warnings: list[str] = Field(default_factory=list, description="Thông báo không chặn phát hiện khi kết xuất")


class ShotVideoReadinessCheck(BaseModel):
    """Kết quả kiểm tra một mục độ sẵn sàng tạo video."""

    key: str = Field(..., description="key mục kiểm tra")
    ok: bool = Field(..., description="có đạt không")
    message: str = Field(..., description="Mô tả hiển thị cho phía trước")


class ShotVideoReadinessRead(BaseModel):
    """Độ sẵn sàng tạo video phân cảnh."""

    shot_id: str = Field(..., description="ID phân cảnh")
    reference_mode: str = Field(..., description="Chế độ tham chiếu")
    ready: bool = Field(..., description="Có thỏa điều kiện tạo video theo reference_mode hiện tại không")
    checks: list[ShotVideoReadinessCheck] = Field(default_factory=list, description="Mục kiểm tra độ sẵn sàng")


class ShotRuntimeSummaryRead(BaseModel):
    shot_id: str = Field(..., description="ID phân cảnh")
    has_active_tasks: bool = Field(..., description="liệu có tác vụ liên kết đang thực hiện hay không")
    has_active_video_tasks: bool = Field(..., description="Có tồn tại tác vụ video đang chạy không")
    has_active_prompt_tasks: bool = Field(..., description="Có tồn tại tác vụ prompt đang chạy không")
    has_active_frame_tasks: bool = Field(..., description="Có tồn tại tác vụ ảnh khung phân cảnh đang chạy không")
    active_task_count: int = Field(..., description="Số tác vụ duy nhất đang chạy")
