"""Agent phân tích thông tin còn thiếu về trang phục: CostumeInfoAnalysisAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.costume_info_analysis import CostumeInfoAnalysisResult

_COSTUME_INFO_SYSTEM_PROMPT = """\
Bạn là "Nhà phân tích thông tin trang phục". Nhiệm vụ của bạn: khi nhận được một "mô tả trang phục/tạo hình trong nguyên văn", hãy xác định những thông tin quan trọng nào còn thiếu khiến không thể tạo được hình ảnh tài nguyên trang phục hợp lý (cấu trúc form / phối layer / chất liệu và hoa văn / màu sắc và họa tiết / phụ kiện và giày mũ / thời đại và phong cách / làm cũ và tình trạng, v.v.).

Yêu cầu:
- Đầu ra phải phục vụ đúng mục đích "dùng trực tiếp cho tạo hình ảnh bằng AI", optimized_description phải là một đoạn mô tả liền mạch, mang tính khẳng định, giàu sức gợi hình.
- Nguyên văn chỉ dùng làm tham chiếu: chỉ được nối mượt hoặc sắp xếp lại không đổi ý gốc trên những nội dung nguyên văn đã nêu rõ; không được sửa, thay hay làm suy yếu bất kỳ thông tin quan trọng nào trong nguyên văn (kiểu trang phục, màu sắc, chất liệu, gợi ý thân phận và tầng lớp, tình trạng, v.v.).
- Khi nguyên văn còn thiếu, hãy mở rộng bổ sung thận trọng và hợp lý, sao cho optimized_description bao phủ ít nhất các khía cạnh: phong cách phối đồ tổng thể và cảm giác thời đại, lớp áo trên/áo dưới/áo khoác, form dáng và silhouette, chất liệu và kết cấu bề mặt, màu chủ đạo và màu phụ, họa tiết và chi tiết xử lý (như đường may / phụ kiện kim loại / thêu / cúc / kéo, v.v.), phụ kiện (đai / trang sức / túi / găng tay, v.v.), giày và đồ tất, phụ kiện tóc hoặc mũ (nếu phù hợp), cùng tình trạng trang phục (gọn gàng / nhăn / sờn / bẩn / rách / ẩm, v.v.).
- issues: liệt kê các khía cạnh quan trọng thực sự bị thiếu hoặc các điểm mơ hồ trong nguyên văn, và nói rõ những thiếu sót đó ảnh hưởng thế nào đến tính nhất quán khi tạo tài nguyên trang phục, khả năng đọc tầng lớp hoặc độ chính xác của phong cách.
- optimized_description: trên cơ sở giữ nguyên tối đa từ ngữ và ý gốc, giữ lại đầy đủ mọi thông tin rõ ràng, dùng câu văn khẳng định để bổ sung phần còn thiếu, tạo thành một đoạn mô tả trang phục hoàn chỉnh có thể sao chép trực tiếp đưa vào mô hình tạo hình ảnh AI.

Các điều cấm (thi hành nghiêm ngặt):
- optimized_description tuyệt đối không được xuất hiện các từ mơ hồ, thiếu ổn định, mang tính chỗ giữ (placeholder) hoặc suy đoán như "chưa được mô tả chi tiết" "thông tin không rõ" "không xác định" "không rõ ràng" "giả định" "ví dụ" "có thể hình dung" "tương tự" "thường" "có thể" "đại khái".
- Mọi mô tả phải dùng ngôn ngữ khẳng định, cụ thể, tích cực, trực tiếp đưa ra chi tiết có thể hình dung được.
- issues chỉ phân tích chỗ thiếu hoặc điểm mơ hồ, không nhắc lại nội dung bị thiếu trong optimized_description.
- Nếu nguyên văn đã đủ đầy, issues có thể để trống hoặc tối giản, optimized_description vẫn cần diễn đạt có cấu trúc, thuận mạch, nhưng không được thêm sự kiện quan trọng mà nguyên văn không hề gợi ý.

Chỉ xuất JSON, đúng cấu trúc CostumeInfoAnalysisResult.
"""

COSTUME_INFO_PROMPT = PromptTemplate(
    input_variables=["costume_context", "costume_description"],
    template=(
        "## Bối cảnh trang phục trong nguyên văn (có thể để trống)\n{costume_context}\n\n"
        "## Mô tả trang phục trong nguyên văn\n{costume_description}\n\n"
        "## Đầu ra\n"
    ),
)


class CostumeInfoAnalysisAgent(AgentBase[CostumeInfoAnalysisResult]):
    """Phân tích thông tin còn thiếu từ mô tả trang phục/tạo hình trong nguyên văn và xuất mô tả trang phục đã tối ưu, sẵn sàng tạo ảnh."""

    @property
    def system_prompt(self) -> str:
        return _COSTUME_INFO_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return COSTUME_INFO_PROMPT

    @property
    def output_model(self) -> type[CostumeInfoAnalysisResult]:
        return CostumeInfoAnalysisResult

    def analyze_costume_description(
        self, *, costume_description: str, costume_context: str | None = None
    ) -> CostumeInfoAnalysisResult:
        return self.extract(
            costume_context=costume_context or "",
            costume_description=costume_description,
        )

    async def a_analyze_costume_description(
        self, *, costume_description: str, costume_context: str | None = None
    ) -> CostumeInfoAnalysisResult:
        return await self.aextract(
            costume_context=costume_context or "",
            costume_description=costume_description,
        )

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        # Tương thích nới lỏng: chặn đáy kiểu dữ liệu các trường issues/optimized_description để tránh thất bại validation schema strict
        data = dict(data)
        issues = data.get("issues", [])
        if not isinstance(issues, list):
            data["issues"] = [str(issues)] if issues is not None else []
        if "optimized_description" not in data:
            data["optimized_description"] = ""

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
                data["optimized_description"] = cleaned or optimized

        return data

