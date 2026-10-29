"""test hồi quy phân tích của CharacterPortraitAnalysisAgent."""

from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from app.chains.agents import CharacterPortraitAnalysisAgent
from app.schemas.skills.character_portrait import CharacterPortraitAnalysisResult


class _MockChatModel(BaseChatModel):
    def __init__(self, response: str) -> None:
        super().__init__()
        self._response = response

    @property
    def _llm_type(self) -> str:  # pragma: no cover
        return "mock-chat-model"

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:  # type: ignore[override]
        msg = AIMessage(content=self._response)
        return ChatResult(generations=[ChatGeneration(message=msg)])


def test_character_portrait_format_output_accepts_unquoted_keys() -> None:
    raw = '{issues: [], optimized_description: "Mô tả có thể tạo chân dung"}'
    agent = CharacterPortraitAnalysisAgent(_MockChatModel(raw))
    result = agent.format_output(raw)

    assert isinstance(result, CharacterPortraitAnalysisResult)
    assert result.issues == []
    assert isinstance(result.optimized_description, str)
    assert "Mô tả có thể tạo chân dung" in result.optimized_description


def test_character_portrait_format_output_accepts_python_literal_style() -> None:
    raw = "{'issues': ['thiếu chi tiết ngoại hình'], 'optimized_description': 'Mô tả sau khi bổ sung đầy đủ'}"
    agent = CharacterPortraitAnalysisAgent(_MockChatModel(raw))
    result = agent.format_output(raw)

    assert isinstance(result, CharacterPortraitAnalysisResult)
    assert result.issues == ["thiếu chi tiết ngoại hình"]
    assert result.optimized_description == "Mô tả sau khi bổ sung đầy đủ"


def test_character_portrait_removes_fuzzy_placeholder_sentences() -> None:
    raw = (
        "{'issues': ['Thiếu tư thế và đặc điểm khuôn mặt'], "
        "'optimized_description': 'Ngoại hình trông có khí chất. Đặc điểm tính cách và liệu có nét hình thể hay gương mặt nổi bật không thì chưa rõ. Phong cách ăn mặc thiên cổ điển.'}"
    )
    agent = CharacterPortraitAnalysisAgent(_MockChatModel(raw))
    result = agent.format_output(raw)

    assert isinstance(result, CharacterPortraitAnalysisResult)
    assert "thông tin chưa rõ" not in result.optimized_description
    assert "cổ điển" in result.optimized_description

