from app.core.db import async_session_maker, reset_db_runtime


def test_async_session_maker_proxy_survives_runtime_reset() -> None:
    before_proxy_id = id(async_session_maker)

    reset_db_runtime()

    after_proxy_id = id(async_session_maker)
    session = async_session_maker()
    try:
        assert before_proxy_id == after_proxy_id
        assert session.__class__.__name__ == "AsyncSession"
    finally:
        # Ở đây chỉ kiểm chứng hành vi proxy và gắn lại, không thực sự mở kết nối.
        session.sync_session.close()
