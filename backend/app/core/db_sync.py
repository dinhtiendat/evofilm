"""Engine và phiên (session) đồng bộ của SQLAlchemy.

Để Celery worker sử dụng, tránh để worker tiến trình đồng bộ phải tải runtime DB async.
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.core.db import Base


def _to_sync_database_url(url: str) -> str:
    if url.startswith("mysql+aiomysql://"):
        return "mysql+pymysql://" + url.removeprefix("mysql+aiomysql://")
    if url.startswith("sqlite+aiosqlite:///"):
        return "sqlite:///" + url.removeprefix("sqlite+aiosqlite:///")
    return url


def _build_sync_engine() -> Engine:
    return create_engine(
        _to_sync_database_url(settings.database_url),
        echo=settings.debug,
        future=True,
        pool_pre_ping=True,
    )


engine_sync = _build_sync_engine()
sync_session_maker = sessionmaker(
    bind=engine_sync,
    class_=Session,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

__all__ = [
    "Base",
    "engine_sync",
    "sync_session_maker",
]
