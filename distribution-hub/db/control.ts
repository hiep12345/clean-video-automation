import { env } from "cloudflare:workers";
import type {
  BufferState,
  DistributionJob,
  JobAction,
  JobState,
  MemberContext,
  PublicationReceipt,
  QueueItem,
} from "@/lib/types";
import { ActionError } from "@/lib/errors";
import {
  parseMetaBusinessReceiptUrl,
  receiptSchemaStatements,
} from "@/db/receipts";

type RawJob = {
  job_id: string;
  content_id: string;
  channel_code: string;
  channel_name: string;
  channel_color: string;
  title: string;
  content_type: string;
  drive_url: string | null;
  produced_at: string | null;
  qa_score: number | null;
  platform_code: string;
  platform_name: string;
  platform_color: string;
  sequence: number;
  state: JobState;
  assignee_email: string | null;
  claim_expires_at: string | null;
  blocked_reason: string | null;
  scheduled_at: string | null;
  uploaded_at: string | null;
  external_url: string | null;
  updated_at: string;
  receipt_id: string | null;
  receipt_provider: "META" | null;
  meta_content_id: string | null;
  receipt_source_url: string | null;
  publication_status: "REPORTED" | "VERIFIED" | null;
  analytics_link_status:
    | "PENDING"
    | "PARTIAL"
    | "LINKED"
    | "AMBIGUOUS"
    | "FAILED"
    | null;
  reported_by: string | null;
  reported_at: string | null;
  receipt_verified_at: string | null;
  verification_error: string | null;
};

type ActionInput = {
  jobId: string;
  action: JobAction;
  expectedVersion: number;
  idempotencyKey: string;
  actor: string;
  member: MemberContext;
  scheduledAt?: string;
  externalUrl?: string;
  blockedReason?: string;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'slate',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'slate',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS team_members (
    email TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'OPERATOR', 'VIEWER')),
    active INTEGER NOT NULL DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS channel_assignments (
    member_email TEXT NOT NULL REFERENCES team_members(email),
    channel_id TEXT NOT NULL REFERENCES channels(id),
    created_at TEXT NOT NULL,
    UNIQUE(member_email, channel_id)
  )`,
  `CREATE TABLE IF NOT EXISTS team_events (
    id TEXT PRIMARY KEY,
    member_email TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    member_version INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    UNIQUE(member_email, member_version)
  )`,
  `CREATE TABLE IF NOT EXISTS content_items (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id),
    title TEXT NOT NULL,
    content_type TEXT NOT NULL,
    drive_url TEXT,
    produced_at TEXT,
    qa_score REAL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS distribution_jobs (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL REFERENCES content_items(id),
    platform_id TEXT NOT NULL REFERENCES platforms(id),
    created_at TEXT NOT NULL,
    UNIQUE(content_id, platform_id)
  )`,
  `CREATE TABLE IF NOT EXISTS distribution_events (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES distribution_jobs(id),
    sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    state TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    assignee_email TEXT,
    claim_expires_at TEXT,
    blocked_reason TEXT,
    scheduled_at TEXT,
    uploaded_at TEXT,
    external_url TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    UNIQUE(job_id, sequence)
  )`,
  `CREATE INDEX IF NOT EXISTS distribution_events_job_idx
    ON distribution_events(job_id, sequence DESC)`,
  `CREATE TABLE IF NOT EXISTS action_requests (
    idempotency_key TEXT PRIMARY KEY,
    request_fingerprint TEXT NOT NULL,
    job_id TEXT NOT NULL REFERENCES distribution_jobs(id),
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS content_ingest_records (
    content_id TEXT PRIMARY KEY REFERENCES content_items(id),
    source_system TEXT NOT NULL,
    source_revision TEXT NOT NULL,
    source_updated_at TEXT NOT NULL,
    drive_file_id TEXT NOT NULL,
    asset_hash TEXT NOT NULL,
    distribution_revision TEXT NOT NULL,
    qa_receipt_hash TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    first_ingested_at TEXT NOT NULL,
    last_ingested_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS content_ingest_artifact_uq
    ON content_ingest_records(drive_file_id, distribution_revision)`,
  `CREATE TABLE IF NOT EXISTS ingest_batches (
    idempotency_key TEXT PRIMARY KEY,
    source_system TEXT NOT NULL,
    actor TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    item_count INTEGER NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  ...receiptSchemaStatements,
];

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureDatabase(): Promise<void> {
  const db = database();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
}

const latestJobsSql = `
  SELECT
    j.id AS job_id,
    c.id AS content_id,
    ch.code AS channel_code,
    ch.name AS channel_name,
    ch.color AS channel_color,
    c.title,
    c.content_type,
    c.drive_url,
    c.produced_at,
    c.qa_score,
    p.code AS platform_code,
    p.name AS platform_name,
    p.color AS platform_color,
    e.sequence,
    e.state,
    e.assignee_email,
    e.claim_expires_at,
    e.blocked_reason,
    e.scheduled_at,
    e.uploaded_at,
    e.external_url,
    e.created_at AS updated_at,
    r.id AS receipt_id,
    r.provider AS receipt_provider,
    r.meta_content_id,
    r.source_url AS receipt_source_url,
    r.publication_status,
    r.analytics_link_status,
    r.reported_by,
    r.reported_at,
    r.verified_at AS receipt_verified_at,
    r.verification_error
  FROM distribution_jobs j
  JOIN content_items c ON c.id = j.content_id
  JOIN channels ch ON ch.id = c.channel_id
  JOIN platforms p ON p.id = j.platform_id
  JOIN distribution_events e
    ON e.job_id = j.id
   AND e.sequence = (
     SELECT MAX(last_event.sequence)
     FROM distribution_events last_event
     WHERE last_event.job_id = j.id
   )
  LEFT JOIN publication_receipts r ON r.job_id = j.id
  ORDER BY ch.code, c.produced_at DESC, c.id, p.code
`;

function deriveBufferState(jobs: DistributionJob[]): BufferState {
  if (jobs.some((job) => job.state === "BLOCKED")) return "BLOCKED";
  if (jobs.length > 0 && jobs.every((job) => job.state === "UPLOADED")) {
    return "COMPLETE";
  }
  if (
    jobs.some((job) =>
      ["CLAIMED", "SCHEDULED", "UPLOADED"].includes(job.state),
    )
  ) {
    return "IN_PROGRESS";
  }
  return "READY";
}

function receiptFromRow(row: RawJob): PublicationReceipt | null {
  if (
    !row.receipt_id ||
    !row.receipt_provider ||
    !row.meta_content_id ||
    !row.receipt_source_url ||
    !row.publication_status ||
    !row.analytics_link_status ||
    !row.reported_by ||
    !row.reported_at
  ) {
    return null;
  }
  return {
    id: row.receipt_id,
    provider: row.receipt_provider,
    metaContentId: row.meta_content_id,
    sourceUrl: row.receipt_source_url,
    publicationStatus: row.publication_status,
    analyticsLinkStatus: row.analytics_link_status,
    reportedBy: row.reported_by,
    reportedAt: row.reported_at,
    verifiedAt: row.receipt_verified_at,
    verificationError: row.verification_error,
    aliases: [],
  };
}

function mapJob(
  row: RawJob,
  receipt: PublicationReceipt | null = receiptFromRow(row),
): DistributionJob {
  return {
    id: row.job_id,
    platformCode: row.platform_code,
    platformName: row.platform_name,
    platformColor: row.platform_color,
    state: row.state,
    version: Number(row.sequence),
    assigneeEmail: row.assignee_email,
    claimExpiresAt: row.claim_expires_at,
    blockedReason: row.blocked_reason,
    scheduledAt: row.scheduled_at,
    uploadedAt: row.uploaded_at,
    externalUrl: row.external_url,
    updatedAt: row.updated_at,
    receipt,
  };
}

export async function listQueue(member: MemberContext): Promise<QueueItem[]> {
  const result = await database().prepare(latestJobsSql).all<RawJob>();
  const grouped = new Map<string, QueueItem>();

  const visibleRows =
    member.role === "ADMIN"
      ? result.results
      : result.results.filter((row) =>
          member.channelCodes.includes(row.channel_code),
        );

  for (const row of visibleRows) {
    let item = grouped.get(row.content_id);
    if (!item) {
      item = {
        id: row.content_id,
        channelCode: row.channel_code,
        channelName: row.channel_name,
        channelColor: row.channel_color,
        title: row.title,
        contentType: row.content_type,
        driveUrl: row.drive_url,
        producedAt: row.produced_at,
        qaScore: row.qa_score,
        bufferState: "READY",
        jobs: [],
      };
      grouped.set(row.content_id, item);
    }
    item.jobs.push(mapJob(row));
  }

  return [...grouped.values()].map((item) => ({
    ...item,
    bufferState: deriveBufferState(item.jobs),
  }));
}

async function latestJob(jobId: string): Promise<RawJob | null> {
  return database()
    .prepare(`SELECT * FROM (${latestJobsSql}) WHERE job_id = ?`)
    .bind(jobId)
    .first<RawJob>();
}

function requireClaim(job: RawJob, actor: string): void {
  if (job.assignee_email !== actor) {
    throw new ActionError(409, "Job is claimed by another team member");
  }
}

function validHttpsUrl(value: string | undefined): string {
  if (!value) throw new ActionError(400, "A published URL is required");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("not https");
    return url.toString();
  } catch {
    throw new ActionError(400, "Published URL must be a valid HTTPS URL");
  }
}

function canonicalActionRequest(input: ActionInput): string {
  return JSON.stringify({
    action: input.action,
    actor: input.actor,
    blockedReason: input.blockedReason ?? null,
    expectedVersion: input.expectedVersion,
    externalUrl: input.externalUrl ?? null,
    jobId: input.jobId,
    scheduledAt: input.scheduledAt ?? null,
  });
}

async function actionRequestFingerprint(input: ActionInput): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalActionRequest(input)),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

type StoredActionRequest = {
  request_fingerprint: string;
  response_json: string;
};

async function storedActionRequest(
  idempotencyKey: string,
): Promise<StoredActionRequest | null> {
  return database()
    .prepare(
      `SELECT request_fingerprint, response_json
       FROM action_requests
       WHERE idempotency_key = ?`,
    )
    .bind(idempotencyKey)
    .first<StoredActionRequest>();
}

export async function applyJobAction(input: ActionInput) {
  if (!input.jobId || !input.idempotencyKey) {
    throw new ActionError(400, "jobId and idempotencyKey are required");
  }
  if (input.idempotencyKey.length < 8) {
    throw new ActionError(400, "idempotencyKey is too short");
  }

  const db = database();
  const fingerprint = await actionRequestFingerprint(input);
  const storedRequest = await storedActionRequest(input.idempotencyKey);
  if (storedRequest) {
    if (storedRequest.request_fingerprint !== fingerprint) {
      throw new ActionError(
        409,
        "The idempotency key is already bound to another action request",
      );
    }
    return {
      job: JSON.parse(storedRequest.response_json) as DistributionJob,
      replayed: true,
    };
  }

  const legacyReplay = await db
    .prepare(
      "SELECT job_id FROM distribution_events WHERE idempotency_key = ?",
    )
    .bind(input.idempotencyKey)
    .first<{ job_id: string }>();
  if (legacyReplay) {
    throw new ActionError(
      409,
      "The idempotency key was used before request binding was enabled",
    );
  }

  const current = await latestJob(input.jobId);
  if (!current) throw new ActionError(404, "Distribution job not found");
  if (input.member.role === "VIEWER") {
    throw new ActionError(403, "Viewer accounts cannot change upload state");
  }
  if (
    input.member.role !== "ADMIN" &&
    !input.member.channelCodes.includes(current.channel_code)
  ) {
    throw new ActionError(
      403,
      `You are not assigned to channel ${current.channel_code}`,
    );
  }
  if (Number(current.sequence) !== input.expectedVersion) {
    throw new ActionError(409, "Job changed; reload before trying again");
  }

  let state: JobState = current.state;
  let assignee = current.assignee_email;
  let claimExpiresAt = current.claim_expires_at;
  let blockedReason = current.blocked_reason;
  let scheduledAt = current.scheduled_at;
  let uploadedAt = current.uploaded_at;
  let externalUrl = current.external_url;
  let receipt = receiptFromRow(current);
  const receiptStatements: D1PreparedStatement[] = [];

  if (input.action === "claim") {
    const activeClaim =
      current.state === "CLAIMED" &&
      current.claim_expires_at &&
      new Date(current.claim_expires_at) > new Date();
    if (activeClaim && current.assignee_email !== input.actor) {
      throw new ActionError(409, "Job is already claimed");
    }
    if (!["READY", "CLAIMED"].includes(current.state)) {
      throw new ActionError(409, `Cannot claim a ${current.state} job`);
    }
    state = "CLAIMED";
    assignee = input.actor;
    claimExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  } else if (input.action === "release") {
    if (current.state !== "CLAIMED") {
      throw new ActionError(409, "Only a claimed job can be released");
    }
    requireClaim(current, input.actor);
    state = "READY";
    assignee = null;
    claimExpiresAt = null;
  } else if (input.action === "schedule") {
    if (current.state !== "CLAIMED") {
      throw new ActionError(409, "Claim the job before scheduling it");
    }
    requireClaim(current, input.actor);
    if (!input.scheduledAt || Number.isNaN(Date.parse(input.scheduledAt))) {
      throw new ActionError(400, "A valid scheduled time is required");
    }
    state = "SCHEDULED";
    scheduledAt = new Date(input.scheduledAt).toISOString();
  } else if (input.action === "upload") {
    if (!["CLAIMED", "SCHEDULED"].includes(current.state)) {
      throw new ActionError(409, "Claim the job before confirming upload");
    }
    requireClaim(current, input.actor);
    state = "UPLOADED";
    uploadedAt = new Date().toISOString();
    if (current.platform_code === "fb-ig") {
      const metaReceipt = parseMetaBusinessReceiptUrl(input.externalUrl);
      externalUrl = metaReceipt.sourceUrl;
      const existingForMetaId = await db
        .prepare(
          `SELECT id, job_id
           FROM publication_receipts
           WHERE provider = 'META' AND meta_content_id = ?`,
        )
        .bind(metaReceipt.metaContentId)
        .first<{ id: string; job_id: string }>();
      if (existingForMetaId && existingForMetaId.job_id !== input.jobId) {
        throw new ActionError(
          409,
          "This Meta content_id is already attached to another job",
        );
      }
      if (receipt && receipt.metaContentId !== metaReceipt.metaContentId) {
        throw new ActionError(
          409,
          "This job already has a different Meta content_id",
        );
      }

      const receiptId = receipt?.id ?? crypto.randomUUID();
      const reportedAt = receipt?.reportedAt ?? new Date().toISOString();
      receipt = {
        id: receiptId,
        provider: "META",
        metaContentId: metaReceipt.metaContentId,
        sourceUrl: metaReceipt.sourceUrl,
        publicationStatus: receipt?.publicationStatus ?? "REPORTED",
        analyticsLinkStatus: receipt?.analyticsLinkStatus ?? "PENDING",
        reportedBy: receipt?.reportedBy ?? input.actor,
        reportedAt,
        verifiedAt: receipt?.verifiedAt ?? null,
        verificationError: receipt?.verificationError ?? null,
        aliases: [
          {
            namespace: "META_BUSINESS_CONTENT",
            externalId: metaReceipt.metaContentId,
            permalink: metaReceipt.sourceUrl,
            source: "MEMBER_REPORT",
            verifiedAt: null,
          },
        ],
      };
      if (!current.receipt_id) {
        receiptStatements.push(
          db
            .prepare(
              `INSERT INTO publication_receipts(
                 id, job_id, provider, meta_content_id, source_url,
                 publication_status, analytics_link_status, reported_by,
                 reported_at, verified_at, verification_error
               ) VALUES (?, ?, 'META', ?, ?, 'REPORTED', 'PENDING', ?, ?, NULL, NULL)`,
            )
            .bind(
              receiptId,
              input.jobId,
              metaReceipt.metaContentId,
              metaReceipt.sourceUrl,
              input.actor,
              reportedAt,
            ),
          db
            .prepare(
              `INSERT INTO publication_aliases(
                 id, receipt_id, namespace, external_id, permalink, source,
                 verified_at, created_at
               ) VALUES (?, ?, 'META_BUSINESS_CONTENT', ?, ?, 'MEMBER_REPORT', NULL, ?)`,
            )
            .bind(
              crypto.randomUUID(),
              receiptId,
              metaReceipt.metaContentId,
              metaReceipt.sourceUrl,
              reportedAt,
            ),
          db
            .prepare(
              `INSERT INTO publication_receipt_events(
                 id, receipt_id, event_type, actor_email, namespace, external_id,
                 idempotency_key, created_at
               ) VALUES (?, ?, 'REPORTED', ?, 'META_BUSINESS_CONTENT', ?, ?, ?)`,
            )
            .bind(
              crypto.randomUUID(),
              receiptId,
              input.actor,
              metaReceipt.metaContentId,
              `receipt:${input.idempotencyKey}`,
              reportedAt,
            ),
        );
      }
    } else {
      externalUrl = validHttpsUrl(input.externalUrl);
    }
    claimExpiresAt = null;
  } else if (input.action === "block") {
    if (current.state === "UPLOADED") {
      throw new ActionError(409, "An uploaded job cannot be blocked");
    }
    if (
      current.assignee_email &&
      current.assignee_email !== input.actor &&
      ["CLAIMED", "SCHEDULED"].includes(current.state)
    ) {
      throw new ActionError(409, "Job is claimed by another team member");
    }
    const reason = input.blockedReason?.trim() ?? "";
    if (reason.length < 3) {
      throw new ActionError(400, "Blocked reason is required");
    }
    state = "BLOCKED";
    blockedReason = reason;
    assignee = input.actor;
    claimExpiresAt = null;
  } else if (input.action === "unblock") {
    if (current.state !== "BLOCKED") {
      throw new ActionError(409, "Only a blocked job can be unblocked");
    }
    state = "READY";
    blockedReason = null;
    assignee = null;
  }

  const nextSequence = Number(current.sequence) + 1;
  const createdAt = new Date().toISOString();
  const nextJob = mapJob(
    {
      ...current,
      sequence: nextSequence,
      state,
      assignee_email: assignee,
      claim_expires_at: claimExpiresAt,
      blocked_reason: blockedReason,
      scheduled_at: scheduledAt,
      uploaded_at: uploadedAt,
      external_url: externalUrl,
      updated_at: createdAt,
    },
    receipt,
  );
  const responseJson = JSON.stringify(nextJob);
  try {
    await db.batch([
      ...receiptStatements,
      db
        .prepare(
        `INSERT INTO distribution_events(
          id, job_id, sequence, event_type, state, actor_email,
          assignee_email, claim_expires_at, blocked_reason, scheduled_at,
          uploaded_at, external_url, idempotency_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.jobId,
        nextSequence,
        input.action.toUpperCase(),
        state,
        input.actor,
        assignee,
        claimExpiresAt,
        blockedReason,
        scheduledAt,
        uploadedAt,
        externalUrl,
        input.idempotencyKey,
        createdAt,
      ),
      db
        .prepare(
          `INSERT INTO action_requests(
            idempotency_key, request_fingerprint, job_id, response_json, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          input.idempotencyKey,
          fingerprint,
          input.jobId,
          responseJson,
          createdAt,
        ),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      const concurrentReplay = await storedActionRequest(input.idempotencyKey);
      if (concurrentReplay) {
        if (concurrentReplay.request_fingerprint !== fingerprint) {
          throw new ActionError(
            409,
            "The idempotency key is already bound to another action request",
          );
        }
        return {
          job: JSON.parse(
            concurrentReplay.response_json,
          ) as DistributionJob,
          replayed: true,
        };
      }
      throw new ActionError(409, "Concurrent update detected; reload the job");
    }
    throw error;
  }

  return { job: nextJob, replayed: false };
}
