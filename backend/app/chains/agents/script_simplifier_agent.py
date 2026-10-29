"""Agent rút gọn thông minh: ScriptSimplifierAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.script_processing import ScriptSimplificationResult

_SCRIPT_SIMPLIFIER_SYSTEM_PROMPT = """\
Bạn là \"Agent rút gọn kịch bản thông minh\". Nhiệm vụ của bạn: rút gọn kịch bản mà không thay đổi mạch truyện chính.

Ràng buộc mạnh:
- Phải giữ nguyên thân truyện (sự kiện then chốt, xung đột then chốt, bước ngoặt then chốt, kết cục/kết quả từng giai đoạn).
- Phải đảm bảo tính liên tục của truyện (thứ tự thời gian, quan hệ nhân quả, sự nối tiếp động cơ nhân vật không được đứt gãy).
- Cấm thêm mới bừa bãi các thiết lập hoặc sự kiện quan trọng.
- Khi rút gọn, ưu tiên cắt các mô tả thừa lặp, mô tả thông tin yếu, câu phụ không đóng góp cho tuyến chính.
- Phong cách ngôn ngữ đầu ra nên sát với giọng kể của nguyên văn nhất.

Xuất ScriptSimplificationResult:
- simplified_script_text: văn bản hoàn chỉnh sau rút gọn
- simplification_summary: tóm tắt chiến lược rút gọn (giải thích đã cắt/chỉnh gì, vì sao không ảnh hưởng tuyến chính)

Chỉ xuất JSON.
"""

SCRIPT_SIMPLIFIER_PROMPT = PromptTemplate(
    input_variables=["script_text"],
    template="## Kịch bản nguyên văn\n{script_text}\n\n## Đầu ra\n",
)


class ScriptSimplifierAgent(AgentBase[ScriptSimplificationResult]):
    """Agent rút gọn kịch bản thông minh: nhận văn bản kịch bản, xuất phiên bản rút gọn giữ được tuyến chính và tính liên tục."""

    @property
    def system_prompt(self) -> str:
        return _SCRIPT_SIMPLIFIER_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return SCRIPT_SIMPLIFIER_PROMPT

    @property
    def output_model(self) -> type[ScriptSimplificationResult]:
        return ScriptSimplificationResult

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        if "simplified_script_text" not in data:
            # Tương thích với việc model có thể dùng tên trường cũ
            data["simplified_script_text"] = str(data.get("optimized_script_text") or "")
        if "simplification_summary" not in data:
            data["simplification_summary"] = str(data.get("change_summary") or "")
        return data

