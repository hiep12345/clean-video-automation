# Skill: Ebook Writer
**Owner**: Antigravity
**Scope**: Viết nội dung ebook — research facts, structure chapters, format markdown

---

## Khi nào dùng skill này

Khi được giao task: viết fact mới, viết chapter mới, hoặc mở rộng ebook sang chủ đề khác.

---

## Cấu trúc file ebook chuẩn

```
output/ebook/
  <ebook-slug>.md        ← nguồn duy nhất (SSOT)
  <ebook-slug>.pdf       ← generated, KHÔNG sửa tay
  images/                ← generated bởi gen_ebook_images.py
```

---

## Format một FACT (bắt buộc)

```markdown
**#<N> — <HOOK 5-8 từ, ALL CAPS IMPACT>**
*<Tên khoa học đầy đủ> (<Tên thường>)*

<Đoạn 1: Bối cảnh — điều gì xảy ra, cụ thể và hình ảnh. 60-80 từ.>

<Đoạn 2: Cơ chế — HOW/WHY. Thêm số liệu cụ thể. 60-80 từ.>

<Đoạn 3 (optional): Escalation hoặc gut punch. Điều khiến người đọc share. 40-60 từ.>

*(Author, Year, Journal/Source)*

---
```

### Luật viết FACT

1. **Hook = tuyên bố không thể tin được** — không giải thích, chỉ tuyên bố
2. **Đoạn 1 = hình ảnh cụ thể**, không phải định nghĩa chung
3. **Số liệu cụ thể** > tính từ mơ hồ ("exactly 25 centimeters" > "a specific height")
4. **Đoạn cuối = gut punch** — điều khiến người đọc forward cho bạn bè
5. **Citation bắt buộc** — mọi fact phải có nguồn peer-reviewed hoặc uy tín (CDC, Nature, PLOS ONE...)
6. **KHÔNG được phép**: sáng tạo chi tiết, làm tròn số, bỏ citation

---

## Format CHAPTER HEADER

```markdown
# CHAPTER <N>: <TIÊU ĐỀ NGẮN>

*<Subtitle 1 câu — tone kinh dị/kinh ngạc, mô tả nhóm>*

---
```

Ví dụ:
```markdown
# CHAPTER 1: PARASITES THAT CONTROL THEIR HOSTS

*Ten organisms that don't just infect — they program.*
```

---

## Tone và giọng viết

- **Không phải Wikipedia** — không bắt đầu bằng "X là một loài..."
- **Không phải clickbait** — mọi chi tiết phải verified
- Giọng: National Geographic meets horror. Tin tức đưa tin về thảm họa tự nhiên.
- Đọc to để kiểm tra: nếu nghe nhàm → rewrite
- Mỗi fact phải có 1 chi tiết khiến người đọc nói "Wait, what?"

---

## Research checklist trước khi viết

- [ ] Tên khoa học chính xác (không dùng tên đồng nghĩa cũ)
- [ ] Số liệu có nguồn cụ thể (không dùng "khoảng", "gần", "có thể")
- [ ] Citation: Author, Year, Journal — kiểm tra tồn tại
- [ ] Không trùng với fact đã có trong ebook (grep `<tên loài>` trước)

---

## Quy trình viết fact mới

1. Research: tìm 1 hành vi/cơ chế cụ thể nhất, không phải tổng quan loài
2. Tìm citation chính xác
3. Viết hook — test: người đọc có dừng scroll không?
4. Viết 2-3 đoạn theo format
5. Tự đọc lại: có đoạn nào mờ nhạt / không có số liệu / không có gut punch?
6. Append vào `output/ebook/<ebook-slug>.md` đúng chapter

---

## Ebook hiện có

| File | Chủ đề | Facts | Status |
|------|--------|-------|--------|
| `output/ebook/100-nature-facts.md` | Nature horror facts (parasites, weapons, survivors...) | 100/100 | ✅ Complete |

Khi tạo ebook mới: tạo `output/ebook/<slug>/` folder + `<slug>.md` theo cùng format.
