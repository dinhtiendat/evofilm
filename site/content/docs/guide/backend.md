---
title: "Mô tả phía sau"
weight: 3
description: "Hiểu trục chính của route backend, cấu trúc phân tầng và định vị dịch vụ."
---

Phía sau nằm trong `backend/`, xây dựng bằng FastAPI, SQLAlchemy, LangChain / LangGraph.
Đã hoàn tất một vòng "dọn dẹp tầng route + phân lớp service", toàn bộ cấu trúc rõ ràng hơn so với thời kỳ nguyên mẫu ban đầu.

Phân lớp cốt lõi:

- `app/main.py`: Lối vào ứng dụng
- `app/api/v1/`: Tầng định tuyến
- `app/services/`: Tầng dịch vụ nghiệp vụ
- `app/models/`: Mô hình ORM
- `app/schemas/`: Mô hình yêu cầu/phản hồi
- `app/chains/`: Agent, Prompt và quy trình

## Trục định tuyến chính

Các giao diện chính hiện tập trung ở:

- `studio`: các nghiệp vụ chính gồm dự án, chương, phân cảnh, tệp, prompt, trục thời gian...
- `llm`: Mô hình và khả năng nhà cung cấp
- `film`: Giao diện liên quan đến tạo
- `script-processing`: năng lực xử lý và trích xuất kịch bản

## Định vị tầng service

`app/services/` phụ trách tiếp nhận logic nghiệp vụ, không phải nhét toàn bộ logic phức tạp vào route.
các năng lực như ráp nháp phân cảnh, dựng tác vụ ảnh, phân tích mô hình đều đã được chuyển xuống tầng service.

Hiện tại có thể hiểu theo cách bên dưới:

- `services/common`
  - Kiểm tra dùng chung, CRUD dùng chung, văn bản lỗi công cộng
- `services/studio`
  - Đường chính Studio gồm dự án, chương, phân cảnh, tệp, tác vụ hình ảnh...
- `services/llm`
  - Quản lý Provider, Model, Settings
- `services/film`
  - Logic điều phối như tác vụ tạo video, prompt khung hình phân cảnh

## Phản hồi và kiểm thử

Các API backend hiện thống nhất dùng vỏ phản hồi `ApiResponse`, và quy ước:

- Tạo mới: `created_response(...)`
- Thành công thường:`success_response(...)`
- Phản hồi rỗng: `empty_response()`
- Phân trang: `paginated_response(...)`

lối vào test cũng đã thống nhất, có thể chạy trong thư mục `backend/` hoặc chạy ở thư mục gốc repo.

Lệnh khuyến nghị:

```bash
cd backend
uv run pytest -q
```

Nếu chỉ xác minh nhanh, cũng có thể ưu tiên chạy test vỏ phản ứng interface và test tầng service.
