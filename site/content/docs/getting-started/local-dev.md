---
title: "Phát triển cục bộ"
weight: 2
description: "Khởi động frontend và backend, hoàn thành kiểm thử liên động cục bộ."
---

## Khởi động backend

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Khởi động frontend

```bash
cd front
pnpm install
pnpm dev
```

## Cổng mặc định

- Phía trước: `http://localhost:7788`
- Backend:`http://localhost:8000`
- Swagger：`http://localhost:8000/docs`

## Cập nhật OpenAPI

```bash
cd front
pnpm run openapi:update
```

## Xem trước cục bộ trang chủ và trang tài liệu

```bash
cd site
hugo mod tidy
hugo server --buildDrafts --disableFastRender
```

## Thứ tự chạy tổng duyệt được khuyến nghị

1. Khởi động backend, xác nhận /docs và /health hoạt động bình thường.
2. Khởi động phía trước, xác nhận trang truy cập được và có thể gọi phía sau.
3. Nếu đã sửa định nghĩa interface, hãy chạy lại `openapi:update`.
4. Nếu đồng thời đang bảo trì trang chủ, hãy khởi động riêng preview `site/`.
