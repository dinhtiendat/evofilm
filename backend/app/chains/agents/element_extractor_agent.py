"""Agent trích xuất thông tin cấp dự án: ElementExtractorAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.script_processing import StudioScriptExtractionDraft

_SCRIPT_EXTRACTOR_SYSTEM_PROMPT = """\
Bạn là \"Người trích xuất thông tin Studio\". Nhiệm vụ của bạn: dựa vào kết quả phân cảnh (cùng đầu ra kiểm tra tính nhất quán nếu có), xuất ra cấu trúc draft StudioScriptExtractionDraft có thể import trực tiếp vào Studio (lưu ý: ID do API import sinh ra, vì vậy ở đây dùng toàn bộ name làm khóa tham chiếu).

Xuất StudioScriptExtractionDraft:
- project_id (bắt buộc)
- chapter_id (bắt buộc)
- characters: [{name, description, costume_name?, prop_names[], tags[]}]
- scenes/props/costumes: [{name, description, tags[], prompt_template_id?, view_count}]
- shots: [{index, title, script_excerpt, scene_name?, character_names[], prop_names[], costume_names[], dialogue_lines[], actions[], semantic_suggestion?}]
  - dialogue_lines: [{index, text, line_mode, speaker_name?, target_name?}]
  - semantic_suggestion: {camera_shot?, angle?, movement?, duration?, action_beats[], notes?}

Ràng buộc mạnh:
- Thực thể cùng tên chỉ xuất hiện một lần trong đầu ra (khử trùng toàn cục); tham chiếu trong shots phải dùng đúng tên đó
- shots.index phải phủ và tương ứng với index trong phân cảnh đầu vào (không bỏ số)
- Không xuất bất kỳ trường id nào (kể cả dạng char_001), để API import tự sinh

Ràng buộc nhất quán (phải tuân thủ nghiêm, nếu không import sẽ thất bại):
- Xuất trước các danh sách toàn cục characters/scenes/props/costumes, sau đó mới xuất shots; coi chúng như một "từ điển".
- shots[*].character_names / prop_names / costume_names / scene_name chỉ được chọn từ name trong danh sách toàn cục tương ứng (chuỗi giống hệt nhau), cấm tạo mới bất kỳ tên nào chưa có trong danh sách toàn cục.
- Cấm trôi dạt kiểu "đồng nghĩa / biến thể trong ngoặc / tên gọi tạm": ví dụ cấm viết trong shots «nữ nhân (quần chúng)» mà trong characters không có mục đó; cấm dùng lẫn lộn «tiên nữ A» với «tiên nữ A».
- Gặp nhân vật nhóm / chỉ chung (như "nữ nhân (quần chúng)" "quần chúng" "thôn dân"): phải tạo trong danh sách characters một nhân vật cùng tên (name hoàn toàn trùng khớp), và tham chiếu name đó trong shots.
- Với cách gọi khó xác định có phải cùng một nhân vật hay không: thà tách thành hai mục name khác nhau trong characters, chứ đừng đổi tên bừa trong shots.
- Trước khi xuất shots, phải "xác minh toàn bộ tập" và bổ sung phần thiếu: tập hợp tên trong character_names/prop_names/costume_names/scene_name của mọi shots[*] phải tìm thấy được trong name của danh sách toàn cục tương ứng (characters/props/costumes/scenes); nếu thiếu, phải bổ sung mục tương ứng trong danh sách toàn cục (mô tả có thể tối giản, nhưng name phải giống hệt), cấm lách bằng cách thay alias.
- Tên nhân vật / tên cảnh phải giữ nguyên chi tiết ký tự: kể cả ngoặc full-width/half-width, khoảng trắng, dấu câu; không tự động chuẩn hóa hay thay thế (ví dụ không được đổi «nữ nhân (quần chúng)» thành «nữ nhân (quần chúng)» hay «nữ nhân (quần chúng)»).
- Phân biệt rõ: shots[*].title là "tiêu đề cảnh" (một câu mô tả hình ảnh/hành động của cảnh), không được dùng làm tên scene của scenes; shots[*].scene_name mới là tên cảnh, phải lấy từ name trong danh sách toàn cục scenes.
- Ngoài thực thể và thoại, còn phải bổ sung tối đa các gợi ý ngôn ngữ điện ảnh mặc định: `camera_shot` / `angle` / `movement` / `duration`.
- `camera_shot` chỉ được xuất: ECU / CU / MCU / MS / MLS / LS / ELS.
- `angle` chỉ được xuất: EYE_LEVEL / HIGH_ANGLE / LOW_ANGLE / BIRD_EYE / DUTCH / OVER_SHOULDER.
- `movement` chỉ được xuất: STATIC / PAN / TILT / DOLLY_IN / DOLLY_OUT / TRACK / CRANE / HANDHELD / STEADICAM / ZOOM_IN / ZOOM_OUT.
- `duration` phải xuất số giây nguyên dương; nếu không thể xác định thì có thể lược bỏ.
- `action_beats` cần xuất 2-4 mốc hành động theo thứ tự thời gian bên trong cảnh; mỗi mốc chỉ mô tả một hành động chính hoặc một sự thay đổi trạng thái, không viết thành đoạn văn văn học.
- `semantic_suggestion` là "gợi ý ngữ nghĩa mặc định của cảnh", không phải prompt tạo cuối cùng, đừng xuất văn bản trang trí kiểu prompt.

Đầu vào:
- project_id
- chapter_id
- script_division_json（ScriptDivisionResult）
- consistency_json (tùy chọn)

Chỉ xuất JSON.
"""

SCRIPT_EXTRACTOR_PROMPT = PromptTemplate(
    input_variables=["project_id", "chapter_id", "script_division_json", "consistency_json"],
    template=(
        "## project_id\n{project_id}\n\n"
        "## chapter_id\n{chapter_id}\n\n"
        "## Kiểm tra tính nhất quán (tùy chọn)\n{consistency_json}\n\n"
        "## Kết quả phân cảnh\n{script_division_json}\n\n"
        "## Đầu ra\n"
    ),
)


class ElementExtractorAgent(AgentBase[StudioScriptExtractionDraft]):
    """Trích xuất thông tin cấp dự án (đầu ra cuối cùng): nhận kết quả phân cảnh, xuất bảng thực thể toàn cục + liên kết theo từng cảnh."""

    @property
    def system_prompt(self) -> str:
        return _SCRIPT_EXTRACTOR_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return SCRIPT_EXTRACTOR_PROMPT

    @property
    def output_model(self) -> type[StudioScriptExtractionDraft]:
        return StudioScriptExtractionDraft

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.setdefault("project_id", "")
        data.setdefault("chapter_id", "")
        data.setdefault("script_text", "")
        for k in ("characters", "scenes", "props", "costumes", "shots"):
            if k not in data or not isinstance(data[k], list):
                data[k] = []
        return data
