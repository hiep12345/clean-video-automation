---
name: script-preparation
description: "Quy trình chuẩn bị, viết và kiểm duyệt kịch bản (L1 QA) có kỷ luật trước khi đưa vào pipeline render."
---

<!-- skip-skill-gate -->
# Quy trình Chuẩn bị và Kiểm duyệt Kịch bản (Script Plan & L1 QA)

Tài liệu này định nghĩa quy trình phối hợp bắt buộc để tạo mới và phê duyệt kịch bản (Script) cho Reels/Shorts. Quy trình vận hành theo cơ chế **Chốt chặn chất lượng (Gate-driven)** để đảm bảo sự đồng bộ giữa CEO và các đặc vụ.

---

## 👥 Phân Định Vai Trò Thực Thi

1.  **Parent Agent (CEO)**:
    *   Thực hiện kiểm tra trùng lặp (Gate 0).
    *   Đề xuất chủ đề và lấy phê duyệt từ Người dùng (Gate 1).
    *   Khởi tạo các đặc vụ chuyên trách (`script-writer`, `qa-reviewer`).
    *   Trực tiếp kiểm tra chéo (Cross-check) kịch bản chữ và nghiệm thu cuối cùng (Gate 2).
2.  **Đặc vụ Viết kịch bản (`script-writer`)**:
    *   Nạp skill `script-writer` để tự động hóa khâu tra cứu tri thức (RAG) và soạn thảo kịch bản chữ.
3.  **Đặc vụ QA (`qa-reviewer`)**:
    *   Nạp skill `clarity-gate` để kiểm duyệt kịch bản tự động (chạy script `l1_script_qa.py`), ghi nhận báo cáo vào tệp `l1_qa.review`.

---

## ⛔ Quy Trình Thực Thi 4 Bước

### Bước 1: Khởi động & Kiểm tra Trùng lặp (Gate 0 - Dedup Check)
*   **Hành động của CEO**: Chạy script kiểm tra trùng lặp trên database:
    ```bash
    python scripts/topic_dedup.py --organism "<Tên chủ đề/loài>" --channel <channel-slug>
    ```
*   **Chốt chặn (BLOCKING)**: 
    *   Nếu exit 1 (Trùng lặp) ➔ Dừng ngay, báo người dùng đổi topic.
    *   Nếu exit 0 (Không trùng) ➔ CEO trình đề xuất chủ đề lên Người dùng để duyệt.
    *   **BẮT BUỘC**: Chờ Người dùng duyệt chủ đề mới được đi tiếp.

### Bước 2: Viết Kịch Bản (Phase 1: Script Writing)
*   **Hành động của CEO**: Triệu gọi đặc vụ `script-writer` (Workspace: inherit).
*   **Hành động của `script-writer`**: Nạp skill `script-writer` để tự động thực thi:
    1. Tra cứu tri thức (RAG) qua `obsidian_rag.py` hoặc tìm kiếm thông tin loài.
    2. Đọc cấu hình kênh `config/channels/<channel_slug>.json` để lấy đúng định dạng và phong cách.
    3. Tạo kịch bản hoàn chỉnh `script.md` (bao gồm Context Card, Narration, Prompts, Upload Metadata) lưu tại `output/fb-reels/<channel_slug>/<video_id>/script.md`.

### Bước 3: Kiểm duyệt Kịch Bản Tự Động (L1 QA Gate)
*   **Hành động của CEO**: Triệu gọi Đặc vụ QA (`qa-reviewer`) (Workspace: inherit).
*   **Hành động của `qa-reviewer`**: Chạy script kiểm tra L1 QA:
    ```bash
    python scripts/qa/l1_script_qa.py <path_to_script.md> --channel <channel-slug>
    ```
*   **Ghi nhận Bằng chứng**: Kết quả kiểm định (PASS/FAIL) bắt buộc phải được ghi vào tệp `l1_qa.review` cùng thư mục kịch bản.
*   **Xử lý lỗi**: Nếu FAIL ➔ Đặc vụ viết kịch bản phải sửa và chạy lại. Nếu FAIL quá 2 lần ➔ CEO dừng lại báo cáo User để làm rõ tri thức (Anti-Assumption).

### Bước 4: Thẩm định Chéo & Nghiệm thu Kịch bản (CEO Validation Gate)
*   **Hành động của CEO**:
    1. Xác nhận tệp `l1_qa.review` đã PASS.
    2. Tự mình mở đọc trực tiếp tệp `script.md` bằng công cụ native `view_file` để kiểm tra chéo (Đúng format kênh? Lời thoại cuốn hút? Đã chèn link domain sạch?).
    3. Gửi bản kịch bản chữ hoàn chỉnh cho Người dùng duyệt.
    4. Khi Người dùng duyệt ➔ CEO chuyển giao kịch bản sang cho đặc vụ sản xuất (`production-executor`) để bắt đầu pipeline dựng video (`/veo-generate`).

---

## 🗺️ Bản Đồ 3 Tầng QA Của Quy Trình Sản Xuất (3-Phase QA Pipeline Roadmap)
Để không bao giờ bỏ sót (miss) bất kỳ tầng QA nào, toàn bộ quá trình sản xuất một video bắt buộc phải đi qua 3 tầng chốt chặn sau:

### 1. Tầng 1: L1 QA (Script Level - Duyệt Kịch Bản Chữ)
*   **Mục tiêu**: Đảm bảo facts chuẩn xác, không chứa từ cấm AI (slop), đúng cấu trúc hook.
*   **Đặc vụ thực thi**: Đặc vụ QA (`qa-reviewer`) chạy script `l1_script_qa.py` (nạp skill `clarity-gate`).
*   **Bằng chứng đầu ra**: File `l1_qa.review` chứa chữ `PASS`.

### 2. Tầng 2: L2 QA (Clip Level - Duyệt Phân Cảnh Thô)
*   **Mục tiêu**: Đảm bảo từng phân cảnh do AI (Veo) sinh ra không bị dị dạng, méo mó, đúng mô tả prompt.
*   **Đặc vụ thực thi**: Trong quá trình chạy quy trình sinh clip của FlowKit (`/fk-pipeline` hoặc `/fk-gen-videos`), AI Agent sẽ tự động gửi từng clip thô lên Gemini Vision API để chấm điểm (L2 QA).
*   **Bằng chứng đầu ra**: Bảng điểm QA và kết quả duyệt trong tệp trạng thái của FlowKit. Nếu cảnh nào hỏng, AI Agent phải sinh lại clip đó trước khi ghép nối (concat).

### 3. Tầng 3: L3 QA (Video Level - Duyệt Video Hoàn Chỉnh)
*   **Mục tiêu**: Đảm bảo chất lượng video final (nhịp chuyển cảnh mượt, chữ phụ đề rõ ràng, tiếng máy/âm thanh ASMR khớp visual, nhạc nền balanced).
*   **Đặc vụ thực thi**: Đặc vụ QA (`qa-reviewer`) dùng công cụ native `view_file` xem trực tiếp `final.mp4` theo đúng checklist của kênh quy định tại `config/channels/<channel_slug>.json`.
*   **CEO Chốt chặn**: CEO tự mình mở `view_file` xem lại để thẩm định chéo.
*   **Bằng chứng đầu ra**: File `l3_qa.review` chứa chữ `PASS` được tạo ra trong thư mục video. Đây là điều kiện chặn bắt buộc (hardcoded gate) để hệ thống cho phép chạy lệnh upload Drive và Notion sync.


## 📋 Kỷ Luật Soạn Thảo Kịch Bản (Script Guidelines & Constraints)
Để đảm bảo chất lượng kịch bản chữ và visual sinh ra tương thích tối đa với hạ tầng FlowKit, Đặc vụ viết kịch bản (`script-writer`) bắt buộc phải tuân thủ các quy tắc sau:

### 1. Kỷ luật Viết Prompt Phân Cảnh (Scene Prompts)
*   **Scene Prompts = ACTION ONLY**: Chỉ mô tả hành động trực quan, góc máy, ánh sáng. Tuyệt đối **CẤM** mô tả chi tiết ngoại hình nhân vật (để giữ tính nhất quán thông qua ảnh tham chiếu).
*   **Nhận diện nhân vật**: Luôn sử dụng đúng tên nhân vật đã khai báo trong danh sách thực thể (Entities) của dự án.
*   **Fact-check Sự thật**: Luôn tra cứu và đối chiếu thông tin lịch sử, khoa học, ngày tháng, thông số kỹ thuật thực tế trước khi viết kịch bản. Tuyệt đối cấm bịa đặt thông tin.

### 2. Lời thoại & Dialogue trong clip
*   **Nhúng lời thoại**: Lời thoại nhân vật trong phân cảnh phải được nhúng trực tiếp trong ngoặc kép: `Tên_Nhân_Vật says "[Lời thoại]"`.
*   **Giới hạn từ**: Giới hạn tối đa **10-15 từ** cho mỗi nhân vật trong mỗi phân đoạn clip 2-3 giây để đảm bảo độ dài khớp với hình ảnh hiển thị.

### 3. Bypass bộ lọc người nổi tiếng (Real-People Bypass)
*   Khi nhân vật trong kịch bản là người nổi tiếng thực tế (chính trị gia, ngôi sao, v.v.), tuyệt đối **CẤM** sử dụng tên thật của họ trong prompts hoặc mô tả gửi lên AI sinh ảnh/video.
*   Hãy dùng **danh xưng chức danh/vai trò (alias)** và mô tả **đặc điểm nhận dạng bên ngoài** (ví dụ: màu tóc, trang phục, dáng người đặc trưng) để AI có thể sinh ảnh mà không bị chặn bởi bộ lọc bản quyền.

### 4. Quy hoạch Ảnh Tham Chiếu (Reference Image Hierarchy)
Hành vi xử lý ảnh tham chiếu của thực thể (entities) phải tuân thủ nghiêm ngặt theo khai báo cấu hình `"reference_image_mode"` trong tệp JSON của kênh tại `config/channels/<slug>.json`:
1.  **Chế độ BẮT BUỘC (Mandatory)**: Kênh yêu cầu tính chân thực khoa học cao (ví dụ: sinh vật học). Bắt buộc phải cung cấp ảnh thật hoặc ảnh sketch trong folder video. CEO sẽ tự động tìm và tải ảnh thật về trước khi ủy thác.
2.  **Chế độ KHUYẾN KHÍCH (Recommended)**: Khuyến khích sử dụng ảnh mockup bối cảnh phòng, nếu không có AI tự vẽ phối cảnh phòng theo text prompt.
3.  **Chế độ TỰ DO SÁNG TẠO (Creative/Free)**: Không cần ảnh tham chiếu, sinh hoàn toàn từ text prompt để đạt hiệu quả pha màu ASMR và visual điện ảnh tối đa.
