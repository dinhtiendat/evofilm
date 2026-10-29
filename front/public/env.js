// Phát triển cục bộ mặc định nối thẳng backend trên máy; khi triển khai container thì Nginx/script cổng vào ghi đè.
window.__ENV = window.__ENV || {
  BACKEND_URL: 'http://localhost:8000',
}
