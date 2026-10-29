---
title: "Mô tả phía trước"
weight: 2
description: "Hiểu cách tổ chức trang frontend, tầng yêu cầu và quản lý trạng thái."
---

Phía trước nằm trong `front/`, dùng React 18, TypeScript, Vite và Ant Design. Cấu trúc cốt lõi như sau:

- `src/App.tsx`: Lối vào định tuyến
- `src/layouts/`: Bố cục toàn cục
- `src/pages/aiStudio/`: trang dự án, chương, phân cảnh, tài nguyên v.v.
- `src/services/`: client sinh từ OpenAPI và lớp bọc request
- `src/store/`: Trạng thái toàn cục

## Tư duy tổ chức trang

Trang frontend không được chia theo “thành phần kỹ thuật” mà chia theo miền nghiệp vụ:

- `project/`
- `chapter/`
- `shots/`
- `assets/`
- `prompts/`
- `files/`
- `models/`
- `agents/`

## Tầng yêu cầu

Phía trước chủ yếu liên lạc với phía sau thông qua mã OpenAPI sinh ra trong `front/src/services/generated/`.
diều này có nghĩa sau khi API phía sau thay đổi, phía trước nên đồng bộ chạy một lần `pnpm run openapi:update`.
