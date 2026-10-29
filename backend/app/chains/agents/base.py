"""Lớp base Agent chung: cố định PromptTemplate + mô hình đầu ra, gọi LLM và phân tích kết quả."""

from __future__ import annotations

import ast
import json
import re
from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar, cast

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import Runnable, RunnableLambda
from pydantic import BaseModel

STRUCTURED_OUTPUT_METHOD = "function_calling"

T = TypeVar("T", bound=BaseModel)


def _extract_json_from_text(raw: str) -> str:
    """Tách khối mã markdown khỏi đầu ra thô của LLM và lấy chuỗi JSON."""
    text = raw.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def _extract_first_json_object(text: str) -> str | None:
    """Cố gắng lấy đoạn JSON object/array đầu tiên từ văn bản."""

    s = text.strip()
    for opener, closer in (("{", "}"), ("[", "]")):
        start = s.find(opener)
        end = s.rfind(closer)
        if start != -1 and end != -1 and end > start:
            return s[start : end + 1].strip()
    return None


def _quote_unquoted_object_keys(text: str) -> str:
    """Bổ sung dấu nháy cho các tên key chưa có nháy trong output dạng JSON phổ biến."""
    pattern = re.compile(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)')
    return pattern.sub(r'\1"\2"\3', text)


def _replace_json_literals_for_python(text: str) -> str:
    """Thay các hằng JSON bằng hằng Python để ast.literal_eval phân tích được."""
    text = re.sub(r"(?<=[:\[,{\s])true(?=[,\]}\s])", "True", text)
    text = re.sub(r"(?<=[:\[,{\s])false(?=[,\]}\s])", "False", text)
    text = re.sub(r"(?<=[:\[,{\s])null(?=[,\]}\s])", "None", text)
    return text


def _repair_json_like(text: str) -> str:
    """Sửa các lỗi định dạng JSON thường gặp của LLM."""
    repaired = text.strip()
    repaired = repaired.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    repaired = _quote_unquoted_object_keys(repaired)
    # Bỏ dấu phẩy cuối: {"a":1,} / [1,2,]
    repaired = re.sub(r",\s*([}\]])", r"\1", repaired)
    return repaired


def _parse_python_call_kwargs(text: str) -> dict[str, Any] | None:
    """Phân tích các đầu ra dạng kwargs như `Foo(a=1, b='x')` / `dict(a=1)`."""
    try:
        expr = ast.parse(text, mode="eval")
    except Exception:
        return None
    body = expr.body
    if not isinstance(body, ast.Call) or body.args:
        return None

    parsed: dict[str, Any] = {}
    for kw in body.keywords:
        if kw.arg is None:
            return None
        try:
            parsed[kw.arg] = ast.literal_eval(kw.value)
        except Exception:
            return None
    return parsed


def _load_json_like(text: str) -> Any:
    """Cố gắng phân tích JSON / văn bản dạng JSON do LLM trả về."""

    candidates: list[str] = []
    stripped = text.strip()
    if stripped:
        candidates.append(stripped)
    first_obj = _extract_first_json_object(stripped)
    if first_obj and first_obj != stripped:
        candidates.append(first_obj)

    last_error: Exception | None = None
    preferred_error: Exception | None = None
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except Exception as e:
            last_error = e
            if preferred_error is None:
                preferred_error = e

        repaired = _repair_json_like(candidate)
        try:
            return json.loads(repaired)
        except Exception as e:
            last_error = e
            if preferred_error is None:
                preferred_error = e

        python_like = _replace_json_literals_for_python(repaired)
        try:
            return ast.literal_eval(python_like)
        except Exception as e:
            last_error = e

        call_kwargs = _parse_python_call_kwargs(python_like)
        if call_kwargs is not None:
            return call_kwargs

    if preferred_error is not None:
        raise ValueError("Failed to parse LLM output as JSON-like text") from preferred_error
    if last_error is not None:
        raise ValueError("Failed to parse LLM output as JSON-like text") from last_error
    raise ValueError("Empty output from LLM")


class AgentBase(ABC, Generic[T]):
    """Lớp base Agent chung: lớp con cố định prompt_template và output_model."""

    enable_thinking: bool = True

    def __init__(
        self,
        model: BaseChatModel,
        *,
        structured_output_method: str = STRUCTURED_OUTPUT_METHOD,
        agent_kwargs: dict[str, Any] | None = None,
    ) -> None:
        self._model = model
        self._model.bind(extra_body={"enable_thinking": self.enable_thinking})
        self._structured_output_method = structured_output_method
        self._agent_kwargs = dict(agent_kwargs or {})
        self._structured_chain: Runnable | None = None

    @property
    @abstractmethod
    def prompt_template(self) -> PromptTemplate:
        ...

    @property
    @abstractmethod
    def output_model(self) -> type[T]:
        ...

    @property
    def system_prompt(self) -> str:
        """Lớp con có thể ghi đè: prompt hệ thống (đóng vai message system / chỉ thị ưu tiên cao)."""
        return ""

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """Lớp con có thể ghi đè: chuẩn hóa dict do LLM trả về thành cấu trúc mà output_model cần. Mặc định là identity."""
        return data

    def render_prompt(self, **kwargs: Any) -> str:
        """Kết xuất prompt đầy đủ (chuỗi cuối cùng sau khi điền biến)."""

        prompt = self.prompt_template
        try:
            user_prompt = prompt.format(**kwargs)
        except KeyError as e:
            missing = str(e).strip("'")
            raise ValueError(
                f"render_prompt thiếu biến: {missing}. "
                f"Cần: {list(prompt.input_variables)}"
            ) from e

        sys = (self.system_prompt or "").strip()
        if not sys:
            return user_prompt
        return f"{sys}\n\n{user_prompt}".strip()

    def _render_user_prompt(self, **kwargs: Any) -> str:
        """Chỉ kết xuất prompt người dùng (không gồm system_prompt)."""
        prompt = self.prompt_template
        try:
            return prompt.format(**kwargs)
        except KeyError as e:
            missing = str(e).strip("'")
            raise ValueError(
                f"render_prompt thiếu biến: {missing}. "
                f"Cần: {list(prompt.input_variables)}"
            ) from e

    def _as_messages_input(self, **kwargs: Any) -> dict[str, Any]:
        """Đổi kwargs thành dạng input messages mà agent LangChain cần."""
        return {
            "messages": [
                {
                    "role": "user",
                    "content": self._render_user_prompt(**kwargs),
                }
            ]
        }

    @staticmethod
    def _last_message_content(state: Any) -> str:
        """
        Lấy content của tin nhắn cuối cùng từ state do create_agent trả về.
        Nếu không phải state chuẩn, cố gắng rút về str(state).
        """
        if isinstance(state, dict):
            messages = state.get("messages")
            if isinstance(messages, list) and messages:
                last = messages[-1]
                # Tương thích cả dict message lẫn BaseMessage
                if isinstance(last, dict):
                    content = last.get("content")
                    if content is not None:
                        return str(content)
                if hasattr(last, "content"):
                    return str(getattr(last, "content"))
        if hasattr(state, "content"):
            return str(getattr(state, "content"))
        return str(state)

    def _extract_structured_response(self, state: Any) -> Any:
        """
        Lấy structured_response từ state do create_agent trả về.
        Theo quy ước trong tài liệu LangChain: structured response nằm ở state['structured_response'].
        """
        if isinstance(state, dict) and "structured_response" in state:
            return state.get("structured_response")
        return state

    def create_agent(self, *, structured_output: type[BaseModel] | None = None) -> Runnable:
        """
        Tạo runnable có thể chạy:
        - Ưu tiên dùng `langchain.agents.create_agent`, truyền `system_prompt` làm prompt hệ thống
        - Khi structured_output khác None, dùng `response_format=ToolStrategy(structured_output)` để model ra kết quả có cấu trúc
        - Nếu môi trường chưa cài langchain, hạ cấp về: RunnableLambda(render_user_prompt) | model (với structured thì dùng with_structured_output)
        """

        # --- preferred path: langchain create_agent + ToolStrategy ---
        try:
            from langchain.agents import create_agent as _lc_create_agent  # type: ignore

            kwargs = dict(self._agent_kwargs)
            if structured_output is not None:
                kwargs["response_format"] = structured_output
            agent = _lc_create_agent(
                model=self._model,
                system_prompt=(self.system_prompt or ""),
                **kwargs,
            )
            # create_agent nhận {"messages": [...]} làm input
            return RunnableLambda(lambda inputs: self._as_messages_input(**inputs)) | cast(Runnable, agent)
        except Exception:
            # --- fallback path: no langchain available ---
            llm: Runnable = cast(Runnable, self._model)
            if structured_output is not None:
                with_structured = getattr(self._model, "with_structured_output", None)
                if callable(with_structured):
                    try:
                        llm = cast(
                            Runnable,
                            with_structured(
                                structured_output,
                                method=self._structured_output_method,
                            ),
                        )
                    except NotImplementedError:
                        # Một số lớp con của BaseChatModel (như mock trong test) không có with_structured_output; quay về phân tích đầu ra thô.
                        pass
            return RunnableLambda(lambda inputs: self._render_user_prompt(**inputs)) | llm

    def _build_structured_chain(self) -> Runnable | None:
        """Dựng structured output chain (ưu tiên ToolStrategy; thiếu langchain thì dùng with_structured_output)."""
        return self.create_agent(structured_output=self.output_model)

    def _get_structured_chain(self) -> Runnable | None:
        if self._structured_chain is not None:
            return self._structured_chain
        self._structured_chain = self._build_structured_chain()
        return self._structured_chain

    def run(self, **kwargs: Any) -> str:
        """Gọi agent, trả về chuỗi thô (thường là JSON)."""
        chain: Runnable = self.create_agent()
        result = chain.invoke(kwargs)
        return self._last_message_content(result)

    async def arun(self, **kwargs: Any) -> str:
        """Gọi agent async."""
        chain: Runnable = self.create_agent()
        result = await chain.ainvoke(kwargs)
        return self._last_message_content(result)

    def format_output(self, raw: str) -> T:
        """Phân tích đầu ra thô của agent thành kết quả có cấu trúc (JSON → chuẩn hóa → Pydantic)."""
        output_model = self.output_model
        json_str = _extract_json_from_text(raw)
        data = _load_json_like(json_str)
        if isinstance(data, dict):
            data = self._normalize(data)
        return output_model.model_validate(data)

    def extract(self, **kwargs: Any) -> T:
        """Thực thi: ưu tiên with_structured_output, không thì run + format_output."""
        chain = self._get_structured_chain()
        if chain is not None:
            try:
                state = chain.invoke(kwargs)
                result = self._extract_structured_response(state)
                if isinstance(result, self.output_model):
                    return cast(T, result)
                if isinstance(result, dict):
                    data = self._normalize(result)
                    return self.output_model.model_validate(data)
            except Exception:
                pass
        return self.format_output(self.run(**kwargs))

    async def aextract(self, **kwargs: Any) -> T:
        """Thực thi async."""
        chain = self._get_structured_chain()
        if chain is not None:
            try:
                state = await chain.ainvoke(kwargs)
                result = self._extract_structured_response(state)
                if isinstance(result, self.output_model):
                    return cast(T, result)
                if isinstance(result, dict):
                    data = self._normalize(result)
                    return self.output_model.model_validate(data)
            except Exception:
                pass
        return self.format_output(await self.arun(**kwargs))
