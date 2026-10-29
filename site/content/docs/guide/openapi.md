---
title: "OpenAPI"
weight: 4
description: "Hiểu quy trình sinh và đồng bộ API giữa frontend và backend."
---

Hàm yêu cầu và kiểu phía frontend được tạo từ tài liệu OpenAPI phía backend.

## Thư mục tạo

- `front/openapi.json`
- `front/src/services/generated/`

## Lệnh cập nhật

```bash
cd front
pnpm run openapi:update
```

## Quy trình tạo

1. Trước tiên kéo `/openapi.json` từ backend
2. Ghi vào `front/openapi.json`
3. Sinh lại `front/src/services/generated/`

## Khi nào cần cập nhật

- Thêm route phía sau
- Sửa mô hình yêu cầu hoặc phản hồi phía sau
- Phía trước cần dùng các trường giao diện mới
