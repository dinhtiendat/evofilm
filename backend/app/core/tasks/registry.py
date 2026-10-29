"""trung tâm đăng ký executor tác vụ:điều phối theo task_kind + provider_key."""

from __future__ import annotations

from collections.abc import Callable
from threading import RLock

from app.core.task_manager.types import BaseTask

TaskFactory = Callable[..., BaseTask]

_FACTORIES: dict[tuple[str, str], TaskFactory] = {}
_LOCK = RLock()


def _norm(value: str) -> str:
    return (value or "").strip().lower()


def register_task_adapter(task_kind: str, provider_key: str, factory: TaskFactory) -> None:
    """Đăng ký executor tác vụ; đăng ký lặp key+factory giống nhau coi là idempotent."""

    tk = _norm(task_kind)
    pk = _norm(provider_key)
    if not tk or not pk:
        raise ValueError("task_kind and provider_key must be non-empty")
    key = (tk, pk)
    with _LOCK:
        existing = _FACTORIES.get(key)
        if existing is not None and existing is not factory:
            raise ValueError(f"task adapter conflict for task_kind={tk!r}, provider_key={pk!r}")
        _FACTORIES[key] = factory


def resolve_task_adapter(task_kind: str, provider_key: str) -> TaskFactory:
    """Phân tích trình thực thi tác vụ; chưa đăng ký thì ném lỗi rõ ràng."""

    key = (_norm(task_kind), _norm(provider_key))
    with _LOCK:
        factory = _FACTORIES.get(key)
    if factory is None:
        raise ValueError(f"Unsupported provider/task adapter: task_kind={key[0]!r}, provider={key[1]!r}")
    return factory


def list_registered_task_adapters(task_kind: str | None = None) -> list[tuple[str, str]]:
    """Trả về danh sách adapter đã đăng ký (dùng cho chẩn đoán/thử nghiệm)."""

    tk = _norm(task_kind) if task_kind else None
    with _LOCK:
        keys = list(_FACTORIES.keys())
    if tk is not None:
        keys = [item for item in keys if item[0] == tk]
    return sorted(keys)
