import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the root route renders the Distribution Hub application", async () => {
  const [page, layout, client, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/distribution-hub.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Distribution Hub — Công việc đăng bài/);
  assert.match(layout, /<html lang="vi">/);
  assert.match(page, /<DistributionHub \/>/);
  assert.match(client, /Công việc đăng bài/i);
  assert.match(client, /Operations Workbench|workbench-detail/i);
  assert.match(client, /Việc của tôi/i);
  assert.match(client, /Chọn một bài để bắt đầu/i);
  assert.match(client, /Đang kết nối/i);
  assert.match(client, /Nhận xử lý nền tảng này/i);
  assert.doesNotMatch(client, /className="drawer".*Chi tiết công việc/s);
  assert.match(styles, /grid-template-columns:\s*220px/);
  assert.match(styles, /\.workbench-detail/);
  assert.match(styles, /\.queue-skeleton/);
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /@media \(max-width: 920px\)/);
  assert.doesNotMatch(client, /Your site is taking shape|Building your site/i);
});

test("manual state changes are exact, versioned, and idempotent", async () => {
  const [actionsRoute, control, client] = await Promise.all([
    readFile(new URL("../app/api/actions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/control.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/distribution-hub.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(actionsRoute, /jobId/);
  assert.match(actionsRoute, /expectedVersion/);
  assert.match(actionsRoute, /idempotencyKey/);
  assert.match(control, /UNIQUE\(job_id, sequence\)/);
  assert.match(control, /Concurrent update detected/);
  assert.match(control, /action_requests/);
  assert.match(control, /request_fingerprint/);
  assert.match(control, /already bound to another action request/);
  assert.match(control, /\["CLAIMED", "SCHEDULED"\]\.includes\(current\.state\)/);
  assert.match(control, /valid HTTPS URL/);
  assert.match(client, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(actionsRoute, /bulk|channelId|contentIds/i);
});

test("team access is dynamic and enforced by channel on the server", async () => {
  const [teamRoute, teamStore, control, client] = await Promise.all([
    readFile(new URL("../app/api/team/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/team.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/control.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/team-panel.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(teamRoute, /resolveMembership/);
  assert.match(teamStore, /channel_assignments/);
  assert.match(teamStore, /Only an admin can manage team assignments/);
  assert.match(teamStore, /DISTRIBUTION_ADMIN_EMAILS/);
  assert.match(teamStore, /split\(","\)/);
  assert.match(control, /not assigned to channel/);
  assert.match(control, /Viewer accounts cannot change upload state/);
  assert.match(client, /Phân quyền được lưu trong hệ thống/);
  assert.doesNotMatch(teamStore, /bk\.operator|mt\.operator|su\.operator/i);
});

test("Cloudflare Access and OpenAI Sites identities are isolated by provider", async () => {
  const [auth, pageAuth, cloudflareConfig] = await Promise.all([
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/chatgpt-auth.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../wrangler.cloudflare.jsonc", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(auth, /DISTRIBUTION_AUTH_PROVIDER/);
  assert.match(auth, /cf-access-authenticated-user-email/);
  assert.match(auth, /cf-access-jwt-assertion/);
  assert.match(auth, /jwtVerify/);
  assert.match(auth, /audience/);
  assert.match(auth, /issuer/);
  assert.match(auth, /tokenEmail !== headerEmail/);
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(auth, /provider === "cloudflare-access"/);
  assert.match(pageAuth, /\/cdn-cgi\/access\/login/);
  assert.match(cloudflareConfig, /"DISTRIBUTION_AUTH_PROVIDER": "cloudflare-access"/);
  assert.match(cloudflareConfig, /"preview_urls": false/);
  assert.match(cloudflareConfig, /"CF_ACCESS_AUD"/);
  assert.match(cloudflareConfig, /"CF_ACCESS_JWKS_URL"/);
  assert.doesNotMatch(cloudflareConfig, /REPLACE_WITH_D1_DATABASE_ID/);
});

test("production content enters D1 directly without a Notion runtime bridge", async () => {
  const [route, ingest, bridge, control, readme] = await Promise.all([
    readFile(new URL("../app/api/ingest/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/ingest.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../scripts/sync_workspace_content.py", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/control.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(route, /requestIngestPrincipal/);
  assert.match(route, /512 \* 1024/);
  assert.match(route, /Idempotency-Key header is required/);
  assert.match(route, /Idempotency-Key header must match/);
  assert.match(route, /dedicated Cloudflare Access service token/);
  assert.match(ingest, /schemaVersion must be 1/);
  assert.match(ingest, /production-pipeline/);
  assert.match(ingest, /cannot exceed 100 items/);
  assert.match(ingest, /contentType must be photo for ingest schema v1/);
  assert.match(ingest, /active job history/);
  assert.match(ingest, /active legacy job history/);
  assert.match(ingest, /existing\.drive_file_id !== item\.driveFileId/);
  assert.match(ingest, /existing\.asset_hash !== item\.assetHash/);
  assert.match(
    ingest,
    /existing\.distribution_revision !== item\.distributionRevision/,
  );
  assert.match(ingest, /targetsPreserved/);
  assert.match(ingest, /content_ingest_records/);
  assert.match(ingest, /ingest_batches/);
  assert.doesNotMatch(ingest, /notion|Buffer Status/i);
  assert.doesNotMatch(bridge, /import\s+notion_sync|from\s+notion_sync/i);
  assert.doesNotMatch(control, /seedContent|demo-photo|demo-video/i);
  assert.match(readme, /does not read[\s\S]*write to it[\s\S]*mirror statuses/i);
  assert.match(readme, /only operational source of truth/i);
});

test("ingest service identities are signed and explicitly allowlisted", async () => {
  const auth = await readFile(
    new URL("../lib/auth.ts", import.meta.url),
    "utf8",
  );

  assert.match(auth, /payload\.common_name/);
  assert.match(auth, /DISTRIBUTION_INGEST_SERVICE_IDS/);
  assert.match(auth, /configuredIngestServiceIds\(\)\.has/);
  assert.match(auth, /service:\$\{principal\.serviceTokenId\}/);
  assert.match(auth, /jwtVerify/);
});

test("Meta receipts are atomic and analytics mapping stays independent", async () => {
  const [control, receipts, mappingRoute, aliasRoute, client, migration] =
    await Promise.all([
      readFile(new URL("../db/control.ts", import.meta.url), "utf8"),
      readFile(new URL("../db/receipts.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/mapping-review/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/aliases/ingest/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/distribution-hub.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../drizzle/0004_peaceful_magik.sql", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(receipts, /business\.facebook\.com/);
  assert.match(receipts, /searchParams\.get\("content_id"\)/);
  assert.match(receipts, /Only an admin can link analytics IDs/);
  assert.match(receipts, /FACEBOOK_GRAPH_REEL/);
  assert.match(receipts, /INSTAGRAM_MEDIA/);
  assert.match(control, /\.\.\.receiptStatements/);
  assert.match(control, /publication_receipt_events/);
  assert.match(control, /analyticsLinkStatus:.*"PENDING"/s);
  assert.match(mappingRoute, /resolveMembership/);
  assert.match(mappingRoute, /linkPublicationAlias/);
  assert.match(aliasRoute, /requestIngestPrincipal/);
  assert.match(aliasRoute, /dedicated Cloudflare Access service token/);
  assert.match(aliasRoute, /Idempotency-Key header must match/);
  assert.match(receipts, /publication_alias_ingest_batches/);
  assert.match(receipts, /facebook-analytics/);
  assert.match(receipts, /NO_RECEIPT/);
  assert.match(receipts, /hasRetryableSkips/);
  assert.match(receipts, /if \(!hasRetryableSkips\)/);
  assert.match(receipts, /publication_receipt_action_requests/);
  assert.match(receipts, /request_fingerprint/);
  assert.match(receipts, /already bound to another mapping request/);
  assert.doesNotMatch(receipts, /INSERT OR IGNORE INTO publication_aliases/);
  assert.match(client, /Link Meta Business Suite/);
  assert.match(client, /content_id/);
  assert.match(client, /Mapping Meta/);
  assert.match(migration, /publication_receipts/);
  assert.match(migration, /publication_aliases/);
  assert.match(migration, /Meta — Facebook \+ Instagram/);
  assert.doesNotMatch(control, /notion|Buffer Status/i);
});
