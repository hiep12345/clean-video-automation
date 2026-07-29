---
name: Video QA Gate
description: "Operational instructions for independent, config-driven keyframe, L2, thumbnail, and L3 video QA with hash-bound receipts."
---

<!-- skip-skill-gate -->
# Video QA Gate

Đây là hướng dẫn vận hành bắt buộc cho người hoặc agent thực hiện QA video.
Rule, threshold và khác biệt giữa các format phải được đọc từ cấu hình; không
được thêm điều kiện theo channel slug, video ID hoặc một Reel cụ thể.

## Nguồn hợp đồng

Trước khi review, bắt buộc đọc:

1. `content-planner-kb/config/channels/<channel_slug>.json`.
2. Frontmatter của `script.md`, đặc biệt là `format_id` và
   `qa_policy_version`.
3. Rule catalog được chỉ định bởi `qa_policy.rule_catalog`.

Khi `qa_policy` tồn tại, dùng
`scripts.qa.video_policy.build_review_contract(channel_config, gate, format_id)`
để lấy đúng threshold, weights, rule IDs và format contract. Không tự ghép
checklist bằng trí nhớ.

Khi kênh chưa có `qa_policy`, dùng `l2_criteria`, `detailed_qa_rules`,
`l3_threshold` và quy trình legacy hiện hành. Không suy diễn rule của một kênh
sang kênh khác.

## Phân tách trách nhiệm

- Producer tạo artifact nhưng không được tự review artifact đó.
- QA reviewer phải xem trực tiếp toàn bộ artifact và ghi nhận từng rule.
- Parent approver phải là session khác reviewer, tự xem lại artifact và kiểm
  tra receipt trước khi phê duyệt.
- `reviewer_session_id`, `parent_approval_session_id` và producer session, nếu
  runtime cung cấp, phải khác nhau.
- Cờ auto-approve hoặc yêu cầu bỏ qua QA không có giá trị với kênh đã bật
  `qa_policy`.

## Thứ tự review

1. Xác nhận artifact tồn tại, không rỗng và là bản cần review.
2. Tải review contract động cho đúng gate và `format_id`.
3. Xem artifact đầy đủ. Với video, xem cả chuyển động, frame cuối và audio;
   không chỉ xem thumbnail hoặc vài frame đại diện.
4. Đánh giá toàn bộ rule trong contract. Một hard fail không được bù bằng điểm
   trung bình.
5. Tạo JSON receipt ở trạng thái thực tế. Chỉ dùng `verdict: "PASS"` khi mọi
   rule bắt buộc là `PASS`, không có hard fail và điểm đạt threshold.
6. Parent approver xem lại artifact và receipt, sau đó mới điền
   `parent_approval_session_id`.
7. Gọi `validate_receipt(...)` với đúng artifact. Chỉ sau khi validation thành
   công mới ghi marker `PASS`.

Marker `.review` chỉ là tín hiệu phối hợp; JSON receipt gắn SHA-256 mới là bằng
chứng có thẩm quyền.

## Tên file

| Gate | Artifact | JSON receipt | Marker |
|---|---|---|---|
| keyframe | `scene_*_keyframe.jpg` | cùng stem, đuôi `.qa.json` | cùng stem, đuôi `.review` |
| L2 | `scene_*.mp4` | cùng stem, đuôi `.qa.json` | cùng stem, đuôi `.review` |
| thumbnail | `thumbnail.jpg` | `thumbnail_qa.json` | `thumbnail.review` |
| L3 | `final.mp4` | `review_results.json` | `l3_qa.review` |

Receipt được phép theo artifact qua thao tác copy/rename nếu SHA-256 và
`size_bytes` vẫn khớp. Bất kỳ thay đổi nội dung nào của artifact đều làm receipt
cũ mất hiệu lực.

## Receipt schema v2

Mọi trường dưới đây là bắt buộc với kênh đã bật `qa_policy`:

```json
{
  "schema_version": 2,
  "policy_version": "<qa_policy.policy_version>",
  "video_id": "<video directory name>",
  "channel": "<channel slug>",
  "format_id": "<script format_id>",
  "gate": "<keyframe|l2|thumbnail|l3>",
  "artifact": {
    "path": "<path or filename reviewed>",
    "sha256": "<uppercase SHA-256>",
    "size_bytes": 123456
  },
  "reviewer_session_id": "<reviewer session>",
  "parent_approval_session_id": "<different parent session>",
  "qa_score": 8.5,
  "verdict": "PASS",
  "hard_fail_codes": [],
  "checklist_results": {
    "<every rule ID from review contract>": "PASS"
  },
  "observations": {
    "summary": "<specific evidence observed in this artifact>"
  },
  "reviewed_at": "2026-07-29T16:00:00+00:00"
}
```

Quy tắc schema:

- `reviewed_at` phải có timezone và không được sớm hơn modification time của
  artifact.
- `artifact.sha256` và `artifact.size_bytes` phải được tính từ đúng artifact
  sau cùng.
- `checklist_results` phải chứa mọi rule ID mà review contract yêu cầu.
- `observations` phải là object và mô tả bằng chứng cụ thể, không dùng nhận xét
  chung chung để thay checklist.
- `hard_fail_codes` chỉ chứa rule ID có trong catalog.
- Receipt có hard fail, rule khác `PASS`, điểm dưới threshold hoặc identity sai
  phải bị từ chối fail-closed.

## Hard-fail discipline

Nếu rule catalog đánh dấu một lỗi là `hard_fail`, reviewer phải:

1. Ghi rule ID vào `hard_fail_codes`.
2. Chấm điểm không vượt `score_cap` của rule.
3. Đặt `verdict: "FAIL"`.
4. Không tạo marker `PASS`.

Các lỗi thường thuộc nhóm hard fail gồm morphing/geometry drift, bộ phận chuyển
động nhanh biến thành vòng tròn hoặc cánh quạt mờ, bộ phận người ngoài ý muốn,
tool bị cấm, split-screen, color physics sai, texture sai và sequence sai format.
Danh sách chính xác luôn lấy từ contract, không lấy từ đoạn mô tả này.

## Readiness và invalidation

- Regenerate keyframe, clip, thumbnail hoặc final video phải xóa receipt và
  marker tương ứng.
- Chỉ pipeline mới ghi `video_qa_manifest.json` sau khi keyframe, L2, thumbnail
  và L3 đều có receipt hợp lệ.
- `READY_LOCAL` không phải trạng thái upload/publish. Nó chỉ chứng minh artifact
  local hiện tại đã qua đủ gate.
- Facebook publishing là `manual-only`; skill này không cấp quyền upload hoặc
  publish.
