from __future__ import annotations

from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ShotFramePromptInput(BaseModel):
    """đầu vào sinh prompt khung shot, đối chiếu với trường của Shot + ShotDetail."""

    model_config = ConfigDict(extra="forbid")

    script_excerpt: str = Field(..., description="Trích đoạn kịch bản, tương ứng với Shot.script_excerpt")
    title: str = Field("", description="Tiêu đề phân cảnh, tương ứng Shot.title")
    visual_style: Optional[str] = Field(None, description="Hình thức biểu diễn khung hình (hiện thực/hoạt hình, v.v.)")
    style: Optional[str] = Field(None, description="Thể loại/phong cách")
    unify_style: Optional[bool] = Field(None, description="Có yêu cầu các phân cảnh thống nhất kế thừa phong cách dự án không")
    camera_shot: Optional[str] = Field(None, description="Độ rộng phân cảnh, ví dụ ECU/CU/MS")
    angle: Optional[str] = Field(None, description="Góc máy")
    movement: Optional[str] = Field(None, description="Chuyển động máy")
    atmosphere: Optional[str] = Field(None, description="Mô tả không khí")
    shot_description: Optional[str] = Field(None, description="Mô tả tổng thể phân cảnh hoặc giải thích bổ sung")
    mood_tags: Optional[List[str]] = Field(None, description="nhãn cảm xúc")
    vfx_type: Optional[str] = Field(None, description="Loại hiệu ứng đặc biệt")
    vfx_note: Optional[str] = Field(None, description="Giải thích hiệu ứng đặc biệt")
    duration: Optional[int] = Field(None, description="Thời lượng (giây)")
    scene_id: Optional[str] = Field(None, description="ID bối cảnh liên kết")
    dialog_summary: Optional[str] = Field(None, description="tóm tắt thoại")
    action_beats: Optional[List[str]] = Field(None, description="Các mốc hành động được sắp xếp theo trình tự thời gian")
    action_beat_phases: Optional[str] = Field(None, description="Tóm tắt giai đoạn của mốc hành động, ví dụ trigger / peak / aftermath")
    selected_action_beat_phase: Optional[str] = Field(None, description="Giai đoạn hành động ưu tiên tiêu thụ của khung hình hiện tại")
    selected_action_beat_text: Optional[str] = Field(None, description="Nguyên văn mốc hành động ưu tiên tiêu thụ của khung hình hiện tại")
    character_context: Optional[str] = Field(None, description="Nhân vật và mô tả đã xác nhận của phân cảnh")
    scene_context: Optional[str] = Field(None, description="Bối cảnh và mô tả đã xác nhận của phân cảnh")
    prop_context: Optional[str] = Field(None, description="Đạo cụ và mô tả đã xác nhận của phân cảnh")
    costume_context: Optional[str] = Field(None, description="Trang phục và mô tả đã xác nhận của phân cảnh")
    subject_priority: Optional[str] = Field(None, description="Gợi ý ưu tiên chủ thể, nêu rõ phân cảnh này nên ưu tiên viết ai, viết bối cảnh nào trước")
    previous_shot_title: Optional[str] = Field(None, description="Tiêu đề phân cảnh trước, dùng để tiếp nối tính liên tục")
    previous_shot_script_excerpt: Optional[str] = Field(None, description="Trích đoạn kịch bản của phân cảnh trước, dùng để tiếp nối mạch kịch")
    previous_shot_end_state: Optional[str] = Field(None, description="Tóm tắt trạng thái kết thúc phân cảnh trước")
    next_shot_title: Optional[str] = Field(None, description="Tiêu đề phân cảnh tiếp theo, dùng cho tiếp nối liên tục")
    next_shot_script_excerpt: Optional[str] = Field(None, description="Trích đoạn kịch bản phân cảnh tiếp theo, dùng để tiếp nối tính liên tục")
    next_shot_start_goal: Optional[str] = Field(None, description="Tóm tắt mục tiêu khởi đầu của phân cảnh tiếp theo")
    continuity_guidance: Optional[str] = Field(None, description="Gợi ý tiếp nối giữa phân cảnh hiện tại và phân cảnh lân cận")
    composition_anchor: Optional[str] = Field(None, description="Gợi ý bố cục khung hình và mỏ neo không gian")
    screen_direction_guidance: Optional[str] = Field(None, description="Gợi ý hướng nhìn, tầm mắt và trục trái-phải của nhân vật")
    frame_specific_guidance: Optional[str] = Field(None, description="Gợi ý tạo dựng riêng theo khung hình đầu / khung hình chính / khung hình cuối")
    director_command_summary: Optional[str] = Field(None, description="Tóm tắt chỉ đạo đạo diễn sau khi gộp, ràng buộc ưu tiên cao")
    retry_guidance: Optional[str] = Field(None, description="Yêu cầu hiệu đính kèm theo khi tự động thử lại")


class ShotFramePromptResult(BaseModel):
    """Kết quả tạo prompt khung hình phân cảnh: một chuỗi prompt."""

    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(..., description="Prompt mô tả hình ảnh, có thể ghi vào trường tương ứng của ShotDetail")
    debug_context: dict[str, Any] | None = Field(None, description="Ngữ cảnh dùng cho lần tạo này, thuận tiện tra cứu và gỡ lỗi")


__all__ = ["ShotFramePromptInput", "ShotFramePromptResult"]
