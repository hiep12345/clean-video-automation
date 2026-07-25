---
name: social-post-writer-seo
description: "Tạo Upload Metadata per-platform (FB/IG/YT) cho tất cả kênh. Hook-context-value-CTA-hashtags framework. Mỗi platform có title/caption/hashtag riêng biệt."
risk: safe
source: antigravity-awesome-skills
date_added: "2026-05-14"
updated: "2026-06-17"
---

# Social Post Writer (SEO-Optimized, Per-Platform)

## Step 1: Load Channel Rules

Hệ thống tự động nạp tệp quy tắc caption (caption-rules.md) tương ứng theo channel-slug của tác vụ hiện hành từ thư mục references/ của kỹ năng này (đường dẫn: references/[channel_slug_prefix]-caption-rules.md). Nếu tệp quy tắc không tồn tại, in ra cảnh báo "No caption rules for [slug]", nạp Universal Template bên dưới làm fallback, và sau đó khởi tạo tệp quy tắc mới tương ứng trong references/.

---

## Step 2: Format per Platform

### ⛔ MANDATORY: Mỗi script.md phải có đủ sections

```markdown
## Upload Metadata

### Facebook
**Title:** [...]
**Caption:** [...]
**Hashtags:** [...]
**Thumbnail:** [...]

### Instagram
**Caption:** [...]
**Thumbnail:** [...]

### YouTube          ← CHỈ khi channel có platforms: youtube
**Title:** [...]
**Description:** [...]
**Tags:** [...]
**Thumbnail:** [...]
```

**Không viết một caption dùng chung cho tất cả platforms.**

### Platform Differences

| Platform | Title | Caption length | Hashtags | Thumbnail |
|----------|-------|----------------|----------|-----------|
| Facebook | Có | 150-300 chars | **max 3** tags | Option A (9:16) |
| Instagram | KHÔNG (dòng đầu caption = hook) | 100-200 chars + line breaks | **max 5** tags (niche-targeted) | Option A (9:16) |
| YouTube | Có (50-70 chars, searchable) | 150-300 chars description | 5 tags | Option B nếu có |

---

## Writing Principles (mọi platform)

- **Simple and clear English** — không dùng jargon phức tạp
- **Factual, no speculation** — không bịa thông tin
- **Mobile-first** — short sentences, line breaks sau mỗi 1-2 câu
- **No AI patterns** — không dùng "fascinating", "delve", "it's worth noting"
- **Fewer emojis** — 1-2 max (FB/YT), 2-3 max (IG)

---

## Hashtag Volume

> ⛔ Theo fb-monetization-policy.md — GATE rule, không exception.

| Platform | Volume | Strategy |
|----------|--------|----------|
| Facebook | **max 3** + ID tag | #Channel + #Topic + #Broad + **#<channel_code><task_number>** (Ví dụ: `#suv193` cho video `su-v193-planthopper-nymph`) | <!-- allow-channel-name -->
| Instagram | **max 5** + ID tag | niche-targeted only + **#<video_id_no_hyphen>** |
| YouTube | 5 + ID tag | 3 broad + 2 very specific + **#<video_id_no_hyphen>** |

> 📌 **BẮT BUỘC (System Rule)**: Mọi caption sinh ra cho FB, IG, YT bắt buộc phải chứa hashtag ID của video viết liền không dấu gạch ngang (Ví dụ: `#[channel_code][task_number]` như `#suv193` cho `su-v193-planthopper-nymph`). Đây là khóa chính để hệ thống tự động quét đối chiếu bài đăng thực tế trên Facebook và cập nhật trạng thái buffer cục bộ. <!-- allow-channel-name -->

---

## Universal Caption Template (fallback — dùng khi không có channel rules file)

### Facebook
```
[Hook: 1 câu shock/question]
[1 core fact]
AI Disclosure: Made with AI
#[channel_tag] #[topic_tag] #[broad_tag] #[video_id_no_hyphen]
```

### Instagram
```
[Hook standalone sentence]

[1-2 sentences core value]
AI Disclosure: Made with AI

#[channel_tag] #[niche1] #[niche2] ... (15-30 total)
```

---

## Common Fixes

| Problem | Fix |
|---------|-----|
| Single caption cho tất cả platforms | Viết riêng FB / IG / YT sections |
| Caption quá promotional | Strengthen value prop trước CTA |
| Hook quá generic | Thêm specific số liệu hoặc species/topic name |
| IG hashtags > 5 | Cắt bớt — max 5, niche-targeted only (GATE rule) |
| YT title > 70 chars | Shorten — YT truncates at ~70 chars in search |
| Missing AI Disclosure | Thêm "AI Disclosure: Made with AI" vào FB + IG captions |

---

## Trigger Keywords

`caption`, `viết caption`, `FB Reels caption`, `YouTube title`, `Instagram caption`, `hook`, `social post`, `optimize caption`, `rewrite caption`, `hashtags`, `EN audience copy`, `upload metadata`, `per platform`, `pinned comment`, `reply seed`, `comment strategy`, `plant id block`
