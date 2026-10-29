"""Điểm vào đăng ký cấp ứng dụng: khởi tạo thống nhất năng lực provider và task executor (đều idempotent)."""

from __future__ import annotations


def bootstrap_all_registries() -> None:
    """Chỉ cần gọi một lần khi khởi động hoặc trong đường dẫn lazy; thứ tự cố định: provider trước task adapter."""
    from app.core.tasks.bootstrap import bootstrap_task_adapters
    from app.services.llm.provider_bootstrap import bootstrap_builtin_providers

    bootstrap_builtin_providers()
    bootstrap_task_adapters()
