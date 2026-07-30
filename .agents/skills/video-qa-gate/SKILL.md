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
3. Đối chiếu `review_requirements` với năng lực tool đang có trong session và
   chọn phương pháp review theo mục “Chọn công cụ theo năng lực” bên dưới.
4. Xem artifact đủ modality và timeline mà contract yêu cầu. Với video L2/L3,
   phải đánh giá chuyển động trên toàn timeline; L3 phải đánh giá cả audio.
   Không được suy diễn toàn bộ video từ thumbnail hoặc vài frame đại diện.
5. Đánh giá toàn bộ rule trong contract. Một hard fail không được bù bằng điểm
   trung bình.
6. Tạo JSON receipt ở trạng thái thực tế. Chỉ dùng `verdict: "PASS"` khi mọi
   rule bắt buộc là `PASS`, không có hard fail và điểm đạt threshold.
7. Parent approver xem lại artifact và receipt, sau đó mới điền
   `parent_approval_session_id`.
8. Gọi `validate_receipt(...)` với đúng artifact. Chỉ sau khi validation thành
   công mới ghi marker `PASS`.

Marker `.review` chỉ là tín hiệu phối hợp; JSON receipt gắn SHA-256 mới là bằng
chứng có thẩm quyền.

## Chọn công cụ theo năng lực

Review method phải được chọn ở runtime theo năng lực thực tế của model/session,
không theo danh sách tên tool hard-code:

1. Đọc `review_requirements.required_modalities` và
   `review_requirements.require_full_timeline` từ contract.
2. Kiểm tra các tool hiện có và ưu tiên tool cho phép model xem/nghe trực tiếp
   artifact gốc (`artifact_access: "native"`), đặc biệt khi tool hỗ trợ temporal
   reasoning trên toàn video.
3. Có thể phối hợp nhiều tool để đủ visual, temporal và audio. Receipt phải ghi
   đúng tool nào cung cấp modality nào; không được khai modality chưa review.
4. Chỉ tạo frame, contact sheet, waveform, transcript hoặc artifact dẫn xuất
   (`artifact_access: "derived"`) khi session không có năng lực native cần
   thiết hoặc tool native lỗi sau khi đã thử hợp lý.
5. Khi phải fallback, cách lấy bằng chứng phải thích ứng với duration, shot
   boundary, motion và rule cần kiểm tra. Không cấu hình cố định FPS, số frame
   hay timestamp theo channel/video.
6. Derived evidence không tự chứng minh full temporal coverage. Nếu contract
   yêu cầu toàn timeline, chuỗi tool được ghi trong receipt vẫn phải cung cấp
   modality `temporal` với `timeline_coverage: "full"`; nếu không, gate phải
   fail-closed.
7. Mọi fallback phải ghi `fallback_reason` và `limitations` cụ thể để parent
   approver biết phần nào có thể chưa quan sát trực tiếp.

Tên tool trong receipt là bằng chứng thực thi, không phải cấu hình routing.
Policy và skill không được rẽ nhánh theo tên model, channel slug, video ID hay
một case cụ thể.

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

## Receipt schema v3

Mọi trường dưới đây là bắt buộc với kênh đã bật `qa_policy`:

```json
{
  "schema_version": 3,
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
  "review_execution": {
    "selection_strategy": "capability_driven",
    "tools": [
      {
        "tool": "<runtime tool identifier>",
        "method": "<native media, browser playback, or adaptive fallback>",
        "artifact_access": "native",
        "modalities": ["visual", "temporal", "audio"],
        "timeline_coverage": "full"
      }
    ],
    "fallback_reason": null,
    "limitations": []
  },
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
- `review_execution.selection_strategy` phải là `capability_driven`.
- Hợp các `modalities` trong `review_execution.tools` phải bao phủ mọi modality
  contract yêu cầu. Gate yêu cầu full timeline phải có temporal tool ghi
  `timeline_coverage: "full"`.
- Tool đọc artifact dẫn xuất phải dùng `artifact_access: "derived"` và receipt
  phải có `fallback_reason` cùng ít nhất một `limitations`. Không được ghi
  `native` cho contact sheet, frame trích xuất, waveform hoặc transcript.
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
