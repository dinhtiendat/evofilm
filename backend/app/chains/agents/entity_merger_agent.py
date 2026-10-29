"""Agent gộp thực thể xuyên cảnh: EntityMergerAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.script_processing import EntityMergeResult

_ENTITY_MERGER_SYSTEM_PROMPT = """\
Bạn là \"Kỹ sư gộp thực thể\". Gộp kết quả trích xuất từ nhiều cảnh, thống nhất định nghĩa thực thể, gán ID cho từng thực thể, nhận dạng biến thể và xung đột.
Hãy xuất EntityMergeResult, merged_library phải chứa ít nhất 4 nhóm characters/locations/scenes/props.
Mỗi mục thực thể (EntityEntry) cần có:
- Chung: id/name/type/description/aliases/normalized_name/confidence/first_appearance/evidence/first_shot/appearances/variants
- Nhân vật (type=character): nên bổ sung costume_note, traits
- Địa điểm (type=location): nên bổ sung location_type
- Đạo cụ (type=prop): nên bổ sung category, owner_character_id
variants dùng cấu trúc tối thiểu {variant_key, description, affected_shots, evidence}.
Khi có previous_merge_json và conflict_resolutions_json thì đó là một lần "gộp thử lại": bạn phải tham chiếu kết quả gộp lần trước và các gợi ý giải xung đột, ưu tiên xử lý conflicts; khi cần có thể điều chỉnh chiến lược gộp/tách thực thể, nhưng giữ ID ổn định nhất có thể (trừ khi gợi ý yêu cầu rõ ràng là phải đổi).
Chỉ xuất JSON, đúng cấu trúc EntityMergeResult.
"""

ENTITY_MERGER_PROMPT = PromptTemplate(
    input_variables=[
        "all_extractions_json",
        "historical_library_json",
        "script_division_json",
        "previous_merge_json",
        "conflict_resolutions_json",
    ],
    template=(
        "## Phân cảnh kịch bản (từ bước trước)\n{script_division_json}\n\n"
        "## Kết quả trích xuất của mọi cảnh\n{all_extractions_json}\n\n"
        "## Thư viện thực thể lịch sử\n{historical_library_json}\n\n"
        "## Kết quả gộp lần trước (tùy chọn, dùng khi thử lại)\n{previous_merge_json}\n\n"
        "## Gợi ý giải xung đột (tùy chọn, dùng khi thử lại)\n{conflict_resolutions_json}\n\n"
        "## Đầu ra\n"
    ),
)


class EntityMergerAgent(AgentBase[EntityMergeResult]):
    """Gộp xuyên cảnh + tạo hồ sơ cơ bản: nhận toàn bộ kết quả trích xuất phân cảnh + thư viện thực thể lịch sử, xuất thư viện đã gộp."""

    @property
    def system_prompt(self) -> str:
        return _ENTITY_MERGER_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return ENTITY_MERGER_PROMPT

    @property
    def output_model(self) -> type[EntityMergeResult]:
        return EntityMergeResult

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """Chuẩn hóa kết quả gộp thực thể."""
        data = dict(data)
        if "merged_library" not in data:
            data["merged_library"] = {
                "characters": [],
                "locations": [],
                "scenes": [],
                "props": [],
                "total_entries": 0,
            }
        lib = data["merged_library"]
        # Tương thích trường cũ: thiếu locations thì bổ sung rỗng; cấu trúc cũ có thể không có scenes
        if "locations" not in lib:
            lib["locations"] = []
        if "scenes" not in lib:
            lib["scenes"] = []
        if "total_entries" not in lib:
            lib["total_entries"] = sum(
                len(lib.get(k, []) or [])
                for k in ("characters", "locations", "scenes", "props")
            )
        # Tương thích cấu trúc variants cũ: dict[] -> EntityVariant[] (bổ sung tối thiểu)
        for bucket_name in ("characters", "locations", "scenes", "props"):
            bucket = lib.get(bucket_name)
            if not isinstance(bucket, list):
                continue
            for ent in bucket:
                if not isinstance(ent, dict):
                    continue
                if "variants" in ent and isinstance(ent["variants"], list):
                    new_vars = []
                    for v in ent["variants"]:
                        if isinstance(v, dict):
                            if "variant_key" not in v:
                                v["variant_key"] = v.get("id") or v.get("key") or "variant"
                            if "affected_shots" not in v:
                                v["affected_shots"] = []
                            if "evidence" not in v:
                                v["evidence"] = []
                            new_vars.append(v)
                        else:
                            new_vars.append(
                                {
                                    "variant_key": "variant",
                                    "description": str(v),
                                    "affected_shots": [],
                                    "evidence": [],
                                }
                            )
                    ent["variants"] = new_vars
        if "merge_stats" not in data:
            data["merge_stats"] = {}
        if "conflicts" not in data or not isinstance(data["conflicts"], list):
            data["conflicts"] = []
        return data

