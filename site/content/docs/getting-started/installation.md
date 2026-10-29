---
title: "Hướng dẫn cài đặt"
weight: 1
description: "Môi trường nền tảng và phụ thuộc cần thiết để cài đặt Jellyfish."
---

## Yêu cầu môi trường

- Hugo extended `>= 0.146.0` (trang chủ và trang tài liệu)
- Go `>= 1.22`(dùng để Hugo Modules lấy Hextra)
- Node.js và pnpm
- Python 3.11+
- `uv`
- Docker và Docker Compose (tùy chọn)

## Lấy mã nguồn

```bash
git clone https://github.com/Forget-C/Jellyfish.git
cd Jellyfish
```

## Gợi ý thư mục

Nếu bạn chỉ dùng ứng dụng, hãy ưu tiên quan tâm:

- `front/`
- `backend/`
- `deploy/`

Nếu bạn còn duy trì trang chủ và trang tài liệu, hãy chú ý thêm:

- `site/`

## Cài đặt phụ thuộc phía trước

```bash
cd front
pnpm install
```

## Cài đặt phụ thuộc phía sau

```bash
cd backend
uv sync
```

## Cài đặt module theme trang

```bash
cd site
hugo mod tidy
```

## Thứ tự cài đặt được khuyến nghị

1. Trước tiên cài phụ thuộc phía sau, đảm bảo API chạy được.
2. Sau đó cài phụ thuộc phía trước, dùng để liên động cục bộ.
3. nếu cần duy trì trang chủ và tài liệu, hãy khởi tạo Hugo Modules của `site/` lần nữa.
