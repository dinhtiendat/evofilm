---
title: "Cài đặt Docker"
weight: 3
description: "khởi động toàn bộ phụ thuộc và dịch vụ bằng Docker Compose."
---

## Cấu thành dịch vụ

- Front
- Backend
- MySQL
- RustFS

## Cách khởi động

```bash
cp deploy/compose/.env.example deploy/compose/.env
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up --build
```

## Địa chỉ truy cập mặc định

- Phía trước: `http://localhost:7788`
- Backend:`http://localhost:8000`
- RustFS Console：`http://localhost:9001`

## Mô tả

Lần khởi động đầu tiên sẽ tự khởi tạo cơ sở dữ liệu và nạp dữ liệu mẫu prompt.
