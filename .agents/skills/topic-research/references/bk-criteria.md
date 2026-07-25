# Poisonous Plants & Fungi (Botanical Killers) Topic Visual Criteria Card
# Poisonous Plants & Fungi — Topic Pre-Screen Gate
# CC sử dụng file này để pre-screen trước khi thêm vào ## Ideas

---

## ✅ PASS — Topic phải đạt TẤT CẢ

1. **Focus vào cơ chế gây độc hoặc case ngộ độc cụ thể**
   - Đúng: "causes permanent nerve damage within hours", "mistaken for wild garlic and causes liver failure"
   - Sai: "is a very tall tree", "has beautiful red flowers", "looks like a rose"

2. **Có ít nhất 3 visual moments riêng biệt trong 30-35 giây**
   - Scene 1: Nhận dạng / bối cảnh nguy hiểm (vẻ ngoài giống cây ăn được hoặc cảnh báo)
   - Scene 2: Cơ chế gây độc hoạt động (cellular damage, toxin release) hoặc triệu chứng tiêu hóa/thần kinh
   - Scene 3: Outcome / hậu quả hoặc cách phòng tránh

3. **Hình ảnh AI (Veo) render sinh động được**
   - AI render tốt: macro details, spore release, fluid leaking, leaf discoloration
   - AI KHÔNG render tốt: các quá trình biến đổi tế bào vi mô quá phức tạp không có hình ảnh tham chiếu

4. **Anatomy ổn định, không hallucination-prone**
   - Tránh các loài nấm hoặc hoa có cấu trúc hình học quá dị dạng khiến AI vẽ méo mó
   - Ưu tiên các loài có đặc điểm nhận dạng rõ ràng như lá, quả mọng, tai nấm tiêu chuẩn

5. **Hook làm người xem rùng mình hoặc giật mình**
   - Ví dụ: "This innocent garden flower can stop your heart in 3 minutes"

6. **Chưa có trong database**
   - Bắt buộc chạy `python scripts/topic_dedup.py` trước khi confirm

---

## ❌ REJECT — Bất kỳ tiêu chí nào sau = loại ngay

| Pattern | Lý do | Ví dụ tệ |
|---------|-------|---------|
| Minor irritant plants | Độc tính nhẹ, không đủ kịch tính | Plants causing mild skin itch |
| Abstract botanical facts | Thiếu visual kịch tính | Plant photosynthesis facts |
| Common supermarket plants | Low novelty | Tomato leaf mild toxicity |
| Requires complex animal interactions | AI khó render cảnh cắn/nuốt chi tiết | Specific insect eating toxic leaf |

---

## 🔥 PRIORITY — Topic score cao nhất

Kết hợp được 2 trong 3 yếu tố sau = PRIORITY queue:
- **FATAL ACCIDENTS**: các trường hợp ngộ độc thực tế nổi tiếng do nhầm lẫn
- **EXTREME MORPHOLOGY**: hình dáng đáng sợ (như chảy máu, móng vuốt)
- **COMMON HOME/GARDEN**: cây cực độc thường gặp ngay trong nhà/vườn, tăng tính tương tác

---

## Visual Score Quick Check (0-3)

Trước khi thêm topic vào ## Ideas, tự cho điểm:

| Câu hỏi | Có = +1 |
|---------|--------|
| Video có ≥3 scene rõ ràng? | |
| Có 1 moment "wow" hoặc rùng mình dễ capture bằng AI? | |
| Hook có yếu tố cảnh báo nguy hiểm thực tế cực mạnh? | |

**Score 3/3** = thêm vào ## Ideas ngay
**Score 2/3** = thêm nếu topic còn mới/fresh
**Score 1/3 trở xuống** = REJECT

---

## 🔍 Search Sources & Queries

- **Nguồn tìm kiếm (Search Sources):** PoisonControl.org reports, Royal Horticultural Society, Kew Gardens news, FDA Poisonous Plant Database
- **Queries mẫu:**
  - `toxic plants mistaken for edible UK US Australia 2025`
  - `poisonous plant pets deaths 2025`
  - `plants that look like food but deadly`
  - `garden plants most dangerous hidden toxicity`
