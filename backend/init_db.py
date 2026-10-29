import asyncio

from app.core.db import init_db, close_db


async def _main() -> None:
    """Khởi tạo cơ sở dữ liệu, tạo tất cả bảng."""
    await init_db()
    await close_db()


if __name__ == "__main__":
    asyncio.run(_main())

