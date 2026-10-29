"""Agent phân tích thông tin còn thiếu trong hồ sơ nhân vật: CharacterPortraitAnalysisAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.character_portrait import CharacterPortraitAnalysisResult

_CHARACTER_PORTRAIT_SYSTEM_PROMPT = """\
Bạn là \"Nhà phân tích hồ sơ nhân vật\". Nhiệm vụ của bạn: khi nhận được một "mô tả nhân vật trong nguyên văn", hãy xác định những thông tin quan trọng nào còn thiếu khiến không thể tạo được hồ sơ nhân vật hợp lý (nét mặt / tạo hình trang phục / khí chất / khuynh hướng tính cách / cảm giác độ tuổi / đặc điểm nhận dạng nổi bật / manh mối về bối cảnh hoặc động cơ, v.v.).

Yêu cầu:
- Đầu ra phải phục vụ đúng mục đích "dùng trực tiếp cho tạo hình ảnh bằng AI", optimized_description phải là một đoạn mô tả liền mạch, mang tính khẳng định, giàu sức gợi hình.
- Nguyên văn chỉ dùng làm tham chiếu: chỉ được nối mượt hoặc sắp xếp lại không đổi ý gốc trên những nội dung nguyên văn đã nêu rõ; không được sửa, thay hay làm suy yếu bất kỳ thông tin nào về nhân vật trong nguyên văn (độ tuổi, giới tính, đặc điểm ngoại hình, mô tả tính cách, v.v.).
- Khi nguyên văn còn thiếu, hãy mở rộng bổ sung thận trọng và hợp lý, sao cho optimized_description bao phủ ít nhất các khía cạnh: độ tuổi, giới tính, khuynh hướng tính cách, ngoại hình (nét mặt, dáng người, chất da, kiểu tóc, v.v.), tạo hình trang phục, khí chất, đặc điểm nhận dạng nổi bật, và có thể bổ sung vừa phải manh mối về bối cảnh hoặc động cơ (phải nhất quán với mục tiêu hồ sơ tổng thể).
- issues: liệt kê các khía cạnh quan trọng thực sự bị thiếu hoặc các điểm mơ hồ trong nguyên văn, và nói rõ những thiếu sót đó ảnh hưởng thế nào đến tính nhất quán, độ hoàn chỉnh thị giác hoặc sự sinh động của nhân vật khi tạo hồ sơ.
- optimized_description: trên cơ sở giữ nguyên tối đa từ ngữ và ý gốc, giữ lại đầy đủ mọi thông tin rõ ràng, dùng câu văn khẳng định để bổ sung phần còn thiếu, tạo thành một đoạn mô tả nhân vật hoàn chỉnh có thể sao chép trực tiếp đưa vào mô hình tạo hình ảnh AI.

Các điều cấm (thi hành nghiêm ngặt):
- optimized_description tuyệt đối không được xuất hiện các từ mơ hồ, thiếu ổn định, mang tính chỗ giữ (placeholder) hoặc suy đoán như "chưa được mô tả chi tiết" "thông tin không rõ" "không xác định" "không rõ ràng" "giả định" "ví dụ" "có thể hình dung" "tương tự" "thường" "có thể" "đại khái".
- Mọi mô tả phải dùng ngôn ngữ khẳng định, cụ thể, tích cực, trực tiếp đưa ra chi tiết có thể hình dung được.
- issues chỉ phân tích chỗ thiếu hoặc điểm mơ hồ, không nhắc lại nội dung bị thiếu trong optimized_description.
- Nếu nguyên văn đã đủ đầy, issues có thể để trống hoặc tối giản, optimized_description vẫn cần diễn đạt có cấu trúc, thuận mạch, nhưng không được thêm sự kiện quan trọng mà nguyên văn không hề gợi ý.

Chỉ xuất JSON, đúng cấu trúc CharacterPortraitAnalysisResult.
"""

CHARACTER_PORTRAIT_PROMPT = PromptTemplate(
    input_variables=["character_context", "character_description"],
    template=(
        "## Bối cảnh nhân vật trong nguyên văn (có thể để trống)\n{character_context}\n\n"
        "## Mô tả nhân vật trong nguyên văn\n{character_description}\n\n"
        "## Đầu ra\n"
    ),
)


class CharacterPortraitAnalysisAgent(AgentBase[CharacterPortraitAnalysisResult]):
    """Phân tích thông tin còn thiếu từ mô tả nhân vật trong nguyên văn và xuất mô tả hồ sơ đã tối ưu, sẵn sàng tạo ảnh."""

    @property
    def system_prompt(self) -> str:
        return _CHARACTER_PORTRAIT_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return CHARACTER_PORTRAIT_PROMPT

    @property
    def output_model(self) -> type[CharacterPortraitAnalysisResult]:
        return CharacterPortraitAnalysisResult

    def analyze_character_description(
        self, *, character_description: str, character_context: str | None = None
    ) -> CharacterPortraitAnalysisResult:
        return self.extract(
            character_context=character_context or "",
            character_description=character_description,
        )

    async def a_analyze_character_description(
        self, *, character_description: str, character_context: str | None = None
    ) -> CharacterPortraitAnalysisResult:
        return await self.aextract(
            character_context=character_context or "",
            character_description=character_description,
        )

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        # Tương thích nới lỏng: chặn đáy kiểu dữ liệu các trường issues/optimized_description để tránh thất bại validation schema strict
        data = dict(data)
        issues = data.get("issues", [])
        if not isinstance(issues, list):
            data["issues"] = [str(issues)] if issues is not None else []
        if "optimized_description" not in data:
            data["optimized_description"] = ""

        # Dọn dẹp dự phòng: nếu model lỡ viết các câu placeholder kiểu "thông tin không rõ/không xác định" vào optimized_description,
        # thì bỏ các câu đó đi, tránh ảnh hưởng chất lượng mô tả tích cực "sẵn sàng tạo hồ sơ" phía sau.
        optimized = data.get("optimized_description") or ""
        if isinstance(optimized, str) and optimized:
            fuzzy_markers = (
                "thông tin không rõ",
                "không rõ",
                "không xác định",
                "không rõ ràng",
                "không đề cập",
                "không thể nhận ra",
                "không thể đánh giá",
                "không chắc",
                "tạm thời không thể đánh giá",
            )
            if any(m in optimized for m in fuzzy_markers):
                parts = optimized.replace("\n", " ").split("。")
                kept: list[str] = []
                for p in parts:
                    seg = p.strip()
                    if not seg:
                        continue
                    if any(m in seg for m in fuzzy_markers):
                        continue
                    kept.append(seg)
                cleaned = "。".join(kept).strip()
                # Nếu sau khi dọn mà thành rỗng, giữ nguyên văn bản gốc (tránh xóa nhầm khiến nội dung mất sạch)
                data["optimized_description"] = cleaned or optimized

        return data

