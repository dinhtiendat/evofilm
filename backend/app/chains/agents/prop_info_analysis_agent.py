"""Agent phân tích thông tin còn thiếu về đạo cụ: PropInfoAnalysisAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.prop_info_analysis import PropInfoAnalysisResult

_PROP_INFO_SYSTEM_PROMPT = """\
Bạn là "Nhà phân tích thông tin đạo cụ". Nhiệm vụ của bạn: khi nhận được một "mô tả đạo cụ trong nguyên văn", hãy xác định những thông tin quan trọng nào còn thiếu khiến không thể tạo được hình ảnh tài nguyên đạo cụ hợp lý (hình dáng cấu trúc / chất liệu và kỹ thuật / kích thước và tỷ lệ / cách sử dụng / chi tiết trạng thái / thời đại và phong cách / nhận diện và độ mòn, v.v.).

Yêu cầu:
- Đầu ra phải phục vụ đúng mục đích "dùng trực tiếp cho tạo hình ảnh bằng AI", optimized_description phải là một đoạn mô tả liền mạch, mang tính khẳng định, giàu sức gợi hình.
- Nguyên văn chỉ dùng làm tham chiếu: chỉ được nối mượt hoặc sắp xếp lại không đổi ý gốc trên những nội dung nguyên văn đã nêu rõ; không được sửa, thay hay làm suy yếu bất kỳ thông tin quan trọng nào trong nguyên văn (tên, công dụng, chủ sở hữu, thời đại và phong cách, chất liệu, tình trạng, v.v.).
- Khi nguyên văn còn thiếu, hãy mở rộng bổ sung thận trọng và hợp lý, sao cho optimized_description bao phủ ít nhất các khía cạnh: tên và loại đạo cụ, hình dáng tổng thể và cấu trúc, chất liệu và kết cấu bề mặt, màu sắc và chi tiết quan trọng, kích thước và tỷ lệ (có thể dùng thang tương đối), cách sử dụng và đặc tính chức năng, tình trạng (cũ mới / mòn / bẩn / hỏng / bộ phận chuyển động, v.v.), dấu nhận diện hoặc đặc điểm riêng, và có thể bổ sung vừa phải các dấu vết môi trường nhất quán với kịch tính (phải hợp với mục tiêu đạo cụ tổng thể).
- issues: liệt kê các khía cạnh quan trọng thực sự bị thiếu hoặc các điểm mơ hồ trong nguyên văn, và nói rõ những thiếu sót đó ảnh hưởng thế nào đến tính nhất quán khi tạo tài nguyên đạo cụ, khả năng đọc cấu trúc hoặc độ đầy đủ chi tiết.
- optimized_description: trên cơ sở giữ nguyên tối đa từ ngữ và ý gốc, giữ lại đầy đủ mọi thông tin rõ ràng, dùng câu văn khẳng định để bổ sung phần còn thiếu, tạo thành một đoạn mô tả đạo cụ hoàn chỉnh có thể sao chép trực tiếp đưa vào mô hình tạo hình ảnh AI.

Các điều cấm (thi hành nghiêm ngặt):
- optimized_description tuyệt đối không được xuất hiện các từ mơ hồ, thiếu ổn định, mang tính chỗ giữ (placeholder) hoặc suy đoán như "chưa được mô tả chi tiết" "thông tin không rõ" "không xác định" "không rõ ràng" "giả định" "ví dụ" "có thể hình dung" "tương tự" "thường" "có thể" "đại khái".
- Mọi mô tả phải dùng ngôn ngữ khẳng định, cụ thể, tích cực, trực tiếp đưa ra chi tiết có thể hình dung được.
- issues chỉ phân tích chỗ thiếu hoặc điểm mơ hồ, không nhắc lại nội dung bị thiếu trong optimized_description.
- Nếu nguyên văn đã đủ đầy, issues có thể để trống hoặc tối giản, optimized_description vẫn cần diễn đạt có cấu trúc, thuận mạch, nhưng không được thêm sự kiện quan trọng mà nguyên văn không hề gợi ý.

Chỉ xuất JSON, đúng cấu trúc PropInfoAnalysisResult.
"""

PROP_INFO_PROMPT = PromptTemplate(
    input_variables=["prop_context", "prop_description"],
    template=(
        "## Bối cảnh đạo cụ trong nguyên văn (có thể để trống)\n{prop_context}\n\n"
        "## Mô tả đạo cụ trong nguyên văn\n{prop_description}\n\n"
        "## Đầu ra\n"
    ),
)


class PropInfoAnalysisAgent(AgentBase[PropInfoAnalysisResult]):
    """Phân tích thông tin còn thiếu từ mô tả đạo cụ trong nguyên văn và xuất mô tả đạo cụ đã tối ưu, sẵn sàng tạo ảnh."""

    @property
    def system_prompt(self) -> str:
        return _PROP_INFO_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return PROP_INFO_PROMPT

    @property
    def output_model(self) -> type[PropInfoAnalysisResult]:
        return PropInfoAnalysisResult

    def analyze_prop_description(
        self, *, prop_description: str, prop_context: str | None = None
    ) -> PropInfoAnalysisResult:
        return self.extract(
            prop_context=prop_context or "",
            prop_description=prop_description,
        )

    async def a_analyze_prop_description(
        self, *, prop_description: str, prop_context: str | None = None
    ) -> PropInfoAnalysisResult:
        return await self.aextract(
            prop_context=prop_context or "",
            prop_description=prop_description,
        )

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        # Tương thích nới lỏng: chặn đáy kiểu dữ liệu các trường issues/optimized_description để tránh thất bại validation schema strict
        data = dict(data)
        issues = data.get("issues", [])
        if not isinstance(issues, list):
            data["issues"] = [str(issues)] if issues is not None else []
        if "optimized_description" not in data:
            data["optimized_description"] = ""

        # Dọn dẹp dự phòng: nếu model lỡ viết các câu placeholder kiểu "thông tin không rõ/không xác định" vào optimized_description thì bỏ những câu đó
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

