---
title: "Cấu trúc dự án"
weight: 1
description: "nhanh chóng hiểu các thư mục top-level và chuỗi nghiệp vụ chính đang hiệu lực thật sự của Jellyfish hiện tại."
---

> Bài này thuộc tài liệu "Kiến trúc hiện tại", mô tả cấu trúc thư mục thực và phân tầng trách nhiệm của dự án hiện tại.

## Thư mục cấp trên cùng

```text
jellyfish/
├── backend/    # FastAPI, lớp dịch vụ, lớp mô hình, AI Work flow
├── front/      # React + Vite Trang làm việc frontend
├── deploy/     # Docker và Compose Cấu hình
├── docs/       # Tài liệu và chất liệu hình ảnh trong kho
└── site/       # Hugo website chính và trang tài liệu
```

## Chuỗi nghiệp vụ chính

```text
dự án -> chương -> phân cảnh -> Tài nguyên / Hình khung -> Trục thời gian
```

## Trách nhiệm phía trước

- Nhận trang bàn làm việc Studio
- Sử dụng OpenAPI Hợp tác client với backend
- Quản lý dự án, chương, phân cảnh, tài nguyên, mô hình và Agent liên quan UI

## Trách nhiệm phía sau

- cung cấp `studio / llm / film / script-processing` v.v. API
- Quản lý mô hình CSDL, lưu trữ tệp và trạng thái tác vụ
- Đạt `chains / services / core.tasks` gắn vào AI khả năng

## Ràng buộc phân tầng năng lực tạo

- Hợp đồng tạo chung (DTO vào/ra, cấu hình nhà cung cấp, v.v.) thống nhất đặt trong `app/core/contracts`.
- `app/core/tasks` chỉ giữ đóng gói tác vụ, điều phối và dàn dựng thực thi, không định nghĩa DTO chéo tầng.
- `app/core/integrations` chỉ thực hiện thích ứng giao thức nhà cung cấp, phụ thuộc `contracts`, không phụ thuộc module kiểu `tasks`.

## Trách nhiệm của site

- Trang chủ chính thức và giới thiệu sản phẩm
- Tài liệu cài đặt, phát triển, triển khai và đóng góp
- Sau này có thể nhận nhật ký phiên bản và thông báo cập nhật

## Đường dẫn đọc được khuyến nghị

1. Xem trước [Giải thích frontend](/docs/guide/frontend/)
2. Xem tiếp [Giải thích backend](/docs/guide/backend/)
3. Xem cuối [AI Work flow](/docs/guide/ai-workflow/)
