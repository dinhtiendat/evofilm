"""Mẫu thông báo lỗi chung: thống nhất các thông điệp not found / already exists / required, v.v."""

from __future__ import annotations

from collections.abc import Sequence


def entity_not_found(name: str) -> str:
    """Lỗi thực thể không tồn tại.。"""
    return f"{name} not found"


def entity_already_exists(name: str) -> str:
    """Lỗi thực thể đã tồn tại.。"""
    return f"{name} already exists"


def required_field(field: str, *, when: str | None = None) -> str:
    """Lỗi trường bắt buộc.。"""
    if when:
        return f"{field} is required for {when}"
    return f"{field} is required"


def invalid_choice(field: str, choices: Sequence[str]) -> str:
    """Lỗi giá trị trường bất hợp lệ.。"""
    return f"{field} must be one of: {'/'.join(choices)}"


def not_belong_to(child_field: str, parent_field: str) -> str:
    """Lỗi xác thực quan hệ sở hữu.。"""
    return f"{child_field} does not belong to given {parent_field}"


def relation_mismatch(child_field: str, parent_field: str) -> str:
    """Lỗi quan hệ sở hữu không khớp (dùng chung).。"""
    return f"{child_field} does not belong to {parent_field}"
