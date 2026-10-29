# Jellyfish Site

Trang chủ và trang tài liệu của Jellyfish xây dựng trên Hugo + Hextra.

## Yêu cầu phát triển cục bộ

- Hugo extended `>= 0.146.0`
- Go `>= 1.22`

## Cài đặt module theme

```bash
cd site
hugo mod tidy
```

## Xem trước cục bộ

```bash
cd site
hugo server --buildDrafts --disableFastRender
```

Truy cập cục bộ mặc định:

- `http://localhost:1313/`

## Xây dựng

```bash
cd site
hugo --minify
```

khi phát hành GitHub Pages sẽ truyền `baseURL` môi trường production rõ trong CI.

Kho hiện tại không lưu mã nguồn theme Hextra; cả phát triển và CI đều lấy theme qua Hugo Modules theo thời gian thực.

## Quy ước phụ thuộc module

- Khi cập nhật hoặc thêm module theme cục bộ, dùng `hugo mod tidy`
- CI GitHub chỉ thực thi tải module và xác minh, không viết lại tệp khóa phụ thuộc khi phát hành
- `go.mod` và `go.sum` cần được commit cùng với thay đổi module

## Giải thích thư mục

- `content/`: Nội dung trang chủ và tài liệu
- `layouts/`: Mẫu tùy chỉnh như trang chủ
- `data/`: Dữ liệu có cấu trúc như khối nội dung trang chủ
- `static/`: logo, ảnh chụp màn hình và các tài nguyên tĩnh khác

## SEO và ảnh chia sẻ

- Ảnh chia sẻ mặc định: `static/images/og-default.svg`
- Siêu dữ liệu cấp trang web: `hugo.yaml`
- Bổ sung đầu tùy chỉnh: `layouts/_partials/custom/head-end.html`
