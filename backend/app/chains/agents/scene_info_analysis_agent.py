"""Agent phân tích thông tin còn thiếu về bối cảnh: SceneInfoAnalysisAgent"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import PromptTemplate

from app.chains.agents.base import AgentBase
from app.schemas.skills.scene_info_analysis import SceneInfoAnalysisResult

_SCENE_INFO_SYSTEM_PROMPT = """\
Bạn là "Nhà phân tích thông tin bối cảnh". Nhiệm vụ của bạn: khi nhận được một "mô tả bối cảnh trong nguyên văn", hãy xác định những thông tin quan trọng nào còn thiếu khiến không thể tạo được hình ý niệm/hình tài nguyên bối cảnh hợp lý (cấu trúc không gian / thời gian và thời tiết / nguồn sáng và không khí / chất liệu và phong cách / nội thất và địa điểm mốc chính / tầm nhìn và độ sâu trường ảnh, v.v.).

Yêu cầu:
- Đầu ra phải phục vụ đúng mục đích "dùng trực tiếp cho tạo hình ảnh bằng AI", optimized_description phải là một đoạn mô tả liền mạch, mang tính khẳng định, giàu sức gợi hình.
- Nguyên văn chỉ dùng làm tham chiếu: chỉ được nối mượt hoặc sắp xếp lại không đổi ý gốc trên những nội dung nguyên văn đã nêu rõ; không được sửa, thay hay làm suy yếu bất kỳ thông tin quan trọng nào trong nguyên văn (địa điểm, nội/ngoại cảnh, thời điểm, trạng thái sự kiện, nhân vật hoặc vật thể quan trọng, v.v.).
- Khi nguyên văn còn thiếu, hãy mở rộng bổ sung thận trọng và hợp lý, sao cho optimized_description bao phủ ít nhất các khía cạnh: loại và công dụng của bối cảnh, bố cục không gian và quy mô (có thể dùng thang tương đối), nội/ngoại cảnh và khung giờ, thời tiết và trạng thái môi trường (nếu phù hợp), hướng và chất của nguồn sáng, tông màu và không khí tổng thể, chất liệu chính và thời đại phong cách, yếu tố nội thất/địa điểm mốc chính, chi tiết sàn và tường, dấu vết môi trường có thể nhìn thấy (bụi / ẩm / hỏng / lộn xộn, v.v.) cùng điểm nhìn tập trung và trọng tâm bố cục.
- issues: liệt kê các khía cạnh quan trọng thực sự bị thiếu hoặc các điểm mơ hồ trong nguyên văn, và nói rõ những thiếu sót đó ảnh hưởng thế nào đến tính nhất quán khi tạo bối cảnh, khả năng đọc không gian hoặc độ chính xác của không khí.
- optimized_description: trên cơ sở giữ nguyên tối đa từ ngữ và ý gốc, giữ lại đầy đủ mọi thông tin rõ ràng, dùng câu văn khẳng định để bổ sung phần còn thiếu, tạo thành một đoạn mô tả bối cảnh hoàn chỉnh có thể sao chép trực tiếp đưa vào mô hình tạo hình ảnh AI.

Các điều cấm (thi hành nghiêm ngặt):
- optimized_description tuyệt đối không được xuất hiện các từ mơ hồ, thiếu ổn định, mang tính chỗ giữ (placeholder) hoặc suy đoán như "chưa được mô tả chi tiết" "thông tin không rõ" "không xác định" "không rõ ràng" "giả định" "ví dụ" "có thể hình dung" "tương tự" "thường" "có thể" "đại khái".
- Mọi mô tả phải dùng ngôn ngữ khẳng định, cụ thể, tích cực, trực tiếp đưa ra chi tiết có thể hình dung được.
- issues chỉ phân tích chỗ thiếu hoặc điểm mơ hồ, không nhắc lại nội dung bị thiếu trong optimized_description.
- Nếu nguyên văn đã đủ đầy, issues có thể để trống hoặc tối giản, optimized_description vẫn cần diễn đạt có cấu trúc, thuận mạch, nhưng không được thêm sự kiện quan trọng mà nguyên văn không hề gợi ý.

Chỉ xuất JSON, đúng cấu trúc SceneInfoAnalysisResult.
"""

SCENE_INFO_PROMPT = PromptTemplate(
    input_variables=["scene_context", "scene_description"],
    template=(
        "## Bối cảnh trong nguyên văn (có thể để trống)\n{scene_context}\n\n"
        "## Mô tả bối cảnh trong nguyên văn\n{scene_description}\n\n"
        "## Đầu ra\n"
    ),
)


class SceneInfoAnalysisAgent(AgentBase[SceneInfoAnalysisResult]):
    """Phân tích thông tin còn thiếu từ mô tả bối cảnh trong nguyên văn và xuất mô tả bối cảnh đã tối ưu, sẵn sàng tạo ảnh."""

    @property
    def system_prompt(self) -> str:
        return _SCENE_INFO_SYSTEM_PROMPT

    @property
    def prompt_template(self) -> PromptTemplate:
        return SCENE_INFO_PROMPT

    @property
    def output_model(self) -> type[SceneInfoAnalysisResult]:
        return SceneInfoAnalysisResult

    def analyze_scene_description(
        self, *, scene_description: str, scene_context: str | None = None
    ) -> SceneInfoAnalysisResult:
        return self.extract(
            scene_context=scene_context or "",
            scene_description=scene_description,
        )

    async def a_analyze_scene_description(
        self, *, scene_description: str, scene_context: str | None = None
    ) -> SceneInfoAnalysisResult:
        return await self.aextract(
            scene_context=scene_context or "",
            scene_description=scene_description,
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

