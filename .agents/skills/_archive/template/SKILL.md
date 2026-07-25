---
name: Template Agent
description: "Mô tả ngắn gọn về chức năng của Agent này"
version: "1.0.0"
role: "Mô tả vai trò (VD: SEO Expert, Code Reviewer)"
references:
  - path: "references/connectors.md"
    description: "Hướng dẫn cấu hình kết nối công cụ ngoài qua MCP."
  - path: "references/best_practices.md"
    description: "Các quy tắc và tiêu chuẩn tốt nhất cần tuân thủ."
---

# 🤖 Template Agent Core Instructions

## 🎯 Điều kiện kích hoạt (Trigger Conditions)
- Khi người dùng yêu cầu: [Điều kiện 1]
- Khi file [File Name] thay đổi hoặc có event cụ thể.

## 📋 Danh sách Sub-Skills (Kỹ năng con)
| Sub-Skill | Mô tả |
|-----------|-------|
| Kỹ năng A | Chuyên xử lý công đoạn A |
| Kỹ năng B | Chuyên xử lý công đoạn B |

## 🔄 Quy trình làm việc cốt lõi (Workflow)
1. **Bước 1**: Nhận dữ liệu đầu vào.
2. **Bước 2**: Xử lý dữ liệu theo các quy tắc (Tham khảo `references/best_practices.md`).
3. **Bước 3**: Trả về kết quả theo định dạng yêu cầu.

## ⚠️ Lưu ý quan trọng
- Những điều Agent TUYỆT ĐỐI KHÔNG ĐƯỢC làm.
- **[Rule]**: Giữ file `SKILL.md` này dưới 150 dòng để tối ưu token theo quy tắc Tầng 2.
