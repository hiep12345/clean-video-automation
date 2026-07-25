---
name: monthly-system-review
description: "Ceremony hàng tháng: audit hệ thống → fix stale skills → cập nhật knowledge → đảm bảo system không drift."
trigger: "/monthly-system-review"
---

# /monthly-system-review — Monthly System Ceremony

> **Khi nào dùng**: Đầu mỗi tháng (~ngày 1-3) hoặc khi audit phát hiện nhiều WARN
> **Thời gian**: ~60 phút
> **Mục tiêu**: Hệ thống không drift — skills accurate, knowledge current, health clean

## Bước 1: System Audit (5 phút)

```
python scripts/channel_db.py status
python scripts/validate_learnings.py --strict
```

Đọc output `Handover.md` và SQLite DB:
- Check Trạng thái Skills
- Check Health Checks và các lỗi phát sinh
- Check trạng thái các video dở dang hoặc lỗi trong DB/output

**Output**: Danh sách issues chia theo nhóm: Skills / Output / Other

## Bước 2: Skill Review (30 phút)

Với mỗi skill bị flag WARN (stale > threshold):

```
1. Đọc skill SKILL.md
2. Đọc Handover.md và SQLite DB để biết current state
3. So sánh: Skill nói gì vs thực tế hiện tại?
4. Nếu còn đúng → chỉ update verified date
5. Nếu có gì sai → update nội dung sai + update verified date
6. Ghi vào learnings.md R&D Log nếu thay đổi significant
```

**Rule**: Chỉ update phần SAI. Không refactor toàn bộ skill.

**Sau khi update**: Thay `verified=YYYY-MM-DD` trong meta comment bằng ngày hôm nay.

### 2b: Skill Learnings Promotion Check

Với MỖI active skill trong `.agents/skills/`:

```
1. Đọc skill/learnings.md → Run Log
2. Đếm entries cùng pattern (same Key Learning hoặc cùng loại outcome)
3. Nếu 3+ entries cùng pattern → đề xuất promote thành rule trong SKILL.md
4. Nếu 3+ entries ❌ cùng loại → đề xuất thêm anti-pattern hoặc fix workflow
5. Nếu skill chưa có entry nào sau 30 ngày → xem xét archive (skill không được dùng)
```

**Output**: Danh sách: skill → pattern → action đề xuất → user approve trước khi thay đổi SKILL.md

## Bước 3: Output Cleanup (10 phút)

Dựa trên Section 6 và Health Checks:

| Trạng thái | Action |
|------------|--------|
| LIMBO (>7 ngày, không có gì) | Hỏi user: archive hay tiếp tục? |
| DIRTY (có temp_clips/) | Xóa temp_clips/ nếu final.mp4 đã verify OK |
| Duplicate veo_clips/ | Giữ 1080p, xóa bản thấp hơn |
| IN_PROGRESS | Nhắc user: video này cần render |

## Bước 4: Knowledge Update (10 phút)

1. Đọc `learnings.md` — có insight nào chưa được phản ánh trong skill không?
2. Đọc Obsidian KB `_meta/reviews/weekly-*.md` gần nhất — có trend mới không?
3. Nếu có insight mới → update skill tương ứng + update verified date
4. SSOT check: insight mới → đúng file chưa? (không tạo entry trùng)
5. **Duplicate audit**: grep từng anti-pattern trong `learnings.md` → nếu đã có trong `guardrails.md` → xoá khỏi `learnings.md` ngay trong bước này

### Bước 4b: Audit Rule & Overhead (Kaizen Review)
1. Đọc `learnings.md` phần **Active Tickets (PROBATION)** để tìm các rule mới được đưa vào thử nghiệm (ví dụ: Map Before Move).
2. Đánh giá ROI (Lợi ích thu được vs Token/thời gian bỏ ra): Nếu rule không giúp phát hiện lỗi hoặc không còn phù hợp, BẮT BUỘC đề xuất xóa bỏ để "tỉa cành" (pruning) hệ thống.
3. Nếu rule hiệu quả, đề xuất chuyển đổi nó thành script tự động và đưa vào quy chuẩn chính thức.
## Bước 5: Health Check Resolution (5 phút)

Với các issues còn lại từ Bước 1:
- **BUG severity**: Tạo task trong SQLite task DB ngay
- **WARN severity**: Fix trong session này hoặc add to SQLite task DB với deadline
- **INFO severity**: Evaluate — worth fixing now hay backlog?

## Quality Gate

- [ ] Không còn WARN nào trong health checks (hoặc đã tạo task tracking)
- [ ] Tất cả stale skills đã được review + verified date updated
- [ ] SQLite task DB đã cập nhật với BUG/WARN items chưa fix
- [ ] Không có LIMBO videos >14 ngày chưa quyết định
- [ ] meta.json của videos cũ đã được populate performance data

## Bước 6: Re-schedule Daily Notification (2 phút)

CronCreate jobs expire sau 7 ngày. Re-schedule để giữ daily push notification hoạt động:

```
Nhắc agent: "Re-schedule daily pulse notification"
→ Agent chạy CronCreate: cron="47 8 * * *", durable=true, recurring=true
→ Prompt: "Đọc Handover.md và SQLite DB. Nếu có BUG/WARN → PushNotification tóm tắt <180 ký tự. Chỉ INFO hoặc không có → bỏ qua."
```

> Windows Task Scheduler (audit lúc 8:00) không cần re-schedule — permanent.

## SSOT

- Kết quả ceremony → KHÔNG tạo doc mới, cập nhật trực tiếp vào files gốc
- Bài học từ ceremony → `learnings.md` > "What Works/Doesn't"
- Skill changes → log vào `learnings.md` > "R&D Log" nếu significant
