"""Engine và phiên không đồng bộ SQLAlchemy."""

from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


def _build_engine() -> AsyncEngine:
    return create_async_engine(
        settings.database_url,
        echo=settings.debug,
        future=True,
    )


def _build_session_maker(bind_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


class _AsyncSessionMakerProxy:
    """Proxy sessionmaker có thể gắn lại.

    dưới chế độ Celery prefork, tiến trình con worker không thể tiếp tục tái sử dụng
    async engine / sessionmaker. Ở đây giữ đối tượng import ổn định, đồng thời cho phép ở tiến trình con
    Sau khi khởi động, gắn lại sessionmaker phía dưới.
    """

    def __init__(self, maker: async_sessionmaker[AsyncSession]) -> None:
        self._maker = maker

    def configure(self, maker: async_sessionmaker[AsyncSession]) -> None:
        self._maker = maker

    def __call__(self, *args: Any, **kwargs: Any) -> AsyncSession:
        return self._maker(*args, **kwargs)


engine = _build_engine()
async_session_maker = _AsyncSessionMakerProxy(_build_session_maker(engine))


class Base(DeclarativeBase):
    """Lớp cơ sở của tất cả mô hình ORM."""

    pass


async def init_db() -> None:
    """Tạo mọi bảng (dùng cho phát triển/di trú)."""
    # Đảm bảo các mô hình ORM đã được import, từ đó đăng ký vào Base.metadata
    import app.models.llm  # noqa: F401  # pylint: disable=unused-import
    import app.models.studio  # noqa: F401
    import app.models.task  # noqa: F401
    import app.models.task_links  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Đóng kết nối cơ sở dữ liệu."""
    await engine.dispose()


def reset_db_runtime() -> None:
    """khôi phục lại engine và sessionmaker trong tiến trình con Celery worker.

    diều này tránh prefork kế thừa async engine từ tiến trình cha, khiến object kết nối và event loop
    Rối loạn ràng buộc, kích hoạt Future attached to a different loop.
    """

    global engine

    engine = _build_engine()
    async_session_maker.configure(_build_session_maker(engine))
