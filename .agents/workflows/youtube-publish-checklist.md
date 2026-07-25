---
description: "Checklist trước publish: title, description, tags, thumbnail, cards, end screen, affiliate links."
skills: [content-creator, video-frames, clarity-gate, deep-research]
---

# /youtube-publish-checklist

> **Mục tiêu**: Đảm bảo mọi yếu tố đã sẵn sàng trước khi publish video
> **Khi nào dùng**: Video đã quay/edit xong, sắp upload
> **Skills**: content-creator, video-frames, clarity-gate, deep-research

## Bước 1: Thumbnail
- **Goal**: Thumbnail thu hút, CTR-optimized
- **Skills**: `video-frames`
- **Actions**:
  1. Extract best frame từ video (`/video-frames-thumbnail`)
  2. Tạo 2 thumbnail variants (A/B test nếu cần)
  3. Check: mặt người rõ, text lớn đọc được trên mobile, contrast cao
- **Output**: 1-2 thumbnail files (1280x720)
- **Prompt**: `"Tạo thumbnail cho video [tên] từ frame tại giây [X]"`

## Bước 2: Title & Description
- **Goal**: SEO-optimized, click-worthy
- **Skills**: `deep-research`, `content-creator`
- **Actions**:
  1. Title: keyword-rich, <60 chars, emotional trigger
  2. Description: keyword dòng đầu, timestamps, affiliate links rõ ràng
  3. Thêm disclaimer (#ad hoặc affiliate disclosure nếu cần)
- **Output**: Final title + description

## Bước 3: Tags & Metadata
- **Goal**: Maximize discoverability
- **Skills**: `deep-research`
- **Actions**:
  1. 15-20 tags: primary keyword, variations, related topics
  2. Chọn category phù hợp
  3. Set language + caption settings
  4. Add cards + end screen elements
- **Output**: Tag list + category + cards setup

## Bước 4: Affiliate Links Check
- **Goal**: Đảm bảo mọi link hoạt động + tracking đúng
- **Actions**:
  1. Test tất cả affiliate links trong description
  2. Verify tracking IDs/UTM parameters
  3. Check pinned comment (nếu đặt link ở đây)
  4. Verify disclosure text
- **Output**: ✅ All links verified

## Bước 5: Content & Video Verification
- **Goal**: Đảm bảo content không bịa đặt + video không lỗi AI
- **Skills**: `clarity-gate`
- **Actions**:
  1. Chạy 9-point check trên script (Points 1-4 bắt buộc)
  2. Scan video cho AI artifacts (morphing, extra limbs, text)
  3. Nếu BLOCK → fix script/re-generate clip trước khi publish
- **Output**: Clarity Gate verdict (PASS/NEEDS FIX/BLOCK)

## Quality Gate
- [ ] Thumbnail: rõ trên mobile, có mặt người/product
- [ ] Title: <60 chars, có primary keyword
- [ ] Description: keyword dòng 1, timestamps, links đúng
- [ ] Tags: 15-20, relevant
- [ ] Affiliate links: tất cả hoạt động + có disclosure
- [ ] Cards + End screen: đã setup
- [ ] **Clarity Gate: PASS** (script không có hallucination)
- [ ] **Video QA: PASS** (không có AI artifacts nghiêm trọng)
- [ ] Scheduled/Published time: optimal cho audience
