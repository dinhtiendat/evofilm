"""Tác vụ tạo ảnh (Task): đối kết OpenAI Images API và Volcengine (方舟) ImageGenerations.

Thực hiện HTTP của nhà cung cấp nằm trong `app.core.integrations`; module này giữ lại điều phối BaseTask và điều phối registry.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator

from app.core.integrations.openai.images import OpenAIImageApiAdapter
from app.core.integrations.volcengine.images import VolcengineImageApiAdapter
from app.core.contracts.image_generation import (
    ImageGenerationInput,
    ImageGenerationResult,
    ImageItem,
    InputImageRef,
    ResponseFormat,
)
from app.core.contracts.provider import ProviderConfig
from app.core.tasks.registry import resolve_task_adapter
from app.core.task_manager.types import BaseTask

# Tương thích: re-export các type từ module này, tránh phá vỡ from app.core.tasks.image_generation_tasks import ...
__all__ = [
    "ImageGenerationInput",
    "ImageGenerationResult",
    "ImageItem",
    "InputImageRef",
    "ResponseFormat",
    "AbstractImageGenerationTask",
    "OpenAIImageGenerationTask",
    "VolcengineImageGenerationTask",
    "ImageGenerationTask",
]


class AbstractImageGenerationTask(BaseTask, ABC):
    """Lớp trừu tượng tạo ảnh: subclass thực thi `_create_task` + `_poll_and_get_result`."""

    def __init__(
        self,
        *,
        provider_config: ProviderConfig,
        input_: ImageGenerationInput,
        timeout_s: float = 60.0,
    ) -> None:
        self._cfg = provider_config
        self._input = input_
        self._timeout_s = timeout_s
        self._provider_task_id: str | None = None
        self._result: ImageGenerationResult | None = None
        self._error: str = ""

    @abstractmethod
    async def _create_task(self) -> None:
        """Khởi tạo yêu cầu tới nhà cung cấp (hoặc ủy quyền cho adapter)."""

    @abstractmethod
    async def _poll_and_get_result(self) -> ImageGenerationResult:
        """Phân tích thành kết quả thống nhất."""

    async def run(self, *args: Any, **kwargs: Any) -> AsyncIterator[Any] | None:  # type: ignore[override]
        try:
            await self._create_task()
            self._result = await self._poll_and_get_result()
            if self._result is not None:
                self._provider_task_id = self._result.provider_task_id
        except Exception as exc:  # noqa: BLE001
            self._error = str(exc)
            self._result = None
        return None

    async def status(self) -> dict[str, Any]:  # type: ignore[override]
        return {
            "task": "image_generation",
            "provider": self._cfg.provider,
            "provider_task_id": self._provider_task_id,
            "done": await self.is_done(),
            "has_result": self._result is not None,
            "error": self._error,
            "status": self._result.status if self._result else None,
        }

    async def is_done(self) -> bool:  # type: ignore[override]
        return self._result is not None or bool(self._error)

    async def get_result(self) -> ImageGenerationResult | None:  # type: ignore[override]
        return self._result


class OpenAIImageGenerationTask(AbstractImageGenerationTask):
    """OpenAI Images:ủy quyền cho `OpenAIImageApiAdapter`."""

    def __init__(
        self,
        *,
        adapter: OpenAIImageApiAdapter | None = None,
        provider_config: ProviderConfig,
        input_: ImageGenerationInput,
        timeout_s: float = 60.0,
    ) -> None:
        super().__init__(provider_config=provider_config, input_=input_, timeout_s=timeout_s)
        self._adapter = adapter or OpenAIImageApiAdapter()
        self._deferred: ImageGenerationResult | None = None

    async def _create_task(self) -> None:
        self._deferred = await self._adapter.generate(
            cfg=self._cfg,
            inp=self._input,
            timeout_s=self._timeout_s,
        )

    async def _poll_and_get_result(self) -> ImageGenerationResult:
        assert self._deferred is not None
        return self._deferred


class VolcengineImageGenerationTask(AbstractImageGenerationTask):
    """Volcengine ImageGenerations: ủy quyền cho `VolcengineImageApiAdapter`."""

    def __init__(
        self,
        *,
        adapter: VolcengineImageApiAdapter | None = None,
        provider_config: ProviderConfig,
        input_: ImageGenerationInput,
        timeout_s: float = 60.0,
    ) -> None:
        super().__init__(provider_config=provider_config, input_=input_, timeout_s=timeout_s)
        self._adapter = adapter or VolcengineImageApiAdapter()
        self._deferred: ImageGenerationResult | None = None

    async def _create_task(self) -> None:
        self._deferred = await self._adapter.generate(
            cfg=self._cfg,
            inp=self._input,
            timeout_s=self._timeout_s,
        )

    async def _poll_and_get_result(self) -> ImageGenerationResult:
        assert self._deferred is not None
        return self._deferred


class ImageGenerationTask(BaseTask):
    """điều phối theo provider tới thực hiện OpenAI / Volcano; hàm dựng đối ngoại giữ nguyên như trước."""

    def __init__(
        self,
        *,
        provider_config: ProviderConfig,
        input_: ImageGenerationInput,
        timeout_s: float = 60.0,
    ) -> None:
        from app.bootstrap import bootstrap_all_registries

        bootstrap_all_registries()
        factory = resolve_task_adapter("image_generation", provider_config.provider)
        self._impl: AbstractImageGenerationTask = factory(
            provider_config=provider_config,
            input_=input_,
            timeout_s=timeout_s,
        )  # type: ignore[assignment]

    @staticmethod
    def _build_openai_impl(
        *,
        provider_config: ProviderConfig,
        input_: ImageGenerationInput,
        timeout_s: float = 60.0,
    ) -> AbstractImageGenerationTask:
        return OpenAIImageGenerationTask(
            provider_config=provider_config,
            input_=input_,
            timeout_s=timeout_s,
        )

    @staticmethod
    def _build_volcengine_impl(
        *,
        provider_config: ProviderConfig,
        input_: ImageGenerationInput,
        timeout_s: float = 60.0,
    ) -> AbstractImageGenerationTask:
        return VolcengineImageGenerationTask(
            provider_config=provider_config,
            input_=input_,
            timeout_s=timeout_s,
        )

    async def run(self, *args: Any, **kwargs: Any) -> AsyncIterator[Any] | None:  # type: ignore[override]
        return await self._impl.run(*args, **kwargs)

    async def status(self) -> dict[str, Any]:  # type: ignore[override]
        return await self._impl.status()

    async def is_done(self) -> bool:  # type: ignore[override]
        return await self._impl.is_done()

    async def get_result(self) -> ImageGenerationResult | None:  # type: ignore[override]
        return await self._impl.get_result()
