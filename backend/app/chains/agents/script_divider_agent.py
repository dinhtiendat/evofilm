"""Agent phân cảnh kịch bản: ScriptDividerAgent"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase, _extract_json_from_text
from app.schemas.skills.script_processing import ScriptDivisionResult

_SCRIPT_DIVIDER_SYSTEM_PROMPT = """\
Bạn là \"Kỹ sư phân cảnh kịch bản\". Chia kịch bản hoàn chỉnh thành nhiều cảnh quay. Mỗi cảnh phải là một cảnh quay liền mạch, trọn vẹn.
Với mỗi cảnh, cung cấp:
- index (số thứ tự cảnh, duy nhất trong chương; bắt đầu từ 1)
- start_line、end_line
- shot_name (tên cảnh/tiêu đề cảnh, tên phân cảnh; một câu mô tả hình ảnh/hành động của cảnh này; không được dùng làm tên bối cảnh)
- script_excerpt (đoạn trích kịch bản tương ứng với cảnh)
- time_of_day
Chỉ xuất JSON, đúng cấu trúc ScriptDivisionResult.
"""

SCRIPT_DIVIDER_PROMPT = PromptTemplate(
    input_variables=["script_text"],
    template="## Kịch bản đầu vào\n{script_text}\n\n## Đầu ra\n",
)


class ScriptDividerAgent(AgentBase[ScriptDivisionResult]):
    """Tự động phân cảnh kịch bản: nhận toàn bộ văn bản kịch bản, xuất danh sách cảnh."""

    enable_thinking: bool = False

    @property
    def system_prompt(self) -> str:
        return _SCRIPT_DIVIDER_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return SCRIPT_DIVIDER_PROMPT

    @property
    def output_model(self) -> type[ScriptDivisionResult]:
        return ScriptDivisionResult

    def format_output(self, raw: str) -> ScriptDivisionResult:
        """
        Phân tích dự phòng mạnh hơn:
        LLM có thể xuất:
        - Cấu trúc chuẩn: {shots:[...], total_shots:N}
        - Cấu trúc bọc: {"ScriptDivisionResult": {...}}
        - Danh sách trực tiếp: [{...}, {...}] (coi là shots)
        """

        json_str = _extract_json_from_text(raw)
        data: Any = json.loads(json_str)

        if isinstance(data, list):
            data = {"shots": data}
        elif isinstance(data, dict) and "ScriptDivisionResult" in data:
            inner = data.get("ScriptDivisionResult")
            if isinstance(inner, list):
                data = {"shots": inner}
            elif isinstance(inner, dict):
                data = inner
            else:
                data = {"shots": []}

        if isinstance(data, dict):
            data = self._normalize(data)

        return self.output_model.model_validate(data)  # type: ignore[arg-type]

    def divide_script(self, *, script_text: str) -> ScriptDivisionResult:
        return self.extract(script_text=script_text)

    async def adivide_script(self, *, script_text: str) -> ScriptDivisionResult:
        return await self.aextract(script_text=script_text)

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """Chuẩn hóa kết quả phân chia kịch bản."""
        data = dict(data)

        # Tương thích: LLM có thể xuất {"ScriptDivisionResult": {...}} hoặc {"ScriptDivisionResult": [...]}
        if "ScriptDivisionResult" in data:
            inner = data.get("ScriptDivisionResult")
            if isinstance(inner, list):
                data = {"shots": inner}
            elif isinstance(inner, dict):
                data = dict(inner)
            else:
                data = {"shots": []}

        if "shots" in data and isinstance(data["shots"], list):
            shots = []
            for idx, shot in enumerate(data["shots"]):
                shot_dict: dict[str, Any] = (
                    dict(shot) if isinstance(shot, dict) else {"script_excerpt": str(shot), "shot_name": ""}
                )
                if "index" not in shot_dict:
                    shot_dict["index"] = idx + 1
                # Tương thích: LLM có thể dùng title/shot_title thay cho shot_name
                if "shot_name" not in shot_dict:
                    if "title" in shot_dict:
                        shot_dict["shot_name"] = str(shot_dict.pop("title"))
                    elif "shot_title" in shot_dict:
                        shot_dict["shot_name"] = str(shot_dict.pop("shot_title"))
                shot_dict.setdefault("shot_name", "")
                # Đưa về đúng chuẩn ShotDivision: bỏ các trường ngữ nghĩa yếu đã ngừng dùng, tránh thất bại validation extra="forbid"
                shot_dict.pop("scene_name", None)
                shot_dict.pop("character_names_in_text", None)
                shot_dict.pop("character_ids", None)
                shots.append(shot_dict)
            data["shots"] = shots

        if "total_shots" not in data and "shots" in data:
            data["total_shots"] = len(data["shots"])

        return data

