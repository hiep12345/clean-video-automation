# Skill: Ebook Publisher
**Owner**: Claude Code
**Scope**: Technical pipeline — gen images, compile PDF, QA, distribute

---

## Khi nào dùng skill này

Khi ebook content đã hoàn chỉnh và cần: gen ảnh còn thiếu → rebuild PDF → QA → upload lên kênh phân phối.

---

## Pipeline chuẩn (theo thứ tự)

### Bước 1 — Kiểm tra images còn thiếu

```powershell
# Xem fact nào chưa có image
$existing = Get-ChildItem "output\ebook\images" -Name |
  Where-Object { $_ -match "^fact_\d+\.png" } |
  ForEach-Object { [int]($_ -replace "fact_0*(\d+)\.png", '$1') }
$missing = (1..100) | Where-Object { $_ -notin $existing }
"Missing: $($missing -join ', ')"
```

### Bước 2 — Gen images còn thiếu (resume-safe)

```bash
# Gen tất cả còn thiếu (tự động skip đã có)
python scripts/ebook/gen_ebook_images.py --ebook-dir output/ebook

# Chỉ gen từ fact N trở đi
python scripts/ebook/gen_ebook_images.py --ebook-dir output/ebook --facts-only --start-from 88

# Chỉ gen chapter headers
python scripts/ebook/gen_ebook_images.py --ebook-dir output/ebook --chapters-only
```

**Verify sau gen:**
- Kiểm tra output: `OK (XXXkB)` mỗi fact
- Failed list cuối output → retry manually nếu cần
- Min file size: 5KB (script tự skip files nhỏ hơn)

### Bước 3 — Compile PDF

```bash
python scripts/ebook/generate_pdf.py --ebook-dir output/ebook
```

**Verify output:**
- `PDF saved: output/ebook/100-nature-facts.pdf`
- Size ≥ 15MB (với đầy đủ images)
- Pages ≥ 150

### Bước 4 — QA PDF

Mở file và check:
- [ ] Cover page hiển thị đúng
- [ ] Ít nhất 1 chapter splash có image
- [ ] Facts có image banner (fact_001.png visible ở trang đầu)
- [ ] Footer có page number
- [ ] Không có trang trắng thừa
- [ ] File size hợp lý (15-30MB cho full illustrated)

### Bước 5 — Distribution

#### Gumroad (primary)
1. Vào gumroad.com → Products → Edit hoặc tạo product mới
2. Upload file: `output/ebook/100-nature-facts.pdf`
3. Set price: Pay-what-you-want (min $0, suggested $5)
4. Product name: "100 Nature Facts That Will Break Your Brain"
5. Cover image: dùng `output/ebook/images/chapter_01.png` (crop square)
6. Description template:
   ```
   100 scientifically verified facts about the strangest creatures on Earth.
   Parasites that control minds. Plants that kill. Animals that shouldn't exist.
   Every fact has a citation. Every fact will break your brain.
   ```
7. Copy product link → paste vào FB/YT bio

#### Amazon KDP (secondary — requires reformatting)
- KDP yêu cầu format khác: epub hoặc PDF với margins cụ thể
- Minimum: 24 pages, ISBN optional cho ebook
- ⚠️ Chờ review 24-72h trước khi live
- Guide: kdp.amazon.com → Publish → Kindle Ebook

#### FB/YT Channel (traffic driver)
- Thêm Gumroad link vào FB Page bio của cả 3 kênh
- Caption template cho post giới thiệu:
  ```
  We turned our most viral nature facts into a free ebook.
  100 facts. Every one verified. Every one disturbing.
  Link in bio 👆
  ```

---

## File locations

| Artifact | Path | Lifecycle |
|----------|------|-----------|
| Markdown source | `output/ebook/<slug>.md` | Permanent — KHÔNG xóa |
| PDF output | `output/ebook/<slug>.pdf` | Permanent — KHÔNG xóa |
| Images | `output/ebook/images/` | Permanent — KHÔNG xóa |
| Temp scripts (regen_*.py, qa_*.py) | `output/ebook/` | Xóa sau session |

---

## Troubleshooting

| Vấn đề | Fix |
|--------|-----|
| `imagen-4.0-generate-001` 403/404 | Script tự fallback sang `imagen-4.0-generate-001` → `gemini-2.5-flash-image` |
| PDF size < 5MB | Images chưa gen đủ — check `--start-from` và rerun |
| `fpdf2` not found | `pip install fpdf2` |
| Font không load | Script dùng `C:/Windows/Fonts/arial.ttf` — chỉ chạy được trên Windows |
| Image bị skip dù thiếu | File tồn tại nhưng < 5KB (corrupt) → xóa file đó rồi rerun |

---

## Quy tắc bảo vệ artifacts

- `output/ebook/*.md` và `output/ebook/*.pdf` = **product inventory**, KHÔNG BAO GIỜ xóa
- `output/ebook/images/*.png` = generated assets, KHÔNG xóa (tốn tiền API để gen lại)
- Chỉ xóa: `regen_*.py`, `qa_*.py`, `test_*.py`, `__pycache__/` — sau mỗi session
