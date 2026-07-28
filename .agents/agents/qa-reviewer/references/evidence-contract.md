# QA evidence contract

This contract exists because a plausible citation can still point to the wrong
paper, species or experimental condition. A PASS must be reproducible from
opened sources, not from search snippets or model memory.

## Fail-closed sequence

For every externally checkable claim:

1. Copy the exact claim into the report without strengthening it.
2. Use `search_web` only to discover candidate sources.
3. Open the chosen primary paper or authoritative page with
   `read_url_content`.
4. Check the resolved title, authors, study subject, environment, exposure
   mode, duration, temperature and measured outcome.
5. Compare those conditions with the exact claim.
6. Emit a source receipt using the fields below.

If step 3 or 4 cannot be completed, stop calling the claim verified. Mark it
`Unverified` and fail the gate.

## Source receipt

Use one receipt per claim. Do not omit a field; use `not reported` when the
source does not state it.

```text
CLAIM EVIDENCE RECEIPT
claim_id: <stable identifier>
exact_claim: <verbatim claim under review>
verdict: Supported | Needs qualifier | Unsupported | Unverified
source_opened: true | false
source_tool: read_url_content | unavailable
source_type: primary | authoritative | secondary | none
source_title: <resolved title>
source_authors: <resolved authors>
source_url: <opened canonical URL>
source_doi: <resolved DOI or none>
study_subject: <species/population/material>
study_environment: <aquatic/air/in vitro/etc.>
exposure_conditions: <oxygen, duration, temperature and other boundaries>
supports: <what the opened source directly supports>
does_not_support: <nearby interpretations the source does not establish>
citation_identity: MATCH | INVALID | UNVERIFIED
```

`source_opened: true` is allowed only after an actual `read_url_content` call
for `source_url`. A DOI copied from a search result does not qualify.

## Verdict rules

- `Supported`: the opened source directly supports the exact wording and the
  relevant subject and conditions match.
- `Needs qualifier`: the opened source supports the core statement for the
  same subject and exposure mode, but the claim omits a material boundary.
- `Unsupported`: the source concerns a different subject, environment,
  exposure mode or outcome, or directly conflicts with the exact claim.
- `Unverified`: the source could not be opened or its identity/conditions
  could not be checked.

An aquatic hypoxia or anoxia experiment does not support an aerial-emersion
duration claim. That is a different exposure mode, so the exact aerial claim
is `Unsupported` unless a source studying aerial emersion is opened.

## Morphology receipt

Open the generated artifact and every local schema-v2 reference separately.
`read_url_content` can verify a source page or scientific claim, but it is not
visual evidence and cannot satisfy this receipt.

```text
MORPHOLOGY EVIDENCE RECEIPT
artifact_opened: true | false
artifact_tool: view_file | unavailable
artifact_path: <local artifact>
artifact_sha256: <exact generated artifact hash>
reference_checks:
  - reference_file: <exact local file from reference_pack.json>
    reference_sha256: <exact local reference hash>
    reference_opened: true | false
    reference_tool: view_file | unavailable
    reference_source_url: <source page or direct asset URL from the pack>
    scientific_name: <identity from the pack>
    depicted_view: <view from the pack>
    traits_compared:
      - trait: <exact visual_trait from the pack>
        artifact_observation: <specific visible observation>
        reference_observation: <specific visible observation>
        verdict: MATCH | NEEDS FIX
verdict: MATCH | NEEDS FIX | UNVERIFIED
```

Every declared trait must have two specific observations and `MATCH`. The file
names and hashes must match the current generation/reference pack. Boolean
claims without this structure are invalid.

## Runtime provenance receipt

Photo QA is valid only when the final receipt is created by
`photo_post_review.py`. The receipt must contain:

```text
RUNTIME QA PROVENANCE
qa_task_id: <tracker task assigned to qa-reviewer>
reviewer_role: qa-reviewer
reviewer_trajectory_id: <current ANTIGRAVITY_TRAJECTORY_ID>
production_task_id: <exact completed production dependency>
producer_trajectory_id: <trajectory from generation receipt>
generation_receipt_sha256: <reviewed generation receipt hash>
```

The QA task and production task must differ. Their trajectories must differ,
and a trajectory cannot be reused for another artifact task. The production
receipt hash must already be bound to the production task. After QA, the
review receipt hash is bound to the QA task before that task is completed.
Missing or conflicting tracker evidence is `BLOCK`, even when the JSON schema,
score, and asset hashes look valid.

For `photo_post_review.py`, place the claim receipts, morphology receipt,
confirmations, and exact visual/text observations in the supplied evidence
JSON. Do not replace structured claim receipts with a list of URLs.

The reviewer does not provide a numeric score. Schema-v5 computes it from fixed
weights and stores `score_mode: machine-computed-v1`. A critical failed check
caps the computed result at 5.9. A valid QA receipt grants `QA_REVIEWED` only
and keeps `drive_buffer_eligible: false`.

## Parent acceptance receipt

After QA completes, the coordinator opens the exact artifact and, for biology,
every exact local reference. It then supplies a separate evidence JSON to:

```text
python content-planner-kb/scripts/photo_post_accept.py \
  --channel <channel> --id <post-id> --decision ACCEPT \
  --evidence-file <parent-evidence.json> --json
```

The parent evidence JSON uses this shape:

```text
artifact_opened: true
artifact_tool: view_file
artifact_path: <exact generated filename>
critical_defects: 0
findings:
  - <specific artifact finding>
reference_checks:
  - reference_file: <exact schema-v2 local file>
    opened: true
    tool: view_file
    sha256: <exact local hash>
    verdict: MATCH
    observation: <specific overall observation>
    trait_findings:
      - trait: <exact visual_trait>
        observation: <independent specific observation>
        verdict: MATCH
```

The coordinator trajectory must differ from production and QA. The evidence
must use `view_file`, contain exact artifact/reference hashes, zero critical
defects, specific findings, and an independent `trait_findings` entry with a
specific observation and `MATCH` for every reference `visual_trait`.
Only this second key can set effective `drive_buffer_eligible: true` and move
the lifecycle from `QA_REVIEWED` to `READY`.

## Report gate

End every report with:

```text
QA GATE RECEIPT
artifact_revision: <hash or exact version>
claim_receipts_complete: true | false
morphology_receipt_complete: true | false | not_applicable
critical_defects: <count>
unsupported_claims: <count>
unverified_claims: <count>
gate_verdict: PASS | NEEDS FIX | BLOCK
drive_buffer_eligible: true | false
```

`drive_buffer_eligible` is true only when all required receipts are complete,
there are no critical defects, and both unsupported and unverified counts are
zero.
