# Jellyfish AI nhà máy short drama / AI Short Drama Studio

<p align="center">
  <img src="./img/logo.svg" alt="Jellyfish Logo" width="160" />
</p>

<p align="center">
  <a href="./README.en.md">English</a> ·
  <a href="./README.ja.md">Tiếng Nhật</a>
</p>

Dụng cụ sản xuất kịch ngắn do AI tạo (kịch ngắn dọc / kịch siêu ngắn) theo kiểu tất cả trong một
Từ kịch bản nhập vào → phân cảnh thông minh → quản lý tính nhất quán nhân vật/bối cảnh/đạo cụ → tạo video AI → hậu kỳ dựng phim → xuất phim hoàn chỉnh một chạm

## 📷 Ảnh chụp dự án / Screenshots

| Tổng quan dự án | Quản lý tài nguyên |
| --- | --- |
| <img src="./img/project.png" alt="Tổng quan dự án / Project Overview" width="420" /> | <img src="./img/%E8%B5%84%E4%BA%A7%E7%AE%A1%E7%90%86.png" alt="Quản lý tài nguyên / Asset Management" width="420" /> |

## ✨ Giá trị cốt lõi

- **Nối chuỗi quy trình sản xuất phim ngắn**: từ nhập kịch bản, tách phân cảnh, chuẩn bị phân cảnh, đến tạo ảnh/video và theo dõi tác vụ, giảm thiểu chuyển đổi công cụ và đứt gãy quy trình
- **Biến kết quả AI thành tài liệu sản xuất có thể xác nhận và tái sử dụng**: trước tiên tích tụ thành phân cảnh, ứng viên tài nguyên, thoại, prompt và tác vụ tạo, sau đó mới vào khâu sản xuất tiếp theo
- **Xử lý "tính nhất quán" như vấn đề cốt lõi**: thông qua quản lý thực thể nhân vật, bối cảnh, đạo cụ, trang phục và liên kết cấp phân cảnh, giảm thiểu sai lệch nhân vật và lệch bối cảnh
- **Biến tác vụ tạo kéo dài thành hệ thống tác vụ có thể truy vết**: thống nhất quản lý các tác vụ không đồng bộ như xử lý văn bản, tạo ảnh, tạo video; hỗ trợ xem trạng thái, hủy, khôi phục
- **Biến tích hợp năng lực AI thành hạ tầng**: thông qua quản lý mô hình, mẫu prompt, hợp tác OpenAPI và hệ thống thực thi tác vụ, mở không gian để mở rộng thêm workflow sau này

## ✨ Năng lực cốt lõi

Jellyfish không phải công cụ đơn điểm "AI xuất ảnh / AI xuất video", mà là một workbench dành cho sản xuất short drama.
nó xây dựng một luồng chính khả thi quanh "hiểu kịch bản, chuẩn bị phân cảnh, tính nhất quán tài nguyên, thực thi sinh, truy vết tác vụ".

### 1. Hiểu kịch bản và tách phân cảnh bằng AI

hỗ trợ giao kịch bản chương cho AI xử lý có cấu trúc, tạo thành dữ liệu phân cảnh nền có thể dùng cho khâu sản xuất sau, bao gồm:

- Tách kịch bản thành các phân cảnh
- Trích xuất các yếu tố như nhân vật / bối cảnh / đạo cụ / trang phục
- Trích xuất và sắp xếp thoại
- Tối ưu, rút gọn kịch bản và kiểm tra tính nhất quán
- Phân tích chuyên sâu như chân dung nhân vật, thông tin bối cảnh, thông tin đạo cụ

### 2. Quy trình chuẩn bị và xác nhận phân cảnh

Quy trình chính hiện tại là:

`chia tách kịch bản → chuẩn bị phân cảnh → xác nhận ứng viên → shot ready → vào workbench sinh`

Trong giai đoạn chuẩn bị, hỗ trợ:

- Trích xuất và làm mới thông tin ứng viên phân cảnh
- Xác nhận hoặc bỏ qua ứng viên tài nguyên
- Chấp nhận hoặc bỏ qua ứng viên thoại
- Liên kết nhân vật / bối cảnh / đạo cụ / trang phục có sẵn
- Chỉnh sửa thông tin cơ bản của một phân cảnh
- Dùng trạng thái thống nhất để xác định phân cảnh đã chuẩn bị xong chưa

### 3. Hệ thống tính nhất quán và tái sử dụng tài nguyên

Xung quanh vấn đề nhất quán trong sản xuất short drama, dự án cung cấp năng lực quản lý thực thể thống nhất, bao phủ nhân vật, diễn viên, bối cảnh, đạo cụ và trang phục.
Hỗ trợ quản lý kho thực thể, liên kết cấp phân cảnh, quản lý ảnh và tái sử dụng, giảm thiểu tối đa sự trôi nội dung khi tạo giữa các phân cảnh.

### 4. Điều phối tạo ảnh và video ở cấp phân cảnh

Sau khi phân cảnh vào `ready`, có thể tiếp tục vào bàn làm việc tạo để hoàn tất chuẩn bị và thực thi tạo, gồm:

- Quản lý khung hình chính và ảnh tham chiếu
- Xem trước prompt video cấp phân cảnh
- Khởi động tác vụ tạo hình ảnh / video
- Kiểm tra trước khi tạo đơn phân cảnh và tạo hàng loạt
- Kết quả tạo chảy ngược về hệ thống phân cảnh và tư liệu

### 5. Trung tâm tác vụ thống nhất và khả năng thực thi không đồng bộ

Hiện hỗ trợ:

- Thực thi tác vụ xử lý văn bản bất đồng bộ
- Thực thi không đồng bộ tác vụ hình ảnh / video
- Theo dõi thống nhất trạng thái, kết quả, thời gian thực hiện của tác vụ
- Hủy tác vụ
- Trung tâm tác vụ toàn cục xem tác vụ đang chạy và mới hoàn thành
- Quay về ngữ cảnh dự án / chương / phân cảnh tương ứng từ tác vụ

### 6. Mô hình, prompt và hạ tầng tạo

Dự án còn cung cấp năng lực hạ tầng hỗ trợ sản xuất bằng AI, gồm:

- Quản lý nhiều Provider / nhiều mô hình
- Phân loại mô hình và cài đặt mô hình mặc định
- Quản lý mẫu prompt
- Quản lý tệp và tư liệu được tạo ra
- Hợp tác giao diện trước/sau do OpenAPI dẫn dắt

## 🚀 Danh sách tính năng chính

### Quản lý dự án và chương

- Tạo và quản lý dự án, chương
- Lấy chương làm đơn vị để mang kịch bản, phân cảnh và luồng tạo
- Cung cấp thống kê cơ bản và lối vào bàn làm việc

### Xử lý kịch bản AI

- Tách kịch bản chương thành nhiều phân cảnh
- Trích xuất thông tin nhân vật, bối cảnh, đạo cụ, trang phục và thoại
- Hỗ trợ tối ưu, rút gọn kịch bản và kiểm tra tính nhất quán
- Hỗ trợ phân tích chuyên sâu như chân dung nhân vật, thông tin bối cảnh, thông tin đạo cụ

### Workflow chuẩn bị phân cảnh

- Chỉnh sửa tiêu đề, tóm tắt và thông tin cơ bản của phân cảnh
- Trích xuất và làm mới ứng viên tài nguyên/thoại
- Xác nhận, bỏ qua hoặc liên kết ứng viên
- Dùng trạng thái chuẩn bị thống nhất để xác định phân cảnh đã hoàn thành xác nhận hay chưa
- Phân biệt rõ “chuẩn bị xong” và “đang tạo”

### Quản lý tài nguyên và thực thể

- Quản lý các thực thể như nhân vật, diễn viên, bối cảnh, đạo cụ, trang phục
- Hỗ trợ liên kết và tái sử dụng cấp phân cảnh
- Hỗ trợ quản lý ảnh thực thể
- Hỗ trợ kiểm tra sự tồn tại của tên, giúp tái sử dụng tài nguyên có sẵn

### Không gian làm việc tạo phân cảnh

- Quản lý khung hình chính, ảnh tham chiếu và prompt video
- Kiểm tra độ sẵn sàng tạo video của phân cảnh
- Bắt đầu tác vụ tạo hình ảnh / video
- Hỗ trợ đẩy tiến quy trình tạo ở chế độ đơn phân cảnh và hàng loạt

### Trung tâm tác vụ

- Xem thống nhất tác vụ đang chạy và vừa hoàn thành
- Theo dõi trạng thái, tiến độ, thời gian thực hiện và kết quả tác vụ
- Hỗ trợ hủy tác vụ
- Hỗ trợ từ tác vụ quay nhanh về dự án, chương hay phân cảnh tương ứng

### Hạ tầng mô hình và prompt

- Quản lý Provider, Model và cài đặt mô hình mặc định
- Quản lý mẫu prompt cho hình ảnh, video, phân cảnh,...
- Tạo yêu cầu và kiểu phía trước thông qua OpenAPI
- Cung cấp nền tảng thống nhất để mở rộng nhiều luồng công việc AI hơn về sau

### Quản lý tệp và tư liệu

- Quản lý tệp tải lên và sản phẩm tạo ra
- Thống nhất xem trước, liên kết và tái sử dụng chất liệu ảnh/video
- Cung cấp tư liệu có thể truy ngược cho phân cảnh và thực thể

## 🎯 Trường hợp áp dụng

- Người sáng tạo nội dung phim ngắn / vi-phim ngắn
- Sản xuất hàng loạt tại studio phim AI
- Người sáng tạo cá nhân muốn thử kịch bản ngắn dọc với chi phí thấp
- Cơ sở giáo dục/đào tạo làm video ngắn giảng dạy
- Thương hiệu/thương mại điện tử sản xuất đoạn phim quảng cáo có kịch tính

## 🛠 Bộ công nghệ (ví dụ)

- Phía trước: React 18 + TypeScript + Vite + Ant Design / Tailwind CSS
- Quản lý trạng thái: Redux Toolkit / Zustand
- Chỉnh sửa quy trình: React Flow
- Trình phát video: Video.js / Plyr
- Chỉnh sửa rich-text/code: Monaco Editor / React Quill
- Phía sau (phần có thể mã nguồn mở tùy chọn): Node.js / NestJS / FastAPI / Spring Boot
- Tầng sinh AI: kết nối nhiều API mô hình lớn (OpenAI / Anthropic / Midjourney / Runway / Kling / Luma...)

## 🔁 Tạo/cập nhật yêu cầu & kiểu OpenAPI phía frontend

Hàm request và cấu trúc dữ liệu phía front-end được sinh từ tài liệu OpenAPI phía backend, thư mục sinh ra là `front/src/services/generated/`, cache tài liệu OpenAPI là `front/openapi.json`.

khi dịch vụ dev phía sau đã khởi động (mặc định `http://127.0.0.1:8000`), thực thi trong thư mục phía trước:

```bash
cd front
pnpm run openapi:update
```

## 🐳 Khởi động Docker một nút (MySQL + Redis + RustFS + Backend + Celery Worker + Front)

dự án đã cung cấp compose dàn dựng dùng được ngay, tệp nằm ở `deploy/compose/`.

### Cổng

- Phía trước: `http://localhost:7788`
- phía sau:`http://localhost:8000` (`/docs` là Swagger)
- MySQL：`localhost:${MYSQL_PORT:-3306}`
- Redis：`localhost:${REDIS_PORT:-6379}`
- RustFS（S3 API）：`http://localhost:${RUSTFS_PORT:-9000}`（Console：`http://localhost:${RUSTFS_CONSOLE_PORT:-9001}`）

### Khởi động

```bash
cp deploy/compose/.env.example deploy/compose/.env
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up --build
```

## 🧑‍💻 Khởi động môi trường phát triển (tách trước/sau)

### Chạy phía sau

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Chạy phía trước

```bash
cd front
pnpm install
pnpm dev
```

## 📄 Giấy phép mã nguồn mở / License

Dự án này áp dụng giấy phép mã nguồn mở [Apache-2.0](../LICENSE).

## 💬 Trao đổi và phản hồi / Cộng đồng

- **[GitHub Issues](https://github.com/Forget-C/Jellyfish/issues)** — Gợi ý tính năng, phản hồi lỗi, thảo luận cách dùng

