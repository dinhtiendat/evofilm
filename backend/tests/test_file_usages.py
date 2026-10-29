"""Dịch vụ file_usages: điều kiện scope (unit test nhẹ)."""

from __future__ import annotations

from app.services.studio import file_usages as fu


def test_scope_filters_empty_when_no_titles() -> None:
    assert fu._scope_filters(project_id="p1", chapter_title=None, shot_title=None) == []


def test_scope_filters_chapter_only() -> None:
    conds = fu._scope_filters(project_id="p1", chapter_title="  Chương một  ", shot_title=None)
    assert len(conds) == 1


def test_scope_filters_shot_only() -> None:
    conds = fu._scope_filters(project_id="p1", chapter_title=None, shot_title="Phân cảnh A")
    assert len(conds) == 1


def test_scope_filters_chapter_and_shot() -> None:
    conds = fu._scope_filters(project_id="p1", chapter_title="Chương một", shot_title="Phân cảnh A")
    assert len(conds) == 1
