# Walkthrough: Gumroad API Integration

## Tổng quan
Quá trình tích hợp Gumroad API v2 để tự động hóa việc đẩy sản phẩm số (digital product) và tệp tin lên nền tảng Gumroad. Bao gồm các thông tin SEO và Thumbnail để tối ưu hóa sản phẩm.

## Các Script đã triển khai
1. **`gumroad_client.py`**:
   - Khởi tạo client dùng token từ biến môi trường `GUMROAD_ACCESS_TOKEN`.
   - Các hàm:
     - `create_product`: Tạo digital product mới, hỗ trợ thêm các tham số SEO/Thumbnail (`preview_url`, `tags`, `custom_permalink`, `custom_summary`).
     - `_get_presigned_url`: Lấy URL Presigned S3.
     - `_upload_to_s3`: Tải file lên AWS S3 trực tiếp qua presigned URL.
     - `_complete_upload`: Xác nhận upload hoàn tất.
     - `publish_product`: Publish sản phẩm ra công chúng.
     - `upload_file`: Quản lý pipeline Upload -> Presign -> Complete.

2. **`gumroad_publish.py`**:
   - Lệnh CLI bọc ngoài `gumroad_client.py`.
   - Sử dụng `argparse` để nhận cấu hình từ dòng lệnh. Bổ sung thêm các tham số `--cover-image`, `--tags`, `--permalink`, `--summary`.
   - Nếu có `--cover-image`, script sẽ tự động upload ảnh lấy URL rồi truyền vào `preview_url` để làm ảnh thumbnail.
   - Trả về `short_url` của Gumroad sau khi publish.

## Hướng dẫn sử dụng
```bash
# Đặt biến môi trường
export GUMROAD_ACCESS_TOKEN="your_token"

# Chạy CLI cơ bản
python content-planner-kb/scripts/gumroad_publish.py --file-path "output.mp4" --name "Video Bundle" --price 15.00 --desc "Awesome digital product"

# Chạy CLI nâng cao (Kèm SEO & Thumbnail)
python content-planner-kb/scripts/gumroad_publish.py --file-path "output.mp4" --name "Video Bundle" --price 15.00 --cover-image "thumbnail.jpg" --tags "video,bundle,course" --permalink "my-awesome-video-bundle" --summary "Short summary for the product card"
```
