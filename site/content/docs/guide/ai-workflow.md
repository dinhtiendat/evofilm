---
title: "Quy trình AI"
weight: 5
description: "Hiểu cách các tầng chains, services và task tiếp nhận năng lực AI."
---

Năng lực AI của Jellyfish chủ yếu gồm ba phần:

- Xử lý văn bản và trích xuất thực thể
- Bản nháp phân cảnh và tạo prompt
- Tạo tác vụ hình ảnh / video và theo dõi trạng thái

Các năng lực này chủ yếu nằm ở phía sau trong `app/chains/`, `app/services/` và `app/core/tasks/`.

## Cách hiểu cấu trúc

### `chains/`

Chịu trách nhiệm định nghĩa Prompt, Agent và sơ đồ workflow, thiên về "cách tư duy và điều phối".

### `services/`

phụ trách nối chuỗi thực thể nghiệp vụ, bản ghi cơ sở dữ liệu và năng lực AI, nghiêng về "cách sử dụng AI trong hệ thống".

### `core/tasks/`

Chịu trách nhiệm logic tác vụ ảnh / video gần tầng thực thi hơn, thiên về "làm thế nào để thực sự khởi động tác vụ và theo dõi trạng thái".
