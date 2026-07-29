import { env } from "cloudflare:workers";
import { ActionError } from "@/lib/errors";
import type {
  MappingReviewItem,
  MemberContext,
  PublicationAlias,
  PublicationAliasNamespace,
  PublicationReceipt,
} from "@/lib/types";

export const receiptSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS publication_receipts (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES distribution_jobs(id),
    provider TEXT NOT NULL CHECK(provider IN ('META')),
    meta_content_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    publication_status TEXT NOT NULL CHECK(publication_status IN ('REPORTED', 'VERIFIED')),
    analytics_link_status TEXT NOT NULL CHECK(analytics_link_status IN ('PENDING', 'PARTIAL', 'LINKED', 'AMBIGUOUS', 'FAILED')),
    reported_by TEXT NOT NULL,
    reported_at TEXT NOT NULL,
    verified_at TEXT,
    verification_error TEXT,
    UNIQUE(job_id),
    UNIQUE(provider, meta_content_id)
  )`,
  `CREATE TABLE IF NOT EXISTS publication_aliases (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL REFERENCES publication_receipts(id),
    namespace TEXT NOT NULL CHECK(namespace IN ('META_BUSINESS_CONTENT', 'FACEBOOK_GRAPH_REEL', 'INSTAGRAM_MEDIA')),
    external_id TEXT NOT NULL,
    permalink TEXT,
    source TEXT NOT NULL,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(namespace, external_id),
    UNIQUE(receipt_id, namespace)
  )`,
  `CREATE TABLE IF NOT EXISTS publication_receipt_events (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL REFERENCES publication_receipts(id),
    event_type TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    namespace TEXT,
    external_id TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS publication_receipts_status_idx
    ON publication_receipts(analytics_link_status, reported_at DESC)`,
  `CREATE TABLE IF NOT EXISTS publication_alias_ingest_batches (
    idempotency_key TEXT PRIMARY KEY,
    source_system TEXT NOT NULL,
    actor TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    item_count INTEGER NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS publication_receipt_action_requests (
    idempotency_key TEXT PRIMARY KEY,
    request_fingerprint TEXT NOT NULL,
    receipt_id TEXT NOT NULL REFERENCES publication_receipts(id),
    created_at TEXT NOT NULL
  )`,
];

type ReceiptRow = {
  id: string;
  provider: "META";
  meta_content_id: string;
  source_url: string;
  publication_status: "REPORTED" | "VERIFIED";
  analytics_link_status:
    | "PENDING"
    | "PARTIAL"
    | "LINKED"
    | "AMBIGUOUS"
    | "FAILED";
  reported_by: string;
  reported_at: string;
  verified_at: string | null;
  verification_error: string | null;
};

type AliasRow = {
  namespace: PublicationAliasNamespace;
  external_id: string;
  permalink: string | null;
  source: string;
  verified_at: string | null;
};

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

function httpsUrl(value: string | undefined, field: string): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:") throw new Error("not https");
    return parsed.toString();
  } catch {
    throw new ActionError(400, `${field} must be a valid HTTPS URL`);
  }
}

export function parseMetaBusinessReceiptUrl(value: string | undefined): {
  sourceUrl: string;
  metaContentId: string;
} {
  if (!value?.trim()) {
    throw new ActionError(400, "A Meta Business Suite URL is required");
  }
  try {
    const parsed = new URL(value.trim());
    const allowedHosts = new Set([
      "business.facebook.com",
      "www.business.facebook.com",
    ]);
    const metaContentId = parsed.searchParams.get("content_id")?.trim() ?? "";
    if (
      parsed.protocol !== "https:" ||
      !allowedHosts.has(parsed.hostname.toLowerCase()) ||
      !/^\d{6,30}$/.test(metaContentId)
    ) {
      throw new Error("invalid Meta receipt");
    }
    return {
      sourceUrl: parsed.toString(),
      metaContentId,
    };
  } catch {
    throw new ActionError(
      400,
      "Use the Meta Business Suite Insights URL containing a numeric content_id",
    );
  }
}

async function aliasesForReceipt(receiptId: string): Promise<PublicationAlias[]> {
  const result = await database()
    .prepare(
      `SELECT namespace, external_id, permalink, source, verified_at
       FROM publication_aliases
       WHERE receipt_id = ?
       ORDER BY namespace`,
    )
    .bind(receiptId)
    .all<AliasRow>();
  return result.results.map((row) => ({
    namespace: row.namespace,
    externalId: row.external_id,
    permalink: row.permalink,
    source: row.source,
    verifiedAt: row.verified_at,
  }));
}

async function mapReceipt(row: ReceiptRow): Promise<PublicationReceipt> {
  return {
    id: row.id,
    provider: row.provider,
    metaContentId: row.meta_content_id,
    sourceUrl: row.source_url,
    publicationStatus: row.publication_status,
    analyticsLinkStatus: row.analytics_link_status,
    reportedBy: row.reported_by,
    reportedAt: row.reported_at,
    verifiedAt: row.verified_at,
    verificationError: row.verification_error,
    aliases: await aliasesForReceipt(row.id),
  };
}

export async function publicationReceiptForJob(
  jobId: string,
): Promise<PublicationReceipt | null> {
  const row = await database()
    .prepare(
      `SELECT id, provider, meta_content_id, source_url, publication_status,
              analytics_link_status, reported_by, reported_at, verified_at,
              verification_error
       FROM publication_receipts
       WHERE job_id = ?`,
    )
    .bind(jobId)
    .first<ReceiptRow>();
  return row ? mapReceipt(row) : null;
}

async function publicationReceiptById(
  receiptId: string,
): Promise<PublicationReceipt | null> {
  const row = await database()
    .prepare(
      `SELECT id, provider, meta_content_id, source_url, publication_status,
              analytics_link_status, reported_by, reported_at, verified_at,
              verification_error
       FROM publication_receipts
       WHERE id = ?`,
    )
    .bind(receiptId)
    .first<ReceiptRow>();
  return row ? mapReceipt(row) : null;
}

export async function listMappingReview(
  member: MemberContext,
): Promise<MappingReviewItem[]> {
  if (member.role !== "ADMIN") {
    throw new ActionError(403, "Only an admin can review publication mappings");
  }
  const result = await database()
    .prepare(
      `SELECT
         r.id AS receipt_id,
         j.id AS job_id,
         c.id AS content_id,
         c.title,
         ch.code AS channel_code
       FROM publication_receipts r
       JOIN distribution_jobs j ON j.id = r.job_id
       JOIN content_items c ON c.id = j.content_id
       JOIN channels ch ON ch.id = c.channel_id
       WHERE r.analytics_link_status <> 'LINKED'
       ORDER BY r.reported_at DESC`,
    )
    .all<{
      receipt_id: string;
      job_id: string;
      content_id: string;
      title: string;
      channel_code: string;
    }>();

  return Promise.all(
    result.results.map(async (row) => {
      const receipt = await publicationReceiptById(row.receipt_id);
      if (!receipt) throw new Error("Publication receipt disappeared");
      return {
        receipt,
        jobId: row.job_id,
        contentId: row.content_id,
        title: row.title,
        channelCode: row.channel_code,
      };
    }),
  );
}

export async function linkPublicationAlias(input: {
  member: MemberContext;
  receiptId: string;
  namespace: PublicationAliasNamespace;
  externalId: string;
  permalink?: string;
  idempotencyKey: string;
}): Promise<{ receipt: PublicationReceipt; replayed: boolean }> {
  if (input.member.role !== "ADMIN") {
    throw new ActionError(403, "Only an admin can link analytics IDs");
  }
  if (
    !["FACEBOOK_GRAPH_REEL", "INSTAGRAM_MEDIA"].includes(input.namespace)
  ) {
    throw new ActionError(400, "Unsupported analytics ID namespace");
  }
  const externalId = input.externalId.trim();
  if (!/^\d{6,30}$/.test(externalId)) {
    throw new ActionError(400, "Analytics ID must contain 6-30 digits");
  }
  if (input.idempotencyKey.length < 8) {
    throw new ActionError(400, "idempotencyKey is too short");
  }
  const permalink = httpsUrl(input.permalink, "permalink");
  const db = database();
  const receipt = await publicationReceiptById(input.receiptId);
  if (!receipt) throw new ActionError(404, "Publication receipt not found");

  const fingerprintSource = JSON.stringify({
    actor: input.member.email,
    externalId,
    namespace: input.namespace,
    permalink,
    receiptId: input.receiptId,
  });
  const fingerprintDigest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(fingerprintSource),
  );
  const requestFingerprint = [...new Uint8Array(fingerprintDigest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const replay = await db
    .prepare(
      `SELECT receipt_id, request_fingerprint
       FROM publication_receipt_action_requests
       WHERE idempotency_key = ?`,
    )
    .bind(input.idempotencyKey)
    .first<{ receipt_id: string; request_fingerprint: string }>();
  if (replay) {
    if (
      replay.receipt_id !== input.receiptId ||
      replay.request_fingerprint !== requestFingerprint
    ) {
      throw new ActionError(
        409,
        "Idempotency key is already bound to another mapping request",
      );
    }
    const replayedReceipt = await publicationReceiptById(input.receiptId);
    if (!replayedReceipt) throw new Error("Publication receipt disappeared");
    return { receipt: replayedReceipt, replayed: true };
  }

  const conflictingAlias = await db
    .prepare(
      `SELECT receipt_id
       FROM publication_aliases
       WHERE namespace = ? AND external_id = ?`,
    )
    .bind(input.namespace, externalId)
    .first<{ receipt_id: string }>();
  if (
    conflictingAlias &&
    conflictingAlias.receipt_id !== input.receiptId
  ) {
    throw new ActionError(409, "Analytics ID is already linked to another post");
  }

  const existingNamespace = receipt.aliases.find(
    (alias) => alias.namespace === input.namespace,
  );
  if (existingNamespace && existingNamespace.externalId !== externalId) {
    throw new ActionError(
      409,
      "This receipt already has a different ID in that namespace",
    );
  }

  const now = new Date().toISOString();
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO publication_aliases(
             id, receipt_id, namespace, external_id, permalink, source,
             verified_at, created_at
           ) VALUES (?, ?, ?, ?, ?, 'MANUAL_REVIEW', ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          input.receiptId,
          input.namespace,
          externalId,
          permalink,
          now,
          now,
        ),
      db
        .prepare(
          `UPDATE publication_receipts
           SET analytics_link_status = CASE
             WHEN EXISTS(
               SELECT 1 FROM publication_aliases
               WHERE receipt_id = ? AND namespace = 'FACEBOOK_GRAPH_REEL'
             ) AND EXISTS(
               SELECT 1 FROM publication_aliases
               WHERE receipt_id = ? AND namespace = 'INSTAGRAM_MEDIA'
             ) THEN 'LINKED'
             ELSE 'PARTIAL'
           END,
           verification_error = NULL
           WHERE id = ?`,
        )
        .bind(input.receiptId, input.receiptId, input.receiptId),
      db
        .prepare(
          `INSERT INTO publication_receipt_events(
             id, receipt_id, event_type, actor_email, namespace, external_id,
             idempotency_key, created_at
           ) VALUES (?, ?, 'ALIAS_LINKED', ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          input.receiptId,
          input.member.email,
          input.namespace,
          externalId,
          input.idempotencyKey,
          now,
        ),
      db
        .prepare(
          `INSERT INTO publication_receipt_action_requests(
             idempotency_key, request_fingerprint, receipt_id, created_at
           ) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          input.idempotencyKey,
          requestFingerprint,
          input.receiptId,
          now,
        ),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      const concurrentReplay = await db
        .prepare(
          `SELECT receipt_id, request_fingerprint
           FROM publication_receipt_action_requests
           WHERE idempotency_key = ?`,
        )
        .bind(input.idempotencyKey)
        .first<{ receipt_id: string; request_fingerprint: string }>();
      if (
        concurrentReplay?.receipt_id === input.receiptId &&
        concurrentReplay.request_fingerprint === requestFingerprint
      ) {
        const replayedReceipt = await publicationReceiptById(input.receiptId);
        if (!replayedReceipt) throw new Error("Publication receipt disappeared");
        return { receipt: replayedReceipt, replayed: true };
      }
      throw new ActionError(409, "Analytics mapping changed; reload and retry");
    }
    throw error;
  }

  const updated = await publicationReceiptById(input.receiptId);
  if (!updated) throw new Error("Publication receipt disappeared");
  return { receipt: updated, replayed: false };
}

type AnalyticsAliasItem = {
  contentId: string;
  facebookGraphId: string;
  permalink?: string;
};

type AnalyticsAliasPayload = {
  schemaVersion: 1;
  sourceSystem: "facebook-analytics";
  idempotencyKey: string;
  items: AnalyticsAliasItem[];
};

type AliasIngestResult = {
  contentId: string;
  status: "LINKED" | "UNCHANGED" | "NO_JOB" | "NO_RECEIPT" | "CONFLICT";
  receiptId?: string;
};

function normalizeAliasIngestPayload(value: unknown): AnalyticsAliasPayload {
  if (!value || typeof value !== "object") {
    throw new ActionError(400, "Analytics alias payload must be an object");
  }
  const payload = value as Partial<AnalyticsAliasPayload>;
  if (payload.schemaVersion !== 1) {
    throw new ActionError(400, "schemaVersion must be 1");
  }
  if (payload.sourceSystem !== "facebook-analytics") {
    throw new ActionError(400, "sourceSystem must be facebook-analytics");
  }
  if (
    typeof payload.idempotencyKey !== "string" ||
    payload.idempotencyKey.trim().length < 8
  ) {
    throw new ActionError(400, "idempotencyKey is required");
  }
  if (
    !Array.isArray(payload.items) ||
    payload.items.length < 1 ||
    payload.items.length > 100
  ) {
    throw new ActionError(400, "items must contain 1-100 mappings");
  }

  const seen = new Set<string>();
  const items = payload.items.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new ActionError(400, `items[${index}] must be an object`);
    }
    const item = raw as Partial<AnalyticsAliasItem>;
    const contentId =
      typeof item.contentId === "string" ? item.contentId.trim() : "";
    const facebookGraphId =
      typeof item.facebookGraphId === "string"
        ? item.facebookGraphId.trim()
        : "";
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/.test(contentId)) {
      throw new ActionError(400, `items[${index}].contentId is invalid`);
    }
    if (!/^\d{6,30}$/.test(facebookGraphId)) {
      throw new ActionError(
        400,
        `items[${index}].facebookGraphId must contain 6-30 digits`,
      );
    }
    if (seen.has(contentId)) {
      throw new ActionError(400, `Duplicate contentId: ${contentId}`);
    }
    seen.add(contentId);
    return {
      contentId,
      facebookGraphId,
      permalink: httpsUrl(item.permalink, `items[${index}].permalink`) ?? undefined,
    };
  });

  return {
    schemaVersion: 1,
    sourceSystem: "facebook-analytics",
    idempotencyKey: payload.idempotencyKey.trim(),
    items,
  };
}

async function stablePayloadHash(payload: AnalyticsAliasPayload): Promise<string> {
  const canonical = JSON.stringify({
    schemaVersion: payload.schemaVersion,
    sourceSystem: payload.sourceSystem,
    idempotencyKey: payload.idempotencyKey,
    items: [...payload.items].sort((left, right) =>
      left.contentId.localeCompare(right.contentId),
    ),
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function ingestFacebookAnalyticsAliases(
  value: unknown,
  actor: string,
) {
  const payload = normalizeAliasIngestPayload(value);
  const payloadHash = await stablePayloadHash(payload);
  const db = database();
  const stored = await db
    .prepare(
      `SELECT payload_hash, response_json
       FROM publication_alias_ingest_batches
       WHERE idempotency_key = ?`,
    )
    .bind(payload.idempotencyKey)
    .first<{ payload_hash: string; response_json: string }>();
  if (stored) {
    if (stored.payload_hash !== payloadHash) {
      throw new ActionError(
        409,
        "Idempotency key is already bound to another analytics payload",
      );
    }
    return {
      ...(JSON.parse(stored.response_json) as object),
      replayed: true,
    };
  }

  const results: AliasIngestResult[] = [];
  const statements: D1PreparedStatement[] = [];
  const now = new Date().toISOString();
  for (const item of payload.items) {
    const target = await db
      .prepare(
        `SELECT j.id AS job_id, r.id AS receipt_id
         FROM distribution_jobs j
         JOIN platforms p ON p.id = j.platform_id AND p.code = 'fb-ig'
         LEFT JOIN publication_receipts r ON r.job_id = j.id
         WHERE j.content_id = ?`,
      )
      .bind(item.contentId)
      .first<{ job_id: string; receipt_id: string | null }>();
    if (!target) {
      results.push({ contentId: item.contentId, status: "NO_JOB" });
      continue;
    }
    if (!target.receipt_id) {
      results.push({ contentId: item.contentId, status: "NO_RECEIPT" });
      continue;
    }
    const existing = await db
      .prepare(
        `SELECT receipt_id, external_id
         FROM publication_aliases
         WHERE namespace = 'FACEBOOK_GRAPH_REEL'
           AND (receipt_id = ? OR external_id = ?)`,
      )
      .bind(target.receipt_id, item.facebookGraphId)
      .first<{ receipt_id: string; external_id: string }>();
    if (existing) {
      const unchanged =
        existing.receipt_id === target.receipt_id &&
        existing.external_id === item.facebookGraphId;
      results.push({
        contentId: item.contentId,
        status: unchanged ? "UNCHANGED" : "CONFLICT",
        receiptId: target.receipt_id,
      });
      continue;
    }

    statements.push(
      db
        .prepare(
          `INSERT INTO publication_aliases(
             id, receipt_id, namespace, external_id, permalink, source,
             verified_at, created_at
           ) VALUES (?, ?, 'FACEBOOK_GRAPH_REEL', ?, ?, 'FACEBOOK_ANALYTICS', ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          target.receipt_id,
          item.facebookGraphId,
          item.permalink ?? null,
          now,
          now,
        ),
      db
        .prepare(
          `UPDATE publication_receipts
           SET analytics_link_status = CASE
             WHEN EXISTS(
               SELECT 1 FROM publication_aliases
               WHERE receipt_id = ? AND namespace = 'INSTAGRAM_MEDIA'
             ) THEN 'LINKED'
             ELSE 'PARTIAL'
           END,
           verification_error = NULL
           WHERE id = ?`,
        )
        .bind(target.receipt_id, target.receipt_id),
      db
        .prepare(
          `INSERT INTO publication_receipt_events(
             id, receipt_id, event_type, actor_email, namespace, external_id,
             idempotency_key, created_at
           ) VALUES (?, ?, 'ALIAS_LINKED', ?, 'FACEBOOK_GRAPH_REEL', ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          target.receipt_id,
          actor,
          item.facebookGraphId,
          `${payload.idempotencyKey}:${item.contentId}`,
          now,
        ),
    );
    results.push({
      contentId: item.contentId,
      status: "LINKED",
      receiptId: target.receipt_id,
    });
  }

  const response = {
    sourceSystem: payload.sourceSystem,
    received: payload.items.length,
    linked: results.filter((item) => item.status === "LINKED").length,
    unchanged: results.filter((item) => item.status === "UNCHANGED").length,
    skipped: results.filter((item) =>
      ["NO_JOB", "NO_RECEIPT", "CONFLICT"].includes(item.status),
    ).length,
    results,
  };
  const hasRetryableSkips = results.some((item) =>
    ["NO_JOB", "NO_RECEIPT"].includes(item.status),
  );
  if (!hasRetryableSkips) {
    statements.push(
      db
        .prepare(
          `INSERT INTO publication_alias_ingest_batches(
             idempotency_key, source_system, actor, payload_hash, item_count,
             response_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          payload.idempotencyKey,
          payload.sourceSystem,
          actor,
          payloadHash,
          payload.items.length,
          JSON.stringify(response),
          now,
        ),
    );
  }

  try {
    if (statements.length) await db.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      throw new ActionError(
        409,
        "Analytics mappings changed concurrently; retry with the same payload",
      );
    }
    throw error;
  }
  return {
    ...response,
    retryable: hasRetryableSkips,
    replayed: false,
  };
}
