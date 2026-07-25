---
description: "Lên kế hoạch video từ ý tưởng → research → outline → script. Quy trình end-to-end cho YouTube affiliate."
skills: [content-creator, deep-research]
---

# /youtube-video-plan

> **Mục tiêu**: Từ 1 ý tưởng → video plan hoàn chỉnh (outline, script, SEO)
> **Khi nào dùng**: Khi bắt đầu lên kế hoạch cho video mới
> **Skills**: content-creator, deep-research

## Bước 1: Load context & chọn topic
- **Goal**: Xác định topic phù hợp với niche và audience
- **Skills**: `/obsidian-rag-retrieve` (Content-Strategy-Framework.md)
- **Actions**:
  1. Chạy `/obsidian-rag-retrieve` → lấy brand context từ Obsidian KB
  2. Chạy `/obsidian-rag-retrieve` để tìm content gaps trong KB
  3. Xác nhận topic với user: nó giải quyết vấn đề gì, cho ai?
- **Output**: Topic statement + target audience
- **Prompt**: `"Lên plan video về [topic] cho kênh affiliate"`

## Bước 2: Keyword & SEO research
- **Goal**: Tìm từ khóa chính, search intent, và competition
- **Skills**: `deep-research`
- **Actions**:
  1. Research primary keyword + 3-5 secondary keywords
  2. Phân tích search intent (informational/commercial/transactional)
  3. Check competition trên YouTube cho keyword đó
- **Output**: Keyword map + search intent analysis

## Bước 3: Competitor video analysis
- **Goal**: Học từ top videos hiện tại cho keyword
- **Skills**: `/obsidian-rag-retrieve` (Content-Strategy-Framework.md), `deep-research`
- **Actions**:
  1. Tìm top 5 videos cho keyword trên YouTube
  2. Phân tích: hook, structure, length, CTA, engagement
  3. Xác định content gap — điều gì CHƯA được cover?
- **Output**: Competitor brief + content gap opportunities

## Bước 4: Outline & Script
- **Goal**: Tạo video outline chi tiết + script draft
- **Skills**: `content-creator`
- **Actions**:
  1. Viết outline: Hook (0-30s) → Problem → Solution → Demo → CTA
  2. Draft script với timestamps cho mỗi section
  3. Thêm affiliate product mentions tự nhiên (không pushy)
  4. Viết 3 title options + 3 description drafts
- **Output**: Full outline + script + title/description options

## Bước 5: SEO metadata & publish prep
- **Goal**: Chuẩn bị metadata tối ưu cho YouTube search
- **Skills**: `deep-research`, `content-creator`
- **Actions**:
  1. Chọn title tốt nhất (keyword-rich, <60 chars, click-worthy)
  2. Viết description (keyword đầu, affiliate links, timestamps)
  3. Suggest 15-20 tags
  4. Đề xuất thumbnail concept
- **Output**: Title + Description + Tags + Thumbnail brief

## Quality Gate
- [ ] Topic align với niche strategy và brand context (Obsidian KB)
- [ ] Primary keyword có search volume hợp lý
- [ ] Script có CTA rõ ràng cho affiliate link
- [ ] Title + Description tối ưu SEO

## 📚 Auto-Save → Obsidian KB
- **Điều kiện**: Lưu khi có full outline + keyword data
- **Nội dung lưu**: Topic + keywords + outline + title options + competitor gaps
- **Action**: Chạy `/obsidian-kb-save` sau bước 5 — folder theo routing table trong obsidian-kb-save.md
