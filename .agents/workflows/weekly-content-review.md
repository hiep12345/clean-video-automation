---
description: "Review hiệu suất content hàng tuần: dashboard → insights → kế hoạch tuần sau."
skills: [competitive-landscape, content-strategy]
---

# /weekly-content-review

> **Mục tiêu**: Đánh giá tuần vừa qua + lên kế hoạch tuần tới
> **Khi nào dùng**: Cuối tuần (Chủ nhật) hoặc đầu tuần (Thứ hai)
> **Method**: Browser → Dashboard trực tiếp (YouTube Studio, FB Creator Studio)

## Bước 1: Thu thập data
- **Goal**: Collect performance metrics từ dashboards chính xác nhất
- **⛔ QUY TẮC TỐI THƯỢNG**: CẤM tái sử dụng số liệu cũ hoặc tự bịa ra data. BẮT BUỘC phải cào dữ liệu live mới nhất từ đúng kênh được yêu cầu. Nếu kẹt captcha/login, phải báo user, tuyệt đối không lấp liếm bằng data cũ!
- **Actions**:
  1. **Facebook** → `python scripts/fb_page_insights.py --page <slug> --save` (Graph API, không cần browser)
  2. **YouTube Studio** → Dùng YouTube Analytics API hoặc browser: navigate đến studio.youtube.com → extract metrics → screenshot dashboard
  3. **Affiliate dashboard** (nếu có): clicks, conversions, revenue
  4. So sánh với tuần trước (week-over-week)
- **Output**: Raw metrics (JSON/CSV) và Screenshots

## Bước 1b: Cập nhật meta.json (nếu có)
- **Goal**: Điền performance data vào meta.json của từng video đã có data
- **Actions**:
  1. Tìm tất cả `output/*/meta.json` có `"performance": null`
  2. Với mỗi video đó: điền views, CTR, watch_time, conversions từ data bước 1
  3. Update field: `"performance": {"views": N, "ctr": "X%", "watch_time_avg": "Xs", "conversions": N, "measured_at": "YYYY-MM-DD"}`
- **Output**: meta.json updated → data source cho trend analysis về sau

## Bước 2: Phân tích & Insights
- **Goal**: Rút ra insights actionable từ data
- **Actions**:
  1. Top performer: Video nào đang HOT? Tại sao?
  2. Under-performer: Video nào dưới kỳ vọng? Root cause?
  3. Trend: CTR tăng/giảm? Watch time thay đổi?
  4. Revenue per video: so với KPI target
- **Output**: Insights summary (3-5 key takeaways)

## Bước 3: KPI tracking
- **Goal**: So sánh actual vs target
- **Actions**:
  1. So sánh revenue actual vs monthly target
  2. Tính run-rate: nếu giữ pace này, đạt target không?
  3. Identify bottleneck: CTR, conversion, hay traffic?
  4. Kiểm tra UTM links hoạt động đúng không
- **Output**: KPI dashboard + gap analysis

## Bước 4: Competitive check (tuỳ chọn)
- **Goal**: So sánh performance với đối thủ
- **Skills**: `competitive-landscape`
- **Actions**:
  1. Check 2-3 competitor channels: họ đăng gì tuần này?
  2. So sánh views/engagement ratio
  3. Tìm content gaps mình chưa khai thác
- **Output**: Competitive brief (nếu có insights mới)

## Bước 5: Plan tuần tới
- **Goal**: Xác định actions cụ thể cho 7 ngày tới
- **Skills**: `content-strategy`
- **Actions**:
  1. Chọn 2-3 videos cần làm tuần tới (dựa trên insights)
  2. Xác định 1 experiment/test (A/B thumbnail, title format...)
  3. Follow-up actions (reply comments, update links...)
  4. Cập nhật SQLite task DB
- **Output**: Weekly action plan

## Quality Gate
- [ ] Data đủ: views, CTR, watch time, engagement
- [ ] Có ít nhất 3 insights actionable
- [ ] KPI gap analysis rõ ràng
- [ ] Tuần tới: 2-3 videos planned + 1 experiment
- [ ] TASKS.md đã cập nhật

## 📚 Auto-Save → Obsidian KB
- **Điều kiện**: Luôn lưu (analytics data = compound value over time)
- **Nội dung lưu**: KPIs + top/bottom performers + insights + next week plan
- **Action**: Chạy `/obsidian-kb-save` sau bước 5 — folder theo routing table trong obsidian-kb-save.md
