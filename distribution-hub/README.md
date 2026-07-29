# Distribution Hub

Distribution Hub is the manual publishing control plane for the content
production system. It gives team members a Notion-like queue while keeping
operational state behind exact, versioned API actions.

Production: <https://hub.growthu.space/>

The application does **not** publish to Facebook, Instagram, YouTube, or Amazon.
Team members publish manually and then record the receipt URL in Distribution
Hub. Notion is a frozen legacy reference only: Distribution Hub does not read
from it, write to it, mirror statuses to it, or use it to derive runtime state.

## Runtime architecture

```text
channel.db + QA receipt + Google Drive artifact
                      |
                      v
         POST /api/ingest (service identity)
                      |
                      v
             Cloudflare D1
       content metadata + immutable events
                      |
                      v
         Distribution Hub team interface
                      |
                      v
       manual platform upload + receipt URL
```

Cloudflare D1 is the only operational source of truth after ingestion. Content
metadata may be refreshed by the production pipeline, but claim, schedule,
blocked, uploaded, assignee, and receipt states can change only through exact
Distribution Hub actions. An ingest cannot overwrite those states.

### Meta receipt and analytics identity

Facebook and Instagram remain one operational target (`fb-ig`) because the team
publishes both destinations together in Meta Business Suite. When a member
confirms a Meta upload, they paste the Business Suite Insights URL containing
`content_id`.

The Hub stores three identity namespaces without exposing that complexity to the
member workflow:

- `META_BUSINESS_CONTENT`: the shared Business Suite receipt ID reported by the
  member.
- `FACEBOOK_GRAPH_REEL`: the Facebook Graph object ID used by Facebook
  analytics.
- `INSTAGRAM_MEDIA`: the Instagram media ID used by Instagram analytics.

Publication state and analytics-link state are independent. A member receipt
marks the operational job uploaded while analytics remains `PENDING` until an
admin or a trusted resolver links provider IDs. Missing analytics mappings never
change an uploaded job to `BLOCKED`.

`POST /api/aliases/ingest` accepts idempotent Facebook Graph mappings from the
same allowlisted Cloudflare Access service identity used by production ingest.
The resolver client belongs to the external production pipeline repository and
is dry-run by default. This repository owns the receiving API contract, not the
pipeline implementation.

Rows without a Hub job or without a member receipt are reported as `NO_JOB` or
`NO_RECEIPT`; they are never guessed or attached by title.

Before its first network attempt, the production client stores each batch in a
local SQLite outbox. A timeout or Hub outage leaves the batch `PENDING`; retries
reuse the same idempotency key. `daily_cleanup.py --with-external-sync` retries
that outbox and never falls back to Notion.

## Safety model

- Every platform target is an independent distribution job.
- Team members and channel assignments are stored dynamically in D1.
- Operators see and change only their assigned channels.
- Admins manage members and assignments from the Team panel.
- A team member must claim a job before scheduling or confirming upload.
- Every mutation includes an expected version and idempotency key.
- An idempotency key is permanently bound to the exact actor, action, version,
  and payload that first used it.
- State changes are stored as immutable events.
- A content-level Buffer Status is derived from platform job states.
- A new Drive artifact revision is rejected while any existing target is not
  `READY`; this prevents production refreshes from replacing in-flight work.
- Targets removed by a later ingest are preserved for audit and manual review.

## Local development

```bash
npm install
npm run dev
```

Schema creation never inserts demo content. Production accepts a
comma-separated `DISTRIBUTION_ADMIN_EMAILS` allowlist for immutable bootstrap
administrators. The legacy single-value `DISTRIBUTION_ADMIN_EMAIL` remains
supported. Additional members are provisioned through the Team panel; their
emails and channel assignments are never hard-coded in source.

## Repository boundary

This is a standalone application repository. It owns:

- the web interface and authenticated API routes;
- the Cloudflare Worker and custom-domain configuration;
- D1 schema, migrations, and operational state transitions;
- tests for access control, idempotency, receipts, and UI contracts.

Content creation, Google Drive delivery, analytics collection, and retry
outboxes belong to external production systems. Those systems integrate only
through the versioned `/api/ingest` and `/api/aliases/ingest` contracts. The Hub
does not import files or Python modules from another repository.

## Direct production ingest

`POST /api/ingest` accepts schema version `1` photo content from the exact
source system `production-pipeline`. A batch contains at most 100 items and
uses an `Idempotency-Key` header matching `payload.idempotencyKey`. Each item
must carry:

- an exact content ID and channel;
- a Google Drive URL and Drive file ID;
- the asset hash, distribution revision, and QA receipt hash;
- source revision and source update time;
- QA score on the 0–10 scale;
- one or more explicit platform targets.

In Cloudflare production this endpoint accepts only a signed Cloudflare Access
service identity whose Client ID appears in the comma-separated
`DISTRIBUTION_INGEST_SERVICE_IDS` Worker variable. A browser/user identity
cannot call it.

External clients must keep service-token secrets only in their execution
environment, send stable idempotency keys, and retain failed batches in their
own retry outbox. Never put credentials, client outboxes, or production
databases in this repository.

## Cloudflare Free deployment

The same build can run directly on Cloudflare Workers with D1. The tracked
`wrangler.cloudflare.jsonc` keeps the Cloudflare deployment separate from the
existing OpenAI Sites project.

1. Authenticate Wrangler and create the D1 database named `distribution-hub`.
2. Bind the D1 database in `wrangler.cloudflare.jsonc`.
3. Store `DISTRIBUTION_ADMIN_EMAILS` as a Worker secret or runtime value.
4. Create an Access service token, add a Service Auth policy for that exact
   token, and set its Client ID in `DISTRIBUTION_INGEST_SERVICE_IDS`.
5. Run `npm run cf:migrate`, then `npm run cf:deploy`.
6. Protect the resulting `workers.dev` hostname with a Cloudflare Access
   self-hosted application and an email one-time PIN allow policy.

When `DISTRIBUTION_AUTH_PROVIDER` is `cloudflare-access`, the application
validates the Access JWT signature, audience, issuer, expiry, and signed email
before accepting the identity header. The OpenAI Sites deployment continues to
trust only its own authenticated-user header.
