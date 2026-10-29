---
title: "FAQ"
weight: 3
description: "Các vấn đề phát triển và bảo trì website phổ biến."
---

## Khi backend chưa chạy, tại sao frontend không thể cập nhật OpenAPI?

Bởi vì `pnpm run openapi:update` sẽ gọi trước `/openapi.json` của backend cục bộ.

## Khi phát triển nhất định phải dùng Docker không?

Chưa chắc. Cả front lẫn back đều khởi động được trực tiếp cục bộ, Docker phù hợp hơn cho liên động đầy đủ và quản lý dịch vụ phụ thuộc.

## Tại sao trang web chính cần Go?

vì Hextra được lấy qua Hugo Modules, phân tích module phụ thuộc vào bộ công cụ Go.

## Vì sao phiên bản Hugo cục bộ cũng cần chú ý?

Vì Hextra yêu cầu phiên bản Hugo tối thiểu. Phiên bản quá thấp, template theme có thể không tải được bình thường.
