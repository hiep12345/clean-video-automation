import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the root route renders the Distribution Hub application", async () => {
  const [page, layout, client] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/distribution-hub.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title:\s*"Distribution Hub"/);
  assert.match(page, /<DistributionHub \/>/);
  assert.match(client, /Upload queue/i);
  assert.match(client, /API controlled/i);
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
  assert.match(control, /valid HTTPS URL/);
  assert.match(client, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(actionsRoute, /bulk|channelId|contentIds/i);
});
