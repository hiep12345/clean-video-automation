# Cấu hình Connectors (MCP) — Enterprise Search

## Công cụ tích hợp

### 1. 💬 Chat & Giao tiếp
- **Slack**: Tìm kiếm tin nhắn, thread, file attachments.
- **Discord**: Tìm kiếm messages trong các channels.

### 2. 📧 Email & Calendar
- **Gmail (MCP)**: Tìm kiếm email theo sender, subject, date range.
- **Google Calendar**: Tra cứu sự kiện và cuộc họp.

### 3. 📝 Quản lý dự án & Kiến thức
- **Notion (MCP)**: Tìm kiếm pages, databases, comments.
- **Google Drive**: Tìm kiếm tài liệu, spreadsheets, presentations.

---

## ⚙️ Hướng dẫn thiết lập
1. **Notion**: Đã có MCP connector sẵn. Đảm bảo API key đã cấu hình.
2. **Gmail**: Cần cấu hình OAuth2 credentials trong MCP server config.
3. **Slack**: Cần Slack Bot Token với permissions: `channels:history`, `search:read`.
