"""Agent tạo prompt khung đầu/khung cuối/khung chính của cảnh: sinh prompt hình ảnh cho từng khung theo thông tin cảnh."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase, _extract_json_from_text
from app.schemas.skills.shot_frame_prompt import ShotFramePromptResult


def _prepare_shot_frame_input(input_dict: dict[str, Any]) -> dict[str, Any]:
    """Chuyển input_dict về định dạng mà template prompt cần, mood_tags chuyển thành chuỗi."""
    out = dict(input_dict)
    if "mood_tags" in out and isinstance(out["mood_tags"], list):
        out["mood_tags"] = ", ".join(str(t) for t in out["mood_tags"])
    else:
        out.setdefault("mood_tags", "")
    if "action_beats" in out and isinstance(out["action_beats"], list):
        out["action_beats"] = "；".join(str(item) for item in out["action_beats"] if str(item).strip())
    else:
        out.setdefault("action_beats", "")
    for key in (
        "visual_style",
        "style",
        "unify_style",
        "camera_shot",
        "angle",
        "movement",
        "atmosphere",
        "shot_description",
        "vfx_type",
        "vfx_note",
        "duration",
        "scene_id",
        "dialog_summary",
        "action_beats",
        "action_beat_phases",
        "selected_action_beat_phase",
        "selected_action_beat_text",
        "character_context",
        "scene_context",
        "prop_context",
        "costume_context",
        "subject_priority",
        "previous_shot_title",
        "previous_shot_script_excerpt",
        "previous_shot_end_state",
        "next_shot_title",
        "next_shot_script_excerpt",
        "next_shot_start_goal",
        "continuity_guidance",
        "composition_anchor",
        "screen_direction_guidance",
        "frame_specific_guidance",
        "director_command_summary",
        "retry_guidance",
    ):
        if key not in out or out[key] is None:
            out[key] = ""
    if isinstance(out.get("unify_style"), bool):
        out["unify_style"] = "Có" if out["unify_style"] else "Không"
    out.setdefault("title", "")
    return out


_SHOT_FRAME_INPUT_VARS = [
    "script_excerpt",
    "title",
    "visual_style",
    "style",
    "unify_style",
    "camera_shot",
    "angle",
    "movement",
    "atmosphere",
    "shot_description",
    "mood_tags",
    "vfx_type",
    "vfx_note",
    "duration",
    "scene_id",
    "dialog_summary",
    "action_beats",
    "action_beat_phases",
    "selected_action_beat_phase",
    "selected_action_beat_text",
    "character_context",
    "scene_context",
    "prop_context",
    "costume_context",
    "subject_priority",
    "previous_shot_title",
    "previous_shot_script_excerpt",
    "previous_shot_end_state",
    "next_shot_title",
    "next_shot_script_excerpt",
    "next_shot_start_goal",
    "continuity_guidance",
    "composition_anchor",
    "screen_direction_guidance",
    "frame_specific_guidance",
    "director_command_summary",
    "retry_guidance",
]

_FRAME_FOCUS = {
    "khung đầu": "Ưu tiên mô tả các thông tin tạo dựng khung hình được nhìn thấy đầu tiên khi cảnh bắt đầu, nhấn mạnh thiết lập mở đầu, trạng thái ban đầu của chủ thể và ấn tượng ban đầu khi bước vào tình huống; chỉ thể hiện khoảnh khắc kích hoạt hoặc phản ứng đầu tiên, không viết trực tiếp thành hành động hoàn thành phía sau, tư thế cuối cùng hay trạng thái bộc phát cảm xúc.",
    "khung cuối": "Ưu tiên mô tả trạng thái khung hình dừng lại cuối cùng khi cảnh kết thúc, nhấn mạnh việc khép lại hành động, tư thế kết thúc của nhân vật, điểm nhìn hay dư âm cảm xúc.",
    "khung chính": "Ưu tiên bắt lấy khoảnh khắc đại diện nhất, giàu kịch tính nhất hoặc có mật độ thông tin cao nhất trong cảnh, không cần mô tả đều khắp cả quá trình.",
}

_SHOT_FRAME_TEMPLATE = """Bạn là một nhà thiết kế prompt phân cảnh phim/video chuyên nghiệp, cần tạo **prompt cơ bản {frame_name}** cho các cảnh trong cùng một dự án.

Nhiệm vụ của bạn là tạo ra "prompt cơ bản", chỉ mô tả bản thân khung hình, để hệ thống phía sau tiếp tục ghép các diễn giải ánh xạ hình ảnh.

## Ràng buộc mạnh
1. Phải kế thừa biểu hiện hình ảnh cấp dự án và phong cách thể loại: {visual_style} / {style}
2. Dự án có yêu cầu thống nhất phong cách không: {unify_style}
3. Nếu thông tin cảnh không đầy đủ, ưu tiên hội tụ về phong cách dự án và các thiết lập thực thể đã xác nhận, không lan man tự do sang phong cách khác
4. Tên nhân vật, bối cảnh, đạo cụ, trang phục đã xác nhận trong cảnh hiện tại phải giữ nguyên, không được dịch, không đổi tên, không thay bằng từ đồng nghĩa
5. Không được xuất "Hình 1/Hình 2", không được xuất "## Diễn giải nội dung hình ảnh", không được xuất diễn giải ánh xạ trích dẫn
6. Đầu ra phải là một câu hoặc vài câu mô tả bằng tiếng Việt ngắn gọn, trực quan, dùng được trực tiếp cho mô hình tạo hình ảnh
7. Cố gắng giữ cách mô tả thống nhất, ưu tiên tổ chức theo "cận / góc máy / chuyển động máy -> bối cảnh môi trường -> nhân vật chính/đại tượng chính -> trạng thái hành động -> không khí cảm xúc -> khép lại phong cách"
8. Chỉ xuất một object JSON: {{"prompt": "nội dung prompt của bạn"}}, không xuất thêm văn bản nào khác
9. Trọng tâm quan tâm của khung hiện tại: {frame_focus}
10. Gợi ý ưu tiên chủ thể: {subject_priority}
11. Đừng vì "viết đủ thông tin" mà liệt kê đều tất cả nhân vật, đạo cụ, trang phục; ưu tiên nổi bật nhân vật chính, bối cảnh chính và hành động chính, các yếu tố khác chỉ đưa vào prompt khi làm nổi bật khung hình hiện tại
12. Nếu phía dưới có "yêu cầu chỉnh sửa", phải đáp ứng từng mục rồi mới xuất kết quả cuối
13. Nếu có thông tin cảnh trước, khung hình hiện tại nên tiếp nhận càng nhiều càng tốt hành động, hướng không gian, tầm nhìn hoặc cảm xúc của cảnh trước, đừng như mở đầu toàn bộ từ một cảnh hoàn toàn mới
14. Nếu có thông tin cảnh sau, khung hình hiện tại nên để lại cho cảnh sau một kết thúc hành động hoặc cảm xúc tự nhiên, tránh cắt cứng
15. Càng rõ ràng càng tốt về vị trí tương đối, hướng và đỉnh hành động của chủ thể trong khung hình, giảm thiểu biến động bố cục và trục kịch
16. Nếu có gợi ý mỏ neo bố cục và không gian, nên đưa vào mô tả khung hình nhiều nhất có thể, làm cho vị trí chủ thể, trọng tâm môi trường và hướng không gian ổn định hơn
17. Nếu có gợi ý hướng và tầm nhìn, nên giữ mối quan hệ trái-phải của nhân vật, điểm nhìn và trục cảnh phản (reverse shot) ổn định, không tự ý lật ngược
18. Nếu có gợi ý chuyên biệt cho khung hiện tại, nên ưu tiên đáp ứng gợi ý đó, đảm bảo khung đầu/khung chính/khung cuối mỗi loại đảm nhận vai trò rõ ràng
19. Nếu có tóm tắt chỉ đạo của đạo diễn, nên xem đó là ràng buộc thực thi cảnh có ưu tiên cao nhất, ưu tiên thể hiện trong mô tả khung hình cuối
20. Nếu hiện tại là khung đầu, chỉ được thể hiện khoảnh khắc sự kiện kích hoạt hoặc phản ứng đầu tiên, không viết trực tiếp kết quả hành động hoàn thành phía sau, tư thế cuối cùng hay bộc phát cảm xúc vào khung hình
21. Nếu hiện tại là khung đầu và cảnh có chuỗi hành động liên tục, nên ưu tiên dùng cách diễn đạt trạng thái chưa hoàn thành như "vừa bắt đầu / chưa hoàn thành / bị ngắt", thay vì cách diễn đạt trạng thái kết quả

## Thông tin cảnh
Trích đoạn kịch bản: {script_excerpt}
Tiêu đề cảnh: {title}
Mô tả bổ sung cảnh: {shot_description}
Cận: {camera_shot}
Góc máy: {angle}
Chuyển động máy: {movement}
Không khí: {atmosphere}
Nhãn cảm xúc: {mood_tags}
Hiệu ứng đặc biệt: {vfx_type} - {vfx_note}
Thời lượng: {duration} giây
Tóm tắt thoại: {dialog_summary}
Mốc hành động: {action_beats}
Giai đoạn mốc hành động: {action_beat_phases}
Giai đoạn ưu tiên của khung hiện tại: {selected_action_beat_phase}
Mốc chính của khung hiện tại: {selected_action_beat_text}

## Bối cảnh thực thể đã xác nhận
Nhân vật: {character_context}
Bối cảnh: {scene_context}
Đạo cụ: {prop_context}
Trang phục: {costume_context}

## Thông tin tiếp nối cảnh kề
Tiêu đề cảnh trước: {previous_shot_title}
Trích đoạn kịch bản cảnh trước: {previous_shot_script_excerpt}
Trạng thái kết thúc cảnh trước: {previous_shot_end_state}
Tiêu đề cảnh sau: {next_shot_title}
Trích đoạn kịch bản cảnh sau: {next_shot_script_excerpt}
Mục tiêu bắt đầu cảnh sau: {next_shot_start_goal}
Gợi ý tính liên tục: {continuity_guidance}
Mỏ neo bố cục và không gian: {composition_anchor}
Gợi ý hướng và tầm nhìn: {screen_direction_guidance}
Gợi ý chuyên biệt khung hiện tại: {frame_specific_guidance}
Tóm tắt chỉ đạo đạo diễn: {director_command_summary}

Yêu cầu chỉnh sửa: {retry_guidance}

## Đầu ra (chỉ có prompt cơ bản {frame_name}, JSON: {{"prompt": "..."}})
"""

def _build_frame_template(frame_name: str) -> str:
    return (
        _SHOT_FRAME_TEMPLATE.replace("{frame_name}", frame_name)
        .replace("{frame_focus}", _FRAME_FOCUS[frame_name])
    )


_FIRST_FRAME_TEMPLATE = _build_frame_template("khung đầu")
_LAST_FRAME_TEMPLATE = _build_frame_template("khung cuối")
_KEY_FRAME_TEMPLATE = _build_frame_template("khung chính")

SHOT_FIRST_FRAME_PROMPT = PromptTemplate(input_variables=_SHOT_FRAME_INPUT_VARS, template=_FIRST_FRAME_TEMPLATE)
SHOT_LAST_FRAME_PROMPT = PromptTemplate(input_variables=_SHOT_FRAME_INPUT_VARS, template=_LAST_FRAME_TEMPLATE)
SHOT_KEY_FRAME_PROMPT = PromptTemplate(input_variables=_SHOT_FRAME_INPUT_VARS, template=_KEY_FRAME_TEMPLATE)


class ShotFirstFramePromptAgent(AgentBase[ShotFramePromptResult]):
    """Agent tạo prompt khung đầu của cảnh, đầu ra có thể ghi vào ShotDetail.first_frame_prompt."""

    @property
    def prompt_template(self) -> PromptTemplate:
        return SHOT_FIRST_FRAME_PROMPT

    @property
    def output_model(self) -> type[ShotFramePromptResult]:
        return ShotFramePromptResult

    def format_output(self, raw: str) -> ShotFramePromptResult:
        json_str = _extract_json_from_text(raw)
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            return ShotFramePromptResult(prompt=raw.strip())
        if isinstance(data, dict) and "prompt" in data:
            return ShotFramePromptResult(prompt=str(data["prompt"]).strip())
        return ShotFramePromptResult(prompt=raw.strip())

    def extract(self, **kwargs: Any) -> ShotFramePromptResult:
        inp = _prepare_shot_frame_input(kwargs)
        raw = self.run(**inp)
        return self.format_output(raw)

    async def aextract(self, **kwargs: Any) -> ShotFramePromptResult:
        inp = _prepare_shot_frame_input(kwargs)
        raw = await self.arun(**inp)
        return self.format_output(raw)


class ShotLastFramePromptAgent(AgentBase[ShotFramePromptResult]):
    """Agent tạo prompt khung cuối của cảnh, đầu ra có thể ghi vào ShotDetail.last_frame_prompt."""

    @property
    def prompt_template(self) -> PromptTemplate:
        return SHOT_LAST_FRAME_PROMPT

    @property
    def output_model(self) -> type[ShotFramePromptResult]:
        return ShotFramePromptResult

    def format_output(self, raw: str) -> ShotFramePromptResult:
        json_str = _extract_json_from_text(raw)
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            return ShotFramePromptResult(prompt=raw.strip())
        if isinstance(data, dict) and "prompt" in data:
            return ShotFramePromptResult(prompt=str(data["prompt"]).strip())
        return ShotFramePromptResult(prompt=raw.strip())

    def extract(self, **kwargs: Any) -> ShotFramePromptResult:
        inp = _prepare_shot_frame_input(kwargs)
        raw = self.run(**inp)
        return self.format_output(raw)

    async def aextract(self, **kwargs: Any) -> ShotFramePromptResult:
        inp = _prepare_shot_frame_input(kwargs)
        raw = await self.arun(**inp)
        return self.format_output(raw)


class ShotKeyFramePromptAgent(AgentBase[ShotFramePromptResult]):
    """Agent tạo prompt khung chính của cảnh, đầu ra có thể ghi vào ShotDetail.key_frame_prompt."""

    @property
    def prompt_template(self) -> PromptTemplate:
        return SHOT_KEY_FRAME_PROMPT

    @property
    def output_model(self) -> type[ShotFramePromptResult]:
        return ShotFramePromptResult

    def format_output(self, raw: str) -> ShotFramePromptResult:
        json_str = _extract_json_from_text(raw)
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            return ShotFramePromptResult(prompt=raw.strip())
        if isinstance(data, dict) and "prompt" in data:
            return ShotFramePromptResult(prompt=str(data["prompt"]).strip())
        return ShotFramePromptResult(prompt=raw.strip())

    def extract(self, **kwargs: Any) -> ShotFramePromptResult:
        inp = _prepare_shot_frame_input(kwargs)
        raw = self.run(**inp)
        return self.format_output(raw)

    async def aextract(self, **kwargs: Any) -> ShotFramePromptResult:
        inp = _prepare_shot_frame_input(kwargs)
        raw = await self.arun(**inp)
        return self.format_output(raw)
