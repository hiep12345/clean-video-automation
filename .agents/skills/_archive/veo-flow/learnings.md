# Veo Flow — Learnings

## What Works
- Google Flow đã login trên browser agent → generate được bình thường
- Prompt dạng "Shot on RED Raptor, macro lens, f/2.8" → output photorealistic
- Model Veo 3.1 - Fast tự chọn khi submit prompt (mặc định)
- Flow tự tạo 2 variants per prompt (x2)
- Vertical format (9:16) hoạt động tốt cho Shorts
- **Tách prompt engineering thành references/** → SKILL.md gọn, lazy load khi cần
- **⭐ Keyframe-First Workflow**: Imagen (Nano Banana 2) → keyframe ảnh → Veo image-to-video → chất lượng cao hơn text-only
- **Nano Banana 2**: Image mode, x4 variants, chất lượng rất cao cho camping scenes
- **Batch image gen**: 7 prompts × 4 variants = 28 ảnh, chạy liên tục OK, ~2 phút/batch
- **Veo 8s max**: Đủ cho ASMR Reels — loop ×3 trong CapCut = 24s Reel hoàn chỉnh
- **ASMR content loop tự nhiên**: Rain, fire, snow = ambient, lặp không thấy gián đoạn

## What Doesn't
- **Veo batch 7 prompts × 2 variants = 14 clips**: ~5/14 bị fail (safety filter + "unusual activity")
- **Campfire prompt bị chặn hoàn toàn**: 0/2 thành công → có thể do safety filter với fire/flames
- ~~Download tự động chưa khả thi~~ → **ĐÃ GIẢI QUYẾT**: scripts/download_project.py
- Session timeout chưa xác định chính xác (ước ~24h)
- **TRÁNH từ cấm**: "photorealistic", "8K", "beautiful", "studio lighting" → trigger AI look
- **TRÁNH prompt <20 từ** → output generic
- **Video batch lớn (>5)**: Nhiều clip fail → nên chia thành 3-4 prompts/batch, đợi xong rồi batch tiếp
- **⛔ Browser download**: → xem `video-production-guardrails.md` BANNED Patterns

## ⚠️ Known Bugs
→ Xem `memory/context/video-production-guardrails.md` (SSOT cho production issues)

## Run Log
| Date | Action | Result | Notes |
|------|--------|--------|-------|
| 2026-04-27 | Generate 1 clip (biophoton hand) | OK, 2 variants | Veo 3.1 Fast, ~3min |
| 2026-04-27 | SKILL.md v1.1 → tách prompt guide | OK | references/veo-prompt-guide.md (170 lines) |
| 2026-04-28 | Batch 7 keyframe images (Nano Banana 2, x4) | ✅ 27/28 OK | 1 ảnh bị lỗi load, còn lại rất đẹp |
| 2026-04-28 | Batch 7 Veo video prompts (8s, x2) | ⚠️ 9/14 OK | 5 clips fail (safety/unusual activity) |
| 2026-04-28 | SKILL.md v1.2 → thêm Keyframe-First Workflow | OK | Best practice từ user experience |
| 2026-04-30 | Batch 2: 3 videos × 6 prompts (zombie snail, tongue louse, toxoplasma) | ✅ 35/36 clips OK | 6 prompts/project = safe zone, download_project.py worked perfectly |
| 2026-04-30 | Assembly 3 videos với concat workaround | ✅ 3/3 final.mp4 OK | Concat bug cần manual fix. V10=40s, V11=42s, V12=50s |

