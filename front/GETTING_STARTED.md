# Hướng dẫn bắt đầu nhanh

## Khởi tạo dự án

### 1. Cài đặt phụ thuộc

```bash
cd /Users/extreme/Projects/github.com/jellyfish
npm install
```

### 2. Khởi động máy chủ phát triển

```bash
npm run dev
```

Trình duyệt sẽ tự mở `http://localhost:5173`

### 3. Dựng phiên bản production

```bash
npm run build
```

Tệp sau khi xây dựng nằm trong thư mục `dist/`

## Mô tả tệp dự án

### Tệp cấu hình cốt lõi

| Tệp | Mô tả |
|------|------|
| `package.json` | Phụ thuộc và script của dự án |
| `vite.config.ts` | Cấu hình công cụ build Vite |
| `tsconfig.json` | Cấu hình biên dịch TypeScript |
| `tailwind.config.js` | cấu hình Tailwind CSS |
| `postcss.config.js` | Cấu hình PostCSS |
| `.eslintrc.json` | Cấu hình kiểm tra code ESLint |
| `.prettierrc` | Cấu hình định dạng code Prettier |

### Thư mục mã nguồn

```
src/
├── main.tsx          # Cổng vào ứng dụng, gắn vào DOM
├── App.tsx           # Component ứng dụng chính, chứa mã mẫu
├── index.css         # style toàn cục(Tailwind + tùy chỉnh)
├── App.css           # Style riêng của component App
└── components/       # Thư viện thành phần tái sử dụng
    ├── CustomButton.tsx    # Thành phần nút tùy chỉnh
    ├── CustomCard.tsx      # Thành phần thẻ tùy chỉnh
    └── index.ts           # Chỉ mục xuất thành phần
```

## Chi tiết bộ công nghệ

### Vite (Next Generation Frontend Tooling)

- **Khởi động lạnh cực nhanh** - Máy chủ phát triển dựa trên ES modules
- **Cập nhật nóng HMR** - Sửa code là lập tức cập nhật trên trình duyệt, giữ nguyên trạng thái ứng dụng
- **Build tối ưu** - Rollup build được cấu hình sẵn

### React 18 + TypeScript

- **Hỗ trợ kiểu đầy đủ** - Nâng cao chất lượng mã và trải nghiệm phát triển
- **Thành phần hàm** - Viết thành phần hiện đại bằng Hooks
- **Thực hành tốt nhất** - Chế độ nghiêm ngặt và quy tắc ESLint

### Tailwind CSS

- **Công cụ tiện dụng trước** - Viết lớp style trực tiếp trong HTML
- **Thiết kế phản hồi** - Có sẵn breakpoint phản hồi
- **tương thích với Ant Design** - trong cấu hình đã tắt preflight để tránh xung đột

### Ant Design (antd)

- **component phong phú** - Button, Card, Table, Form, Modal v.v.
- **Thiết kế cấp doanh nghiệp** - Hệ thống thiết kế UI chuyên nghiệp
- **Hỗ trợ quốc tế hóa** - Đa ngôn ngữ

## Nhiệm vụ phát triển thường gặp

### Cập nhật hàm yêu cầu và kiểu OpenAPI phía frontend

sau khi khởi động dịch vụ dev backend (mặc định `http://127.0.0.1:8000`), thực thi trong thư mục frontend:

```bash
pnpm run openapi:update
```

Thư mục tạo:

- `src/services/generated/`: hàm request và định nghĩa loại được sinh ra
- `openapi.json`: cache tài liệu OpenAPI kéo từ backend

Đường dẫn cơ bản của yêu cầu mặc định là `/api` cùng nguồn (xem `src/services/openapi.ts`); nếu cần nối trực tiếp tới backend cục bộ, có thể gọi `initOpenAPI('http://127.0.0.1:8000')` khi ứng dụng khởi động.

### Tạo component mới

Tạo tệp thành phần mới trong thư mục `src/components/`:

```tsx
// src/components/MyComponent.tsx
import { FC } from 'react'

interface Props {
  title: string
}

const MyComponent: FC<Props> = ({ title }) => {
  return <div className="p-4 rounded-lg bg-white">{title}</div>
}

export default MyComponent
```

Sau đó xuất trong `src/components/index.ts`:

```ts
export { default as MyComponent } from './MyComponent'
```

### Sử dụng bộ thành phần Ant Design

```tsx
import { Button, Card, Form, Input } from 'antd'
import { UserOutlined } from '@ant-design/icons'

function MyForm() {
  return (
    <Card title="User Info">
      <Form>
        <Form.Item label="Name">
          <Input prefix={<UserOutlined />} placeholder="Enter name" />
        </Form.Item>
        <Button type="primary">Submit</Button>
      </Form>
    </Card>
  )
}
```

### Sử dụng Tailwind CSS

```tsx
function MyComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome</h1>
        <p className="text-gray-600 mb-6">This is a sample component</p>
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Click Me
        </button>
      </div>
    </div>
  )
}
```

### Biến môi trường

Tạo tệp `.env` hoặc `.env.local`:

```
VITE_API_URL=https://api.example.com
VITE_APP_NAME=MyApp
```

Sử dụng trong code:

```tsx
const apiUrl = import.meta.env.VITE_API_URL
const appName = import.meta.env.VITE_APP_NAME
```

## Quy tắc mã nguồn

### Chạy kiểm tra ESLint

```bash
npm run lint
```

### Định dạng mã nguồn

Định dạng code bằng Prettier (khuyến nghị dùng extension IDE để định dạng tự động):

```bash
npm install -D prettier
npx prettier --write src/
```

## Gợi ý tối ưu hiệu năng

1. **Tách mã** - Dùng import động để tách mã
2. **Component tải chậm** - React.lazy + Suspense
3. **Tối ưu ảnh** - Dùng định dạng và kích thước ảnh phù hợp
4. **Tối ưu phụ thuộc** - Kiểm tra và cập nhật phụ thuộc định kỳ
5. **Phân tích build** - dùng `npm install -D rollup-plugin-visualizer` để phân tích kích thước gói

## Khắc phục sự cố thường gặp

### H: Khi phát triển, kiểu không có hiệu lực?
A: Đảm bảo Tailwind CSS (@tailwind directives) được import trong `index.css`, và `index.css` được import trong `main.tsx`.

### H: Xung đột style giữa Ant Design và Tailwind?
A: Trong `tailwind.config.js` đã đặt `corePlugins: { preflight: false }` để tránh xung đột.

### H: Chỉnh màu chủ đề Ant Design thế nào?
A: dùng ConfigProvider của Ant Design hoặc biến CSS tùy chỉnh.

## Triển khai

### Build bản production được tối ưu

```bash
npm run build
```

### Xem trước bản production

```bash
npm run preview
```

### Triển khai lên máy chủ

deploy nội dung thư mục `dist/` lên web server (Nginx, Apache...).

## Đọc thêm

- [Vite tài liệu chính thức](https://vitejs.dev)
- [React tài liệu chính thức](https://react.dev)
- [TypeScript tài liệu chính thức](https://www.typescriptlang.org)
- [Tailwind CSS tài liệu](https://tailwindcss.com)
- [Ant Design tài liệu](https://ant.design)

---

Chúc bạn phát triển vui vẻ! 🚀

