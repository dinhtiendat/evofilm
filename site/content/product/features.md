---
title: "Tổng quan tính năng"
weight: 1
description: "hiểu theo module các năng lực sản phẩm mà Jellyfish hiện tập trung bao phủ."
---

Jellyfish hiện tập trung bao phủ các nhóm năng lực sau:

- Quản lý dự án: thống nhất duy trì phong cách cấp dự án, seed, chương và trạng thái sản xuất.
- Mặt bàn chương: nhận xử lý đầu vào kịch bản, tóm gọn, trích xuất và chỉnh sửa phân cảnh.
- Hệ thống phân cảnh: hỗ trợ thông tin phân cảnh, lời thoại, ảnh khung hình và quản lý tài nguyên liên kết.
- Quản lý tài nguyên: quản lý và tái sử dụng tập trung các vật liệu như nhân vật, bối cảnh, đạo cụ, trang phục.
- Mô hình và Agent: quản lý thống nhất mô hình nhà cung cấp, chuỗi xử lý kịch bản và tác vụ tạo.
- Xuất bản dựng: trong cùng một hệ thống tiếp tục nhận xử lý chỉnh sửa trục thời gian và xuất phim hoàn chỉnh.

## Tại sao cấu trúc này có giá trị

Nhiều công cụ nội dung AI chỉ phủ được đoạn "tạo", nhưng điểm khó thực sự của sản xuất short drama là:

- Nhân vật và bối cảnh rất dễ trôi dạt
- Kịch bản, phân cảnh, tài nguyên thường đứt gãy giữa chúng
- Kết quả tạo khó được tổ chức thành quy trình sản xuất lặp lại được

Trọng tâm hiện tại của Jellyfish là rút ngắn các điểm đứt gãy này cho bằng được.

## Điều này có ý nghĩa gì với người phát triển

- Các trang phía trước được tổ chức theo bàn làm việc và đường dẫn nghiệp vụ
- Route phía sau chủ yếu xoay quanh `studio / llm / film / script-processing`
- Năng lực AI không phải module cô lập, mà được nhúng trong luồng dữ liệu nghiệp vụ
