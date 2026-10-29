"""tác vụ sinh video (Task): nối OpenAI Videos API và sinh nội dung của Volcano Ark.

Chi tiết HTTP nằm trong `app.core.integrations`; module này giữ nhịp truy vấn lặp và hợp đồng BaseTask.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from typing import Any, AsyncIterator

from app.core.integrations.openai.video import OpenAIVideoApiAdapter
from app.core.integrations.volcengine.video import VolcengineVideoApiAdapter
from app.core.contracts.provider import ProviderConfig
from app.core.tasks.registry import resolve_task_adapter
from app.core.contracts.video_generation import VideoGenerationInput, VideoGenerationResult
from app.core.task_manager.types import BaseTask

__all__ = [
    "VideoGenerationInput",
    "VideoGenerationResult",
    "AbstractVideoGenerationTask",
    "OpenAIVideoGenerationTask",
    "VolcengineVideoGenerationTask",
    "VideoGenerationTask",
]


class AbstractVideoGenerationTask(BaseTask, ABC):
    """Lớp cơ sở của tác vụ tạo video: trạng thái chung và run/status/is_done/get_result."""

    def __init__(
        self,
        *,
        provider_config: ProviderConfig,
        input_: VideoGenerationInput,
        poll_interval_s: float = 2.0,
        timeout_s: float = 120.0,
    ) -> None:
        self._cfg = provider_config
        self._input = input_
        self._poll_interval_s = poll_interval_s
        self._timeout_s = timeout_s
        self._provider_task_id: str | None = None
        self._result: VideoGenerationResult | None = None
        self._error: str = ""

    async def _sleep_poll(self) -> None:
        await asyncio.sleep(self._poll_interval_s)

    @abstractmethod
    async def _create_task(self) -> None:
        """Khởi tạo yêu cầu tạo tác vụ của nhà cung cấp, và đặt self._provider_task_id."""

    @abstractmethod
    async def _poll_and_get_result(self) -> VideoGenerationResult:
        """Truy vấn lặp đến trạng thái cuối rồi phân tích thành VideoGenerationResult."""

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
            "task": "video_generation",
            "provider": self._cfg.provider,
            "provider_task_id": self._provider_task_id,
            "done": await self.is_done(),
            "has_result": self._result is not None,
            "error": self._error,
            "status": self._result.status if self._result else None,
        }

    async def is_done(self) -> bool:  # type: ignore[override]
        return self._result is not None or bool(self._error)

    async def get_result(self) -> VideoGenerationResult | None:  # type: ignore[override]
        return self._result


class OpenAIVideoGenerationTask(AbstractVideoGenerationTask):
    """OpenAI Videos:adapter phụ trách HTTP, Task phụ trách chu kỳ poll."""

    def __init__(
        self,
        *,
        adapter: OpenAIVideoApiAdapter | None = None,
        provider_config: ProviderConfig,
        input_: VideoGenerationInput,
        poll_interval_s: float = 2.0,
        timeout_s: float = 120.0,
    ) -> None:
        super().__init__(
            provider_config=provider_config,
            input_=input_,
            poll_interval_s=poll_interval_s,
            timeout_s=timeout_s,
        )
        self._adapter = adapter or OpenAIVideoApiAdapter()

    async def _create_task(self) -> None:
        self._provider_task_id = await self._adapter.create_video(
            cfg=self._cfg,
            input_=self._input,
            timeout_s=self._timeout_s,
        )

    async def _poll_and_get_result(self) -> VideoGenerationResult:
        video_id = self._provider_task_id or ""
        if not video_id:
            raise RuntimeError("OpenAI poll missing provider task id")

        base_url = (self._cfg.base_url or "https://api.openai.com/v1").rstrip("/")
        status_val = ""
        while True:
            meta = await self._adapter.get_video(
                cfg=self._cfg,
                video_id=video_id,
                timeout_s=self._timeout_s,
            )
            status_val = str(meta.get("status") or "")
            if status_val in ("completed", "failed"):
                if status_val == "failed":
                    raise RuntimeError(f"OpenAI video failed: {meta.get('error')!r}")
                break
            await self._sleep_poll()

        return VideoGenerationResult(
            url=f"{base_url}/videos/{video_id}/content",
            file_id=None,
            provider_task_id=video_id,
            provider="openai",
            status=status_val or "completed",
        )


class VolcengineVideoGenerationTask(AbstractVideoGenerationTask):
    """tác vụ sinh nội dung Volcano:adapter phụ trách HTTP, Task phụ trách poll."""

    def __init__(
        self,
        *,
        adapter: VolcengineVideoApiAdapter | None = None,
        provider_config: ProviderConfig,
        input_: VideoGenerationInput,
        poll_interval_s: float = 2.0,
        timeout_s: float = 120.0,
    ) -> None:
        super().__init__(
            provider_config=provider_config,
            input_=input_,
            poll_interval_s=poll_interval_s,
            timeout_s=timeout_s,
        )
        self._adapter = adapter or VolcengineVideoApiAdapter()

    async def _create_task(self) -> None:
        self._provider_task_id = await self._adapter.create_contents_task(
            cfg=self._cfg,
            input_=self._input,
            timeout_s=self._timeout_s,
        )

    async def _poll_and_get_result(self) -> VideoGenerationResult:
        task_id = self._provider_task_id or ""
        if not task_id:
            raise RuntimeError("Volcengine poll missing provider task id")

        base_url = (self._cfg.base_url or "https://ark.cn-beijing.volces.com/api/v3").rstrip("/")
        status_val = ""
        video_url: str | None = None
        while True:
            meta = await self._adapter.get_contents_task(
                cfg=self._cfg,
                task_id=task_id,
                timeout_s=self._timeout_s,
            )
            status_val = str(meta.get("status") or "")
            content = meta.get("content") or {}
            if isinstance(content, dict):
                vu = content.get("video_url")
                if isinstance(vu, str) and vu:
                    video_url = vu
            if status_val in ("succeeded", "failed", "cancelled"):
                if status_val != "succeeded":
                    raise RuntimeError(f"Volcengine task not succeeded: status={status_val!r} meta={meta!r}")
                break
            await self._sleep_poll()

        if not video_url:
            video_url = f"{base_url}/contents/generations/tasks/{task_id}"

        return VideoGenerationResult(
            url=video_url,
            file_id=None,
            provider_task_id=task_id,
            provider="volcengine",
            status=status_val or "succeeded",
        )


class VideoGenerationTask(BaseTask):
    """điều phối theo provider tới thực hiện OpenAI / Volcano; ký hiệu hàm dựng đối ngoại giữ nguyên."""

    def __init__(
        self,
        *,
        provider_config: ProviderConfig,
        input_: VideoGenerationInput,
        poll_interval_s: float = 2.0,
        timeout_s: float = 120.0,
    ) -> None:
        from app.bootstrap import bootstrap_all_registries

        bootstrap_all_registries()
        factory = resolve_task_adapter("video_generation", provider_config.provider)
        self._impl: AbstractVideoGenerationTask = factory(
            provider_config=provider_config,
            input_=input_,
            poll_interval_s=poll_interval_s,
            timeout_s=timeout_s,
        )  # type: ignore[assignment]

    @staticmethod
    def _build_openai_impl(
        *,
        provider_config: ProviderConfig,
        input_: VideoGenerationInput,
        poll_interval_s: float = 2.0,
        timeout_s: float = 120.0,
    ) -> AbstractVideoGenerationTask:
        return OpenAIVideoGenerationTask(
            provider_config=provider_config,
            input_=input_,
            poll_interval_s=poll_interval_s,
            timeout_s=timeout_s,
        )

    @staticmethod
    def _build_volcengine_impl(
        *,
        provider_config: ProviderConfig,
        input_: VideoGenerationInput,
        poll_interval_s: float = 2.0,
        timeout_s: float = 120.0,
    ) -> AbstractVideoGenerationTask:
        return VolcengineVideoGenerationTask(
            provider_config=provider_config,
            input_=input_,
            poll_interval_s=poll_interval_s,
            timeout_s=timeout_s,
        )

    async def run(self, *args: Any, **kwargs: Any) -> AsyncIterator[Any] | None:  # type: ignore[override]
        return await self._impl.run(*args, **kwargs)

    async def status(self) -> dict[str, Any]:  # type: ignore[override]
        return await self._impl.status()

    async def is_done(self) -> bool:  # type: ignore[override]
        return await self._impl.is_done()

    async def get_result(self) -> VideoGenerationResult | None:  # type: ignore[override]
        return await self._impl.get_result()
