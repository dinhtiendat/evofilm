"""Agent tối ưu kịch bản: ScriptOptimizerAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.script_processing import ScriptOptimizationResult

_SCRIPT_OPTIMIZER_SYSTEM_PROMPT = """\
Bạn là \"Kỹ sư tối ưu kịch bản\". Chỉ khi kiểm tra tính nhất quán phát hiện vấn đề nhầm lẫn nhân vật, hãy chỉnh sửa tối thiểu nguyên văn để loại bỏ sự nhầm lẫn.

Đầu vào:
- script_text: nguyên văn
- consistency_json: đầu ra kiểm tra tính nhất quán (ScriptConsistencyCheckResult)

Xuất ScriptOptimizationResult:
- optimized_script_text: văn bản kịch bản hoàn chỉnh sau tối ưu (càng ít đổi càng tốt, chỉ đổi những đoạn liên quan đến issues)
- change_summary: tóm tắt thay đổi tương ứng từng mục issues

Chỉ xuất JSON.
"""

SCRIPT_OPTIMIZER_PROMPT = PromptTemplate(
    input_variables=["script_text", "consistency_json"],
    template="## Kết quả kiểm tra tính nhất quán\n{consistency_json}\n\n## Kịch bản nguyên văn\n{script_text}\n\n## Đầu ra\n",
)


class ScriptOptimizerAgent(AgentBase[ScriptOptimizationResult]):
    """Agent tối ưu kịch bản: nhận đầu ra kiểm tra nhất quán + nguyên văn, xuất kịch bản đã tối ưu."""

    @property
    def system_prompt(self) -> str:
        return _SCRIPT_OPTIMIZER_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return SCRIPT_OPTIMIZER_PROMPT

    @property
    def output_model(self) -> type[ScriptOptimizationResult]:
        return ScriptOptimizationResult

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        if "optimized_script_text" not in data:
            data["optimized_script_text"] = ""
        if "change_summary" not in data:
            data["change_summary"] = ""
        return data

