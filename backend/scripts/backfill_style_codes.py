#!/usr/bin/env python3
"""Di trú mã phong cách cũ (tiếng Trung) sang mã mới (tiếng Anh lowercase).

Bối cảnh: ProjectStyle/ProjectVisualStyle trước dùng giá trị tiếng Trung
("真人都市", "现实"...) làm mã dữ liệu; sau khi chuyển sang mã tiếng Anh
("real_people_city", "live_action"...), các dòng cũ trong DB không còn
validate được với enum mới, khiến các endpoint đọc entity (vd.
GET /api/v1/studio/entities/actor) trả 500.

Script chạy một lần, cập nhật các dòng còn lưu mã cũ trong 5 bảng:
projects, scenes, props, costumes, actors (cột style, visual_style).
Dùng UPDATE SQL thô (text()) để tránh enum type của SQLAlchemy ép giá trị,
và an toàn cho cả MySQL/SQLite. Idempotent: chạy lại không làm gì thêm.

Cách dùng (trong thư mục backend) ::

    uv run python scripts/backfill_style_codes.py

Trong docker (image backend đã chứa script) ::

    docker compose exec backend python scripts/backfill_style_codes.py
"""

from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.core.db import async_session_maker

# Bản đồ mã cũ -> mã mới (khớp giá trị enum hiện tại trong app.models.types).
STYLE_CODE_MAP: dict[str, str] = {
    "真人都市": "real_people_city",
    "真人科幻": "real_people_scifi",
    "真人古装": "real_people_ancient",
    "动漫科幻": "anime_scifi",
    "动漫3D": "anime_3d",
    "国漫": "guoman",
    "水墨画": "ink_wash",
}
VISUAL_STYLE_CODE_MAP: dict[str, str] = {
    "现实": "live_action",
    "动漫": "anime",
}

# Các bảng có cột style/visual_style (SQLAlchemy __tablename__).
TABLES: tuple[str, ...] = ("projects", "scenes", "props", "costumes", "actors")


async def main() -> None:
    async with async_session_maker() as session:
        migrated = 0
        for table in TABLES:
            for old, new in STYLE_CODE_MAP.items():
                res = await session.execute(
                    text(
                        f"UPDATE {table} SET style = :new, "
                        f"updated_at = CURRENT_TIMESTAMP WHERE style = :old"
                    ),
                    {"new": new, "old": old},
                )
                migrated += res.rowcount or 0
            for old, new in VISUAL_STYLE_CODE_MAP.items():
                res = await session.execute(
                    text(
                        f"UPDATE {table} SET visual_style = :new, "
                        f"updated_at = CURRENT_TIMESTAMP WHERE visual_style = :old"
                    ),
                    {"new": new, "old": old},
                )
                migrated += res.rowcount or 0
        await session.commit()
        print(f"backfill_style_codes: {migrated} dòng đã cập nhật")


if __name__ == "__main__":
    asyncio.run(main())
