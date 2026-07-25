# Biology & Wildlife (Science Unlocked) Topic Visual Criteria Card
# Biology & Wildlife — Topic Pre-Screen Gate
# CC sử dụng file này để pre-screen trước khi thêm vào ## Ideas

---

## ✅ PASS — Topic phải đạt TẤT CẢ

1. **Behavior là động từ, không phải danh từ**
   - Đúng: "sheds its entire body and regrows a new one", "flips sharks upside down"
   - Sai: "has venomous skin", "is camouflaged", "looks like a rock"

2. **Có ít nhất 3 visual moments riêng biệt trong 30-35 giây**
   - Scene 1: Setup / context
   - Scene 2: Behavior xảy ra (hành động chính)
   - Scene 3: Outcome / consequence
   - Thiếu 1 trong 3 → REJECT

3. **Tốc độ di chuyển AI render được**
   - AI (Veo) render tốt: 0.5–5 giây per action, fluid movement, transformation
   - AI KHÔNG render được: striking < 50ms (centipede), bipedal sprinting, precision catching mid-air
   - Test: "Nếu quay slow-motion ở 30fps thì có thể thấy từng frame không?" → YES = PASS

4. **Anatomy ổn định, không hallucination-prone**
   - SAFE: vertebrates (fish, mammal, bird, reptile), sea slugs, jellyfish, squid
   - RISK: nhiều chân (centipede 42 chân), complex appendages (crab claws), hybrid anatomy
   - Rule: nếu AI thường xuyên tạo ra "extra limbs" hoặc "wrong body plan" → REJECT

5. **Hook 1 câu làm người xem nói "không thể có thật"**
   - Test: đọc hook cho người không biết biology → họ có gọi là fake không?
   - Nếu reaction là "ừ thú vị" thay vì "không thật!" → topic WEAK

6. **Chưa có trong species-index.md và channel.db**
   - Bắt buộc chạy `python scripts/topic_dedup.py` trước khi confirm

---

## ❌ REJECT — Bất kỳ tiêu chí nào sau = loại ngay

| Pattern | Lý do | Ví dụ tệ |
|---------|-------|---------|
| Static ambush predator | Video sẽ gần như tĩnh, không có action | Stonefish, leaf-tailed gecko |
| Camouflage-only topic | Cơ chế là "nằm im", không có visual progression | Stone bug, walking stick |
| Behavior < 100ms | AI không capture được | Mantis shrimp punch, tongue catch |
| Abstract phenomenon | Không có organism rõ ràng để visualize | "Animal intelligence" chung chung |
| Anatomy > 10 identical limbs | Veo hallucinate, tạo ra extra limbs | Centipede (42 chân), millipede |
| Well-known pop-sci topic | Low novelty, competitors đã khai thác hết | Platypus, chameleon color change |
| Requires human face/specific person | Policy risk + AI face generation issues | Primate "politics" với human interaction |

---

## 🔥 PRIORITY — Topic score cao nhất

Kết hợp được 2 trong 3 yếu tố sau = PRIORITY queue:

- **TRANSFORMATION**: cơ thể thay đổi hình dạng/cấu trúc trong video (regrow, shed, morph)
- **IMPOSSIBLE BEHAVIOR**: làm điều mà người xem cho là không thể với loài đó
- **HUMAN THREAT**: có liên quan đến nguy hiểm với người, tạo personal stakes

---

## Visual Score Quick Check (0-3)

Trước khi thêm topic vào ## Ideas, tự cho điểm:

| Câu hỏi | Có = +1 |
|---------|--------|
| Video có ≥3 scene rõ ràng? | |
| Có 1 moment "wow" dễ capture bằng AI? | |
| Hook đọc lên nghe như clickbait nhưng là sự thật? | |

**Score 3/3** = thêm vào ## Ideas ngay
**Score 2/3** = thêm nếu topic còn mới/fresh
**Score 1/3 trở xuống** = REJECT

---

## 🔍 Search Sources & Queries

- **Nguồn tìm kiếm (Search Sources):** ScienceAlert, IFLScience, Mongabay, The Week (wildlife), ScienceDaily odd creatures
- **Queries mẫu:**
  - `site:sciencealert.com animal behavior discovery 2025 2026`
  - `site:news.mongabay.com unexpected animal 2025`
  - `"scientists discovered" animal ability shock 2025 2026`
  - `animals with impossible abilities biology facts viral`
  - `[competitor channel] facebook reels animal shocking` <!-- allow-channel-name -->
