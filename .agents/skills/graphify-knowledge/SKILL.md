---
name: Graphify Knowledge
description: "Truy vấn Knowledge Graph của toàn workspace để phân tích kiến trúc, impact, call/reference paths và quan hệ giữa code, config, tài liệu Obsidian. Dùng skill này trước các refactor lớn, đổi API/hàm/thư mục, sửa luồng dữ liệu chính, hoặc khi cần hiểu một tính năng trải qua nhiều repository; không dùng cho chỉnh sửa nhỏ có thể giải quyết bằng rg."
risk: safe
updated: "2026-07-27"
---

# Graphify Knowledge

Graphify là bản đồ dẫn xuất của workspace, không phải một nguồn sự thật mới.
Code/config và Obsidian vẫn là dữ liệu gốc; `graphify-out/` có thể xóa và build
lại bất kỳ lúc nào. Luôn đọc trường `coverage`: bản local mặc định chỉ phủ code;
note Obsidian chỉ có trong graph sau semantic deep scan.

## 1. Chọn đúng nguồn

- Tri thức nghiệp vụ, công thức kênh, policy, learning: đọc
  `content-planner-kb/obsidian-kb/`.
- Trạng thái vận hành hiện tại: đọc SQLite, Notion hoặc runtime API phù hợp.
- Tìm chuỗi chính xác hoặc sửa nhỏ trong một file: dùng `rg` và đọc source.
- Kiến trúc, impact, call path hoặc quan hệ xuyên repo: dùng Graphify trước.

Graphify giúp thu hẹp phạm vi cần đọc; kết luận quan trọng vẫn phải được xác
nhận từ source thật.

## 2. Health check trước khi truy vấn

Chạy từ root `clean-video-automation`:

```powershell
python content-planner-kb/scripts/update_knowledge_graph.py status --json
```

- `FRESH`: truy vấn graph trong đúng phạm vi ghi tại `coverage`.
- `STALE` và `required_action=update`: chạy bản cập nhật AST cục bộ:

```powershell
python content-planner-kb/scripts/update_knowledge_graph.py update --json
```

`update` không dùng LLM hay API credit và chỉ làm mới code graph. Nếu nó thất
bại, báo graph unavailable rồi fallback sang `rg`; không được giả vờ rằng graph
hiện hành.

Nếu `required_action=deep`, hoặc cần đưa note/config vào graph, chỉ chạy semantic
rebuild khi người dùng đã cho phép dùng Gemini API:

```powershell
python content-planner-kb/scripts/update_knowledge_graph.py deep --json
```

Không mặc định rằng cron, hook hoặc scheduled task đang hoạt động. Luôn dựa
trên kết quả `status`.

## 3. Map Before Move

Trước refactor kiến trúc, chạy tối thiểu một truy vấn phù hợp:

```powershell
graphify query "Home Decor production profile đi qua module nào?"
graphify affected "produce_pipeline"
graphify path "facebook_config" "fb_page_insights"
graphify explain "production_manifest"
```

Sau đó:

1. Ghi lại node/file liên quan và quan hệ chính.
2. Mở trực tiếp những source file nằm trong write scope.
3. Phân biệt cạnh `EXTRACTED` với `INFERRED`; không coi inference là bằng chứng
   cuối cùng.
4. Thực hiện thay đổi và chạy test hồi quy theo impact map.
5. Sau refactor lớn, chạy lại `update` để graph phản ánh source mới.

## 4. Guardrails

- Không chỉnh sửa trực tiếp file trong `graphify-out/`.
- Không commit graph, report, visualization hoặc build metadata được sinh ra.
- Không đưa `.env`, credentials, token, database hay media vào corpus.
- Không dùng graph để thay thế kiểm tra Git status, task ownership hoặc
  workspace ACK.
- Không chạy `deep` chỉ để xử lý thay đổi nhỏ; semantic extraction có thể dùng
  API credit và gửi nội dung tài liệu tới backend đã cấu hình.
