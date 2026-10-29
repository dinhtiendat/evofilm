"""Agent phân tích biến thể: VariantAnalyzerAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.script_processing import VariantAnalysisResult

_VARIANT_ANALYZER_SYSTEM_PROMPT = """\
Bạn là \"Nhà phân tích biến thể\". Phân tích biến thể của thực thể (đặc biệt là thay đổi trang phục của nhân vật), dựng timeline, tạo đề xuất biến thể.
Xuất VariantAnalysisResult: costume_timelines.timeline_entries dùng {shot_index, scene_id, costume_note, changes, evidence}; variant_suggestions có thể kèm evidence.
Chỉ xuất JSON, đúng cấu trúc VariantAnalysisResult.
"""

VARIANT_ANALYZER_PROMPT = PromptTemplate(
    input_variables=["merged_library_json", "all_extractions_json", "script_division_json"],
    template=(
        "## Phân cảnh kịch bản (từ bước trước)\n{script_division_json}\n\n"
        "## Thư viện thực thể đã gộp\n{merged_library_json}\n\n"
        "## Kết quả trích xuất của mọi cảnh\n{all_extractions_json}\n\n"
        "## Đầu ra\n"
    ),
)


class VariantAnalyzerAgent(AgentBase[VariantAnalysisResult]):
    """Phát hiện và đề xuất biến thể trang phục/ngoại hình: nhận thư viện thực thể + trích xuất toàn cảnh, xuất kết quả phân tích biến thể."""

    @property
    def system_prompt(self) -> str:
        return _VARIANT_ANALYZER_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return VARIANT_ANALYZER_PROMPT

    @property
    def output_model(self) -> type[VariantAnalysisResult]:
        return VariantAnalysisResult

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """Chuẩn hóa kết quả phân tích biến thể."""
        data = dict(data)
        if "costume_timelines" not in data or not isinstance(data["costume_timelines"], list):
            data["costume_timelines"] = []
        if "variant_suggestions" not in data or not isinstance(data["variant_suggestions"], list):
            data["variant_suggestions"] = []
        if "chapter_variants" not in data or not isinstance(data["chapter_variants"], dict):
            data["chapter_variants"] = {}
        # Bổ sung trường evidence tùy chọn để tránh thất bại validation schema strict
        for tl in data.get("costume_timelines", []) or []:
            if not isinstance(tl, dict):
                continue
            entries = tl.get("timeline_entries")
            if isinstance(entries, list):
                for e in entries:
                    if isinstance(e, dict) and "evidence" not in e:
                        e["evidence"] = []
        for s in data.get("variant_suggestions", []) or []:
            if isinstance(s, dict) and "evidence" not in s:
                s["evidence"] = []
        return data

