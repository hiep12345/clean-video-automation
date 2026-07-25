---
name: Video QA Gate
description: "Operational instructions and strict checklists for L2 (clip) and L3 (final) video QA loaded dynamically from channel config files."
---

<!-- skip-skill-gate -->
# Video QA Gate — Operational Instructions & Checklists (L2/L3 QA)

Tài liệu này là **Single Source of Truth (SSOT)** về quy định kiểm duyệt chất lượng trực quan L2 (clip thô) và L3 (video final). Áp dụng bắt buộc cho cả Đặc vụ AI và các thành viên trong nhóm (team members) để đảm bảo tính ổn định và không bỏ sót lỗi.

---

## 🛠️ Quy Trình Thực Thi QA

### 1. Phân Phối Trách Nhiệm (Role Boundary)
*   **AI Đặc vụ QA (`qa-reviewer`)**: Nhận lệnh từ CEO để tự động xem video qua công cụ native `view_file` (Gemini vision), đối chiếu theo checklist của kênh tương ứng và ghi kết quả ra tệp `review_results.json` và `l3_qa.review`.
*   **CEO Agent (Parent Agent)**: Đọc báo cáo của Đặc vụ QA, tự mình gọi `view_file` xem lại video để kiểm định chéo và phê duyệt/bác bỏ kết quả cuối cùng.
*   **Thành viên dự án (Team members)**: Đọc file `SKILL.md` và `l3_qa.review` của từng dự án để kiểm tra thủ công trước khi xuất bản.

---

## 📋 Tiêu Chí Kiểm Duyệt Chung (Mọi Kênh)

1.  **Chuyển động & Dị dạng hình thể (No Morphing & Glitches)**:
    *   Cấm tuyệt đối hiện tượng các nét vẽ/đồ vật tự động biến dạng kỳ dị qua các giây (morphing).
    *   Cấm hiện tượng tay người bị nhòe, mọc thêm ngón hoặc công cụ bị biến hình khi chuyển cảnh.
2.  **Độ mờ chuyển động chân/cánh (Anatomy & Motion Blur Gate)**:
    *   Cực kỳ chú ý các bộ phận chuyển động nhanh (chân côn trùng, cánh hoa bay, phới đánh trứng).
    *   **CẤM** các chuyển động bị nhòe thành hình tròn mờ, hình cánh quạt/cánh hoa mờ (motion blur hallucination) hoặc bị hút/drifting biến mất. Nếu xảy ra, phải cho **FAIL (Score ≤ 5.9)**.
3.  **Cân bằng âm thanh (Audio Balance)**:
    *   Nhạc nền (BGM) lofi/cozy đặt âm lượng nhỏ (~0.10) để làm nền, không được át tiếng SFX hoặc giọng đọc.
    *   Tiếng động thực tế (SFX) như tiếng máy trộn, tiếng gạt dao, tiếng giọt chảy phải rõ nét, đanh và chân thực.
4.  **Căn chỉnh phụ đề (Subtitle Placement)**:
    *   Chữ phụ đề (Text Overlay) phải nằm chính giữa, cân đối ở phần dưới màn hình (định dạng 9:16). Chữ phải rõ ràng, có viền tương phản (contrast stroke) để dễ đọc và không có lỗi chính tả.

---

## 🔍 Tra Cứu Chỉ Dẫn Kiểm Duyệt Động Theo Kênh (Dynamic Channel Config)

Để tránh hardcode và đảm bảo tính đồng bộ (Systems Thinking), các tiêu chí kiểm duyệt chi tiết và Persona của từng kênh được lưu giữ tập trung tại các file cấu hình kênh của dự án. 

Đặc vụ QA và người thẩm định **bắt buộc** phải đọc file JSON cấu hình của kênh tương ứng trước khi tiến hành QA:
*   **Đường dẫn file cấu hình**: `config/channels/<channel_slug>.json`
*   **Các trường dữ liệu cần đọc**:
    1.  `evaluation_persona` & `persona_focus`: Dùng làm danh tính và góc nhìn tâm lý khi đánh giá video.
    2.  `l2_criteria`: Các tiêu chí đánh giá cho từng phân cảnh thô (L2 QA).
    3.  `detailed_qa_rules`: Danh sách các quy tắc bắt buộc của kênh để chấm điểm đạt/hỏng (L3 QA).

---

## 📂 Output Schema cho Đặc vụ QA

Đặc vụ QA bắt buộc phải ghi kết quả kiểm định ra tệp `review_results.json` trong thư mục video theo cấu trúc JSON mẫu sau:

```json
{
  "video_id": "mt-v057-indian-yellow",
  "channel": "mix-therapy",
  "reviewer_session_id": "1529c14c-6c40-43e4-8eb1-11400c3e6bab",
  "qa_score": 9.7,
  "verdict": "PASS",
  "checklist_results": {
    "beater_shaft_solid": "PASS",
    "paint_texture_heavy": "PASS",
    "sound_mixer_sync": "PASS"
  },
  "observations": {
    "visual_payoff": "Transitions are smooth, metal parts are highly detailed and stable.",
    "audio_sync": "Lofi BGM volume is balanced at 0.10. Mixer hum matches visual spinning perfectly.",
    "subtitles": "Centered properly, easy to read, zero typos."
  }
}
```
