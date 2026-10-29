---
title: "Phiên giải mô hình mặc định của LLM"
weight: 35
description: "Nguồn và thứ tự phân tích mô hình LLM mặc định hiện hiệu lực."
---

bài này ghi lại quy tắc mô hình mặc định (text / image / video) đang hiệu lực thật sự hiện tại.

## Nguồn sự thật duy nhất

- Mô hình mặc định được duy nhất một bảng singleton `model_settings` quản lý:
  - `default_text_model_id`
  - `default_image_model_id`
  - `default_video_model_id`
- bảng `models` không còn mang ngữ nghĩa "mô hình mặc định", `models.is_default` đã ngừng hiệu lực.

## Quy tắc phân tích

- Runtime đọc các trường tương ứng của `model_settings` theo từng hạng mục.
- Nếu ID mô hình mặc định tương ứng chưa được cấu hình, dịch vụ sẽ trả về `503` (`No default model configured for category=...`).
- Nếu đã cấu hình ID mô hình nhưng mô hình không tồn tại, service trả về `503` (`Configured default model not found: ...`).

## Điểm vào quản lý

- Mô hình mặc định chỉ được duy trì qua giao diện `LLM Model Settings` (`/api/v1/llm/model-settings`).
- Danh sách mô hình (`/api/v1/llm/models`) chỉ duy trì thông tin thực thể mô hình (tên, hạng mục, nhà cung cấp, tham số, v.v.), không còn cung cấp ngữ nghĩa chuyển đổi mặc định.
