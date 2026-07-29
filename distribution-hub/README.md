# Distribution Hub

Distribution Hub is the manual publishing control plane for the content
production system. It gives team members a Notion-like queue while keeping
operational state behind exact, versioned API actions.

The application does **not** publish to Facebook, Instagram, YouTube, or Amazon.
Team members publish manually and then record the receipt URL in Distribution
Hub. Notion can remain a read-only reporting surface, but it is no longer the
source of truth for Buffer Status.

## Safety model

- Every platform target is an independent distribution job.
- Team members and channel assignments are stored dynamically in D1.
- Operators see and change only their assigned channels.
- Admins manage members and assignments from the Team panel.
- A team member must claim a job before scheduling or confirming upload.
- Every mutation includes an expected version and idempotency key.
- State changes are stored as immutable events.
- A content-level Buffer Status is derived from platform job states.

## Local development

```bash
npm install
npm run dev
```

The local Cloudflare D1 database is initialized with demo data on first access.
Production requires `DISTRIBUTION_ADMIN_EMAIL` as the immutable owner/admin
bootstrap identity. Additional members are provisioned through the Team panel;
their emails and channel assignments are never hard-coded in source.
