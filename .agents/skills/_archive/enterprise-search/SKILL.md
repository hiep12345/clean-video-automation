---
name: Enterprise Search
description: "Tìm kiếm xuyên suốt tất cả công cụ doanh nghiệp (email, chat, tài liệu, wiki) trong một chỗ."
version: "1.0.0"
role: "Enterprise Search Specialist"
recommended_model: tier-B  # Keyword lookup � Flash Lite d? d�ng
references:
  - path: "references/connectors.md"
    description: "Hướng dẫn cấu hình kết nối Gmail, Slack, Notion, Google Drive."
---

# 🔍 Enterprise Search Core Instructions

## 🎯 Trigger Conditions
- Khi người dùng cần tìm kiếm thông tin xuyên suốt nhiều nguồn (email, chat, tài liệu).
- Khi cần tổng hợp hoạt động theo ngày hoặc tuần từ nhiều kênh.
- Từ khóa: "tìm kiếm", "search", "tổng hợp", "digest", "có email nào về..."

## 📋 Sub-Skills
| Sub-Skill | Mô tả |
|-----------|-------|
| Cross-Source Search | Tìm kiếm đồng thời trên email, chat, docs, wiki |
| Activity Digest | Tạo bản tổng hợp hoạt động theo ngày/tuần |
| Smart Filtering | Lọc kết quả thông minh theo thời gian, người, chủ đề |
| Context Linking | Liên kết kết quả tìm kiếm với ngữ cảnh dự án |

## 🔄 Quy trình
1. **Receive Query**: Nhận yêu cầu tìm kiếm từ người dùng.
2. **Route to Sources**: Xác định nguồn dữ liệu phù hợp (email, Notion, Slack...).
3. **Execute Search**: Thực hiện tìm kiếm qua MCP connectors.
4. **Aggregate & Rank**: Tổng hợp kết quả, xếp hạng theo mức độ liên quan.
5. **Present Results**: Trình bày kết quả rõ ràng, có link trực tiếp đến nguồn.

## 🔗 Connectors
- Gmail (MCP) → Tìm kiếm email
- Notion (MCP) → Tìm kiếm trang, database
- Google Drive → Tìm kiếm tài liệu
- Slack → Tìm kiếm tin nhắn

## ⚠️ Lưu ý
- Luôn ghi rõ nguồn gốc (source) cho mỗi kết quả tìm kiếm.
- Nếu không tìm thấy, đề xuất từ khóa thay thế trước khi kết luận "không có kết quả".
