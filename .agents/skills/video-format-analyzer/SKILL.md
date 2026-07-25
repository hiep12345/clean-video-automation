# Skill: Video Format Analyzer (Native Multimodal Workflow)

Phân tích **đầy đủ** định dạng và cấu trúc của một video đối thủ (Facebook Reel, YouTube Shorts, TikTok...) bằng cách tận dụng trực tiếp sức mạnh đa phương thức (vision & audio) của mô hình AI mà không cần qua các script cắt ảnh hay transcript trung gian.

## Quy trình R&D Video (3 bước tinh gọn)

### Bước 1 — Lấy Tệp Video Cục Bộ
- Nếu video là link trực tuyến, sử dụng script download nhẹ để tải về máy:
  ```powershell
  python scripts/download.py <URL> --output temp_analysis.mp4
  ```
- Hoặc yêu cầu người dùng cung cấp đường dẫn tệp video có sẵn trong dự án.

### Bước 2 — Xem Video Trực Tiếp
Gọi trực tiếp công cụ `view_file` trên đường dẫn tệp video để truyền tải dữ liệu đa phương thức vào cửa sổ ngữ cảnh:
```json
{
  "AbsolutePath": "C:/path/to/video.mp4",
  "toolSummary": "Xem video đối thủ",
  "toolAction": "Viewing competitor video"
}
```

### Bước 3 — Phân Tích & Viết Báo Cáo
Phân tích trực tiếp từ luồng hình ảnh/âm thanh nhận được và viết báo cáo theo cấu trúc:

```markdown
## Phân Tích Đối Thủ: [Tên video/kênh]

### 1. Bố Cục Hình Ảnh (Visual)
- **Style chính**: [Text-only / B-roll / Talking-head / Animation...]
- **Khung hình & Tỷ lệ**: [Mô tả chi tiết tỷ lệ hiển thị cốc/đối tượng, cách xử lý vùng đen/mặt bàn]
- **Typography & Font**: [Font chữ, kích thước hiển thị, hệ màu nhấn mạnh từ khóa]
- **Hiệu ứng chuyển cảnh**: [Jump cut, zoom cut, transition...]

### 2. Âm Thanh & Nhịp Độ (Audio & Pacing)
- **Giọng đọc**: [TTS AI / Giọng thật / ASMR thuần túy / BGM]
- **Nhịp cắt cảnh (Pacing)**: ~[X] giây/cảnh quay.
- **Hiệu ứng âm thanh**: [Mô tả âm thanh phụ trợ, ASMR]

### 3. Cấu Trúc Nội Dung (Content Mapping)
- **0s - 3s (Hook)**: [Kỹ thuật giữ chân người xem]
- **3s - Xs (Body/Vortex)**: [Nội dung chi tiết, các phân cảnh hành động]
- **Xs - Hết (Payoff & CTA)**: [Khoảnh khắc nhỏ giọt/kết quả và lời kêu gọi hành động]

### 4. Đề Xuất Áp Dụng (Adaptation)
- **Khả năng ứng dụng**: [Độ phù hợp với kênh của chúng ta]
- **Cải tiến thiết kế**: [Cách tối ưu hóa chữ đè hoặc góc quay]
- **Tính khả thi**: [Tần suất sản xuất và khả năng lập trình tự động hóa]
```

## Lưu ý dọn dẹp
Sau khi hoàn tất phân tích và xuất báo cáo, lập tức xóa tệp video tạm thời bằng lệnh shell (`del temp_analysis.mp4`) để giữ cho không gian dự án luôn sạch sẽ.
