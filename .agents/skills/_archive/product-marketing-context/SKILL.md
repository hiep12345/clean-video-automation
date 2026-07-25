---
name: product-marketing-context
description: >
  Foundation skill — chạy TRƯỚC mọi skill marketing khác. Tạo file
  `.agents/product-marketing-context.md` chứa thông tin gốc về sản phẩm,
  khách hàng, định vị. Các skill khác tự đọc file này → không hỏi lại.
  Trigger: "setup context", "product context", "định vị", "ICP",
  "chân dung khách hàng", "tệp mục tiêu".
metadata:
  version: 1.0.0
  category: foundation
  tier: S
---

> **Foundation Skill** — Chạy 1 lần đầu dự án. Tất cả skills marketing khác
> ĐỌC file này trước khi bắt đầu → tiết kiệm ~70% thời gian mỗi lần.

## Quy trình

### Bước 1: Kiểm tra file hiện có
Tìm `.agents/product-marketing-context.md`:
- **Có** → Đọc, tóm tắt, hỏi user muốn cập nhật section nào.
- **Chưa có** → Đề xuất 2 cách:
  1. **Auto-draft** từ README, GEMINI.md, docs/ (nhanh hơn)
  2. **Thu thập từ đầu** — hỏi từng section, từng cái một

### Bước 2: Thu thập thông tin
Đi qua từng section — **TỪNG CÁI MỘT**, không hỏi đồng loạt.
Mỗi section: giải thích ngắn → hỏi 1-3 câu → xác nhận → tiếp.

### Bước 3: Tạo/cập nhật file
Lưu vào `.agents/product-marketing-context.md`.

## Template (12 Sections)

```markdown
# Product Marketing Context — [Tên sản phẩm/kênh]
> Cập nhật: [YYYY-MM-DD]

## 1. Tổng quan
- Tên, mô tả 1 câu, mô hình (Affiliate/SaaS/Course/Service)
- Giá/cách tính giá, giai đoạn (Launch/Growth/Mature)

## 2. Tệp khách hàng mục tiêu
- Phân khúc (B2C/B2B), người quyết định mua
- Jobs-To-Be-Done (JTBD), use case cụ thể

## 3. Persona chính
- Nhân khẩu học, nghề nghiệp, hành vi online
- Mục tiêu cá nhân, nỗi đau lớn nhất
- Câu nói nội tâm (nghĩ nhưng không nói ra)

## 4. Nỗi đau & Vấn đề
- Vấn đề cốt lõi, tại sao giải pháp hiện tại không hiệu quả
- Chi phí cơ hội (thời gian/tiền/cơ hội mất)

## 5. Đối thủ cạnh tranh
- Trực tiếp (cùng giải pháp), gián tiếp (cùng vấn đề)
- Điểm mạnh/yếu từng đối thủ

## 6. Khác biệt hóa (USP)
- 3 điểm khác biệt chính
- Điều đối thủ KHÔNG có mà bạn CÓ

## 7. Rào cản & Anti-persona
- Top 3 rào cản + cách xử lý
- Ai KHÔNG nên là khách hàng

## 8. 4 Forces (JTBD)
- Push, Pull, Anxiety, Habit

## 9. Voice of Customer
- Câu khách nói NGUYÊN VĂN (reviews, comments, emails)

## 10. Brand Voice
- 3 tính từ mô tả thương hiệu
- KHÔNG dùng giọng gì + ví dụ

## 11. Social Proof
- Số liệu (subs, views, revenue), testimonials, case studies

## 12. Mục tiêu
- 90 ngày, 12 tháng, North Star Metric
```

## Cách skills khác dùng file này

Mọi skill marketing thêm bước đầu tiên:
1. Đọc `.agents/product-marketing-context.md`
2. Có → lấy context, không hỏi lại
3. Không có → đề nghị chạy skill này trước

## Checklist chất lượng
- [ ] Đủ ít nhất 8/12 sections (1,2,4,5,6,9,10,12)
- [ ] Có ngôn ngữ khách hàng thực tế (section 9)
- [ ] Có anti-persona rõ ràng (section 7)
- [ ] Có North Star Metric (section 12)
- [ ] Đã xác nhận với user tất cả thông tin
