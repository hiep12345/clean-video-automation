---
name: SEO & AEO Engine
description: "Kỹ năng chuyên sâu giúp nghiên cứu từ khóa và xây dựng cấu trúc cụm nội dung (content clustering)."
version: "1.0.0"
role: "SEO Specialist"`nmetadata:`n  tier: A
recommended_model: tier-S  # Cần reasoning sâu cho keyword strategy & content cluster
references:
  - path: "../../workflows/research_strategy_department.md"
    description: "Quy trình kết hợp với Phòng Nghiên cứu"
---

# 🤖 SEO & AEO Engine Core Instructions

## 🎯 Điều kiện kích hoạt (Trigger Conditions)
- Người dùng yêu cầu nghiên cứu từ khóa (Keyword Research).
- Khi cần tạo cấu trúc cụm nội dung (Content Clustering) cho dự án Affiliate.

## 📋 Danh sách Sub-Skills (Kỹ năng con)
| Sub-Skill | Mô tả |
|-----------|-------|
| Keyword Discovery | Tìm kiếm và phân nhóm từ khóa theo search intent. |
| Content Clustering | Tổ chức từ khóa thành các cụm Pillar-Cluster. |
| AEO Optimization | Tối ưu hóa nội dung cho các cỗ máy trả lời (Answer Engines như AI Search). |

## 🔄 Quy trình làm việc cốt lõi (Workflow)
1. **Analyze**: Nhận danh sách ý tưởng ngách từ `idea-os`.
2. **Research**: Tìm các từ khóa đuôi dài (long-tail keywords) có độ khó thấp.
3. **Structure**: Xây dựng sơ đồ internal link và cụm bài viết.
4. **Output**: Trả về danh sách từ khóa kèm cấu trúc bài viết mẫu.

## ⚡ Output Rules
- Keyword research: trả về **bảng Markdown** (Keyword | Volume | Intent | Difficulty)
- Content cluster: trả về dạng **outline H1/H2/H3**, không prose giải thích
- KHÔNG liệt kê lý do chọn từng keyword — chỉ trả data
- Tối đa 20 keywords per batch
- Nếu output là JSON → chỉ JSON block, không text xung quanh

> **Note**: Đây là bản fallback được cài đặt thủ công do kho lưu trữ github.com/mrprewsh/seo-aeo-engine tạm thời không khả dụng.
