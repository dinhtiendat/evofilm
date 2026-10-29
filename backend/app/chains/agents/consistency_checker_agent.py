"""Agent kiểm tra tính nhất quán: ConsistencyCheckerAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.script_processing import ScriptConsistencyCheckResult

_CONSISTENCY_CHECKER_SYSTEM_PROMPT = """\
Bạn là \"Kỹ sư kiểm tra tính nhất quán\". Chỉ làm một việc: kiểm tra xem nguyên văn có gán nhầm "cùng một nhân vật" với các thân phận hoặc chủ thể hành động khác nhau ở các đoạn/cảnh khác nhau, gây nhầm lẫn nhân vật (ví dụ: cùng tên khác người, đại từ chỉ nhầm đối tượng, hành động bị gán sai chủ thể) hay không.

Xuất ScriptConsistencyCheckResult:
- issues: mỗi mục vấn đề phải chứa character_candidates, description, suggestion; nên kèm affected_lines (start_line/end_line).
- has_issues: true nếu issues khác rỗng

Chỉ xuất JSON.
"""

CONSISTENCY_CHECKER_PROMPT = PromptTemplate(
    input_variables=["script_text"],
    template="## Kịch bản nguyên văn\n{script_text}\n\n## Đầu ra\n",
)


class ConsistencyCheckerAgent(AgentBase[ScriptConsistencyCheckResult]):
    """Kiểm tra tính nhất quán (nhầm lẫn nhân vật): nhận nguyên văn, phát hiện sự nhầm lẫn thân phận/hành động của cùng một nhân vật và đưa ra gợi ý chỉnh sửa."""

    @property
    def system_prompt(self) -> str:
        return _CONSISTENCY_CHECKER_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return CONSISTENCY_CHECKER_PROMPT

    @property
    def output_model(self) -> type[ScriptConsistencyCheckResult]:
        return ScriptConsistencyCheckResult

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """Chuẩn hóa kết quả kiểm tra tính nhất quán (nhầm lẫn nhân vật)."""
        data = dict(data)
        if "issues" not in data or not isinstance(data["issues"], list):
            data["issues"] = []
        for it in data["issues"]:
            if isinstance(it, dict):
                it.setdefault("issue_type", "character_confusion")
                it.setdefault("character_candidates", [])
                it.setdefault("affected_lines", None)
                it.setdefault("evidence", [])
        if "has_issues" not in data:
            data["has_issues"] = len(data["issues"]) > 0
        if "summary" not in data:
            data["summary"] = None
        return data

