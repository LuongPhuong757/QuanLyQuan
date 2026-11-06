// Tên + logo quán hiển thị TRƯỚC khi đăng nhập (màn đăng nhập).
// Sản phẩm cho thuê nhiều quán: về sau hai giá trị này phải lấy từ cấu hình của từng quán
// (setting `store_name` + logo upload) qua một API public — hiện API public chưa trả tên quán
// nên tạm để hằng số ở ĐÚNG MỘT chỗ này, nối cấu hình thì chỉ sửa file này.
export const STORE_NAME = 'Quán Bà Lùn';

// store-logo.jpg: cắt vuông 216px từ logo.jpg gốc (1633×1920, ~86 kB) → ~18 kB, đủ nét cho logo
// 72px trên màn 3x mà điện thoại 3G phải tải ngay ở màn đầu tiên. KHÔNG dùng apple-touch-icon.png:
// file đó in sẵn nền xanh ngọc của màu thương hiệu cũ quanh ảnh → hiện thành viền xanh.
export const STORE_LOGO_URL = '/store-logo.jpg';
