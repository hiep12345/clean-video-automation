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

Open the generated artifact and a real-world reference separately.

```text
MORPHOLOGY EVIDENCE RECEIPT
artifact_opened: true | false
artifact_path: <local artifact>
reference_opened: true | false
reference_tool: read_url_content | view_file | unavailable
reference_source_url: <authoritative visual source or none>
reference_identity: <scientific/common name and identifying traits>
traits_compared: <visible traits compared one by one>
verdict: MATCH | NEEDS FIX | UNVERIFIED
```

If `reference_opened` is not true, morphology is `UNVERIFIED`. Do not infer a
reference comparison from the generated artifact alone.

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
