---
description: "Quy trình A/B test thumbnail có hệ thống: hypothesis → setup → measure → decide."
skills: [video-frames]
---

# /thumbnail-ab-test

> **Mục tiêu**: Test thumbnail có hệ thống, data-driven decision
> **Khi nào dùng**: Khi muốn tối ưu CTR cho video mới hoặc existing
> **Skills**: video-frames

## Bước 1: Hypothesis & Variants
- **Goal**: Xác định rõ test gì và tại sao
- **Actions**:
  1. Viết hypothesis: "Nếu [thay đổi X] thì CTR sẽ [tăng/giảm Y%] vì [lý do]"
  2. Tạo Variant A (control = hiện tại)
  3. Tạo Variant B (test = thay đổi 1 yếu tố)
  4. ⚠️ Chỉ thay đổi 1 yếu tố: face/no-face, color, text, layout
- **Output**: Hypothesis + 2 thumbnail variants
- **Prompt**: `"Setup A/B test thumbnail cho video [tên/URL]"`

## Bước 2: Create thumbnails
- **Goal**: Tạo 2 thumbnail chất lượng cao
- **Skills**: `video-frames`
- **Actions**:
  1. Extract best frames (`/video-frames-thumbnail`)
  2. Design Variant A và Variant B
  3. Check cả 2 trên mobile preview (nhỏ, có đọc được không?)
  4. Đảm bảo cả 2 cùng chất lượng (chỉ khác 1 yếu tố)
- **Output**: 2 thumbnail files ready to upload

## Bước 3: Run test
- **Goal**: Chạy test đúng cách
- **Actions**:
  1. Upload Variant A, để chạy 48-72h
  2. Ghi nhận: impressions, CTR, views
  3. Đổi sang Variant B, để chạy 48-72h
  4. Hoặc: dùng TubeBuddy/VidIQ A/B test feature
  5. ⚠️ Đảm bảo cùng thời điểm trong tuần (tránh weekday vs weekend bias)
- **Output**: Raw data cho cả 2 variants

## Bước 4: Analyze & Decide
- **Goal**: Quyết định dựa trên data
- **Actions**:
  1. So sánh CTR: Variant A vs Variant B
  2. Check sample size: đủ impressions chưa? (tối thiểu 1,000/variant)
  3. Apply decision rules:
     - Thắng > 20%: ✅ ADOPT
     - Thắng 5-20%: ⏳ Test thêm
     - Chênh < 5%: 🟰 Không khác biệt
  4. Document learning vào test log
- **Output**: Decision + learning documented

## Quality Gate
- [ ] Hypothesis rõ ràng (If/Then/Because)
- [ ] Chỉ 1 biến thay đổi giữa 2 variants
- [ ] Đủ sample size (≥1,000 impressions/variant)
- [ ] Cùng thời điểm/ngày trong tuần
- [ ] Decision dựa trên rules đã xác định trước
- [ ] Learning ghi vào test log cho lần sau
