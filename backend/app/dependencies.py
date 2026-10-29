"""Dependency injection cho FastAPI."""

from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException
from langchain_core.language_models.chat_models import BaseChatModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import async_session_maker
from app.services.llm.resolver import build_default_text_llm


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Cung cấp phiên database async."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_llm(db: AsyncSession = Depends(get_db)) -> BaseChatModel:
    """Cung cấp LLM văn bản mặc định (ChatOpenAI)."""
    return await build_default_text_llm(db, thinking=True)

async def get_nothinking_llm(db: AsyncSession = Depends(get_db)) -> BaseChatModel:
    """Cung cấp LLM văn bản mặc định (ChatOpenAI, tắt thinking)."""
    return await build_default_text_llm(db, thinking=False)


class _ImageHttpRunnable:
    """Runnable sinh ảnh tối giản: đọc cấu hình từ biến môi trường, gọi HTTP tới service sinh ảnh bên ngoài."""

    def __init__(self, *, base_url: str, api_key: str, timeout_s: float = 60.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout_s = timeout_s

    def invoke(self, payload: dict) -> dict:  # noqa: ANN001
        try:
            import httpx
        except ImportError as e:  # pragma: no cover
            raise HTTPException(status_code=503, detail="Install httpx to enable image generation") from e
        with httpx.Client(timeout=self._timeout_s) as client:
            r = client.post(
                self._base_url,
                headers={"Authorization": f"Bearer {self._api_key}"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
            return data if isinstance(data, dict) else {"images": data}

    async def ainvoke(self, payload: dict) -> dict:  # noqa: ANN001
        try:
            import httpx
        except ImportError as e:  # pragma: no cover
            raise HTTPException(status_code=503, detail="Install httpx to enable image generation") from e
        async with httpx.AsyncClient(timeout=self._timeout_s) as client:
            r = await client.post(
                self._base_url,
                headers={"Authorization": f"Bearer {self._api_key}"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
            return data if isinstance(data, dict) else {"images": data}
