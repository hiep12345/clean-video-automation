import { env } from "cloudflare:workers";
import { ActionError } from "@/lib/errors";

const SOURCE_SYSTEM = "production-pipeline";
const ALLOWED_TARGETS = new Set(["fb-ig", "youtube", "amz"]);
const PLATFORM_IDS: Record<string, string> = {
  "fb-ig": "platform-fb-ig",
  youtube: "platform-youtube",
  amz: "platform-amz",
};
const PLATFORM_REGISTRY: Record<
  string,
  { name: string; color: string }
> = {
  "fb-ig": { name: "Meta — Facebook + Instagram", color: "blue" },
  youtube: { name: "YouTube", color: "red" },
  amz: { name: "Amazon", color: "amber" },
};

export type IngestContentItem = {
  id: string;
  channelCode: string;
  channelName: string;
  title: string;
  contentType: string;
  driveUrl: string;
  driveFileId: string;
  producedAt: string;
  qaScore: number;
  assetHash: string;
  distributionRevision: string;
  qaReceiptHash: string;
  sourceRevision: string;
  sourceUpdatedAt: string;
  targets: string[];
};

export type IngestPayload = {
  schemaVersion: 1;
  sourceSystem: string;
  idempotencyKey: string;
  items: IngestContentItem[];
};

type NormalizedItem = IngestContentItem & {
  channelCode: string;
  contentType: string;
  targets: string[];
};

type ExistingRecord = {
  content_id: string;
  source_revision: string;
  source_updated_at: string;
  drive_file_id: string;
  asset_hash: string;
  distribution_revision: string;
  payload_hash: string;
};

type ExistingContent = {
  content_id: string;
};

type ExistingJob = {
  id: string;
  content_id: string;
  platform_code: string;
  state: string;
};

type StoredBatch = {
  payload_hash: string;
  response_json: string;
};

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

function requiredString(
  value: unknown,
  field: string,
  maximum = 500,
): string {
  if (typeof value !== "string") {
    throw new ActionError(400, `${field} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new ActionError(
      400,
      `${field} must contain 1-${maximum} characters`,
    );
  }
  return normalized;
}

function exactRevision(value: unknown, field: string): string {
  const revision = requiredString(value, field, 160);
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(revision)) {
    throw new ActionError(400, `${field} is not a valid immutable revision`);
  }
  return revision;
}

function exactDate(value: unknown, field: string): string {
  const date = requiredString(value, field, 64);
  if (Number.isNaN(Date.parse(date))) {
    throw new ActionError(400, `${field} must be an ISO date or timestamp`);
  }
  return new Date(date).toISOString();
}

function driveUrl(value: unknown): string {
  const raw = requiredString(value, "driveUrl", 2048);
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com") {
      throw new Error("not an approved Drive URL");
    }
    return url.toString();
  } catch {
    throw new ActionError(
      400,
      "driveUrl must be a valid HTTPS drive.google.com URL",
    );
  }
}

function normalizeItem(value: unknown, index: number): NormalizedItem {
  if (!value || typeof value !== "object") {
    throw new ActionError(400, `items[${index}] must be an object`);
  }
  const raw = value as Record<string, unknown>;
  const id = requiredString(raw.id, `items[${index}].id`, 180);
  if (!/^[a-z0-9][a-z0-9._:-]{2,179}$/.test(id)) {
    throw new ActionError(400, `items[${index}].id is not canonical`);
  }

  const channelCode = requiredString(
    raw.channelCode,
    `items[${index}].channelCode`,
    12,
  ).toUpperCase();
  const contentType = requiredString(
    raw.contentType,
    `items[${index}].contentType`,
    24,
  ).toLowerCase();
  if (contentType !== "photo") {
    throw new ActionError(
      400,
      `items[${index}].contentType must be photo for ingest schema v1`,
    );
  }

  if (!Array.isArray(raw.targets) || raw.targets.length === 0) {
    throw new ActionError(
      400,
      `items[${index}].targets must contain at least one platform`,
    );
  }
  const targets = [
    ...new Set(
      raw.targets.map((target) =>
        requiredString(target, `items[${index}].targets`, 24).toLowerCase(),
      ),
    ),
  ].sort();
  if (targets.some((target) => !ALLOWED_TARGETS.has(target))) {
    throw new ActionError(
      400,
      `items[${index}].targets contains an unsupported platform`,
    );
  }

  const qaScore = Number(raw.qaScore);
  if (!Number.isFinite(qaScore) || qaScore <= 0 || qaScore > 10) {
    throw new ActionError(400, `items[${index}].qaScore must be >0 and <=10`);
  }

  return {
    id,
    channelCode,
    channelName: requiredString(
      raw.channelName,
      `items[${index}].channelName`,
      120,
    ),
    title: requiredString(raw.title, `items[${index}].title`, 500),
    contentType,
    driveUrl: driveUrl(raw.driveUrl),
    driveFileId: requiredString(
      raw.driveFileId,
      `items[${index}].driveFileId`,
      180,
    ),
    producedAt: exactDate(raw.producedAt, `items[${index}].producedAt`),
    qaScore,
    assetHash: exactRevision(
      raw.assetHash,
      `items[${index}].assetHash`,
    ),
    distributionRevision: exactRevision(
      raw.distributionRevision,
      `items[${index}].distributionRevision`,
    ),
    qaReceiptHash: exactRevision(
      raw.qaReceiptHash,
      `items[${index}].qaReceiptHash`,
    ),
    sourceRevision: exactRevision(
      raw.sourceRevision,
      `items[${index}].sourceRevision`,
    ),
    sourceUpdatedAt: exactDate(
      raw.sourceUpdatedAt,
      `items[${index}].sourceUpdatedAt`,
    ),
    targets,
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

async function storedBatch(
  idempotencyKey: string,
): Promise<StoredBatch | null> {
  return database()
    .prepare(
      "SELECT payload_hash, response_json FROM ingest_batches WHERE idempotency_key = ?",
    )
    .bind(idempotencyKey)
    .first<StoredBatch>();
}

function replayedResponse(batch: StoredBatch, payloadHash: string) {
  if (batch.payload_hash !== payloadHash) {
    throw new ActionError(
      409,
      "The ingest idempotency key is already bound to another payload",
    );
  }
  return {
    ...(JSON.parse(batch.response_json) as Record<string, unknown>),
    replayed: true,
  };
}

export async function ingestContentBatch(
  input: unknown,
  actor: string,
): Promise<Record<string, unknown>> {
  if (!input || typeof input !== "object") {
    throw new ActionError(400, "Ingest payload must be an object");
  }
  const raw = input as Record<string, unknown>;
  if (raw.schemaVersion !== 1) {
    throw new ActionError(400, "schemaVersion must be 1");
  }
  const sourceSystem = requiredString(raw.sourceSystem, "sourceSystem", 80);
  if (sourceSystem !== SOURCE_SYSTEM) {
    throw new ActionError(
      400,
      `sourceSystem must be ${SOURCE_SYSTEM}`,
    );
  }
  const idempotencyKey = requiredString(
    raw.idempotencyKey,
    "idempotencyKey",
    180,
  );
  if (idempotencyKey.length < 16) {
    throw new ActionError(400, "idempotencyKey is too short");
  }
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new ActionError(400, "items must contain at least one content item");
  }
  if (raw.items.length > 100) {
    throw new ActionError(400, "A single ingest batch cannot exceed 100 items");
  }

  const items = raw.items.map(normalizeItem).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new ActionError(400, "A content ID may appear only once per batch");
  }
  const payloadHash = await sha256({ schemaVersion: 1, sourceSystem, items });
  const replay = await storedBatch(idempotencyKey);
  if (replay) return replayedResponse(replay, payloadHash);

  const db = database();
  const ids = items.map((item) => item.id);
  const channelNames = new Map<string, string>();
  for (const item of items) {
    const existingName = channelNames.get(item.channelCode);
    if (existingName && existingName !== item.channelName) {
      throw new ActionError(
        400,
        `Channel ${item.channelCode} has conflicting names in one batch`,
      );
    }
    channelNames.set(item.channelCode, item.channelName);
  }

  const [recordResult, jobResult, artifactResult, contentResult] =
    await Promise.all([
    db
      .prepare(
        `SELECT content_id, source_revision, source_updated_at, drive_file_id,
                asset_hash, distribution_revision, payload_hash
           FROM content_ingest_records
          WHERE content_id IN (${placeholders(ids.length)})`,
      )
      .bind(...ids)
      .all<ExistingRecord>(),
    db
      .prepare(
        `SELECT j.id, j.content_id, p.code AS platform_code, e.state
           FROM distribution_jobs j
           JOIN platforms p ON p.id = j.platform_id
           JOIN distribution_events e
             ON e.job_id = j.id
            AND e.sequence = (
              SELECT MAX(last_event.sequence)
                FROM distribution_events last_event
               WHERE last_event.job_id = j.id
            )
          WHERE j.content_id IN (${placeholders(ids.length)})`,
      )
      .bind(...ids)
      .all<ExistingJob>(),
    db
      .prepare(
        `SELECT content_id, drive_file_id, distribution_revision
           FROM content_ingest_records
          WHERE drive_file_id IN (${placeholders(items.length)})`,
      )
      .bind(...items.map((item) => item.driveFileId))
      .all<{
        content_id: string;
        drive_file_id: string;
        distribution_revision: string;
      }>(),
    db
      .prepare(
        `SELECT c.id AS content_id
           FROM content_items c
          WHERE c.id IN (${placeholders(ids.length)})`,
      )
      .bind(...ids)
      .all<ExistingContent>(),
  ]);

  const records = new Map(
    recordResult.results.map((record) => [record.content_id, record]),
  );
  const existingContent = new Map(
    contentResult.results.map((content) => [content.content_id, content]),
  );
  const jobsByContent = new Map<string, ExistingJob[]>();
  for (const job of jobResult.results) {
    const jobs = jobsByContent.get(job.content_id) ?? [];
    jobs.push(job);
    jobsByContent.set(job.content_id, jobs);
  }

  const incomingArtifactOwner = new Map<string, string>();
  for (const item of items) {
    const artifactKey = `${item.driveFileId}:${item.distributionRevision}`;
    const owner = incomingArtifactOwner.get(artifactKey);
    if (owner && owner !== item.id) {
      throw new ActionError(
        409,
        "The same immutable Drive artifact cannot belong to two content IDs",
      );
    }
    incomingArtifactOwner.set(artifactKey, item.id);
  }
  for (const artifact of artifactResult.results) {
    const artifactKey = `${artifact.drive_file_id}:${artifact.distribution_revision}`;
    const incomingOwner = incomingArtifactOwner.get(artifactKey);
    if (incomingOwner && incomingOwner !== artifact.content_id) {
      throw new ActionError(
        409,
        "A Drive artifact is already assigned to another content ID",
      );
    }
  }

  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  for (const [code, platform] of Object.entries(PLATFORM_REGISTRY)) {
    statements.push(
      db
        .prepare(
          `INSERT INTO platforms(id, code, name, color, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(code) DO UPDATE SET
             name=excluded.name,
             color=excluded.color`,
        )
        .bind(
          PLATFORM_IDS[code],
          code,
          platform.name,
          platform.color,
          now,
        ),
    );
  }
  for (const [code, name] of channelNames) {
    statements.push(
      db
        .prepare(
          `INSERT INTO channels(id, code, name, color, created_at)
           VALUES (?, ?, ?, 'slate', ?)
           ON CONFLICT(code) DO UPDATE SET name=excluded.name`,
        )
        .bind(`channel-${code.toLowerCase()}`, code, name, now),
    );
  }
  const summary = {
    created: 0,
    updated: 0,
    unchanged: 0,
    stale: 0,
    jobsCreated: 0,
    targetsPreserved: 0,
  };

  for (const item of items) {
    const itemHash = await sha256(item);
    const existing = records.get(item.id);
    const currentJobs = jobsByContent.get(item.id) ?? [];
    if (existing) {
      const incomingTime = Date.parse(item.sourceUpdatedAt);
      const existingTime = Date.parse(existing.source_updated_at);
      if (incomingTime < existingTime) {
        summary.stale += 1;
        continue;
      }
      if (incomingTime === existingTime && existing.payload_hash !== itemHash) {
        throw new ActionError(
          409,
          `Content ${item.id} changed without a newer sourceUpdatedAt`,
        );
      }
      if (existing.payload_hash === itemHash) {
        summary.unchanged += 1;
        continue;
      }
      if (
        (
          existing.source_revision !== item.sourceRevision ||
          existing.drive_file_id !== item.driveFileId ||
          existing.asset_hash !== item.assetHash ||
          existing.distribution_revision !== item.distributionRevision
        ) &&
        currentJobs.some((job) => job.state !== "READY")
      ) {
        throw new ActionError(
          409,
          `Content ${item.id} has active job history; a new artifact revision requires an explicit reset workflow`,
        );
      }
      summary.updated += 1;
    } else {
      const legacy = existingContent.get(item.id);
      if (
        legacy &&
        currentJobs.some((job) => job.state !== "READY")
      ) {
        throw new ActionError(
          409,
          `Content ${item.id} has active legacy job history; every job must be READY before first-time adoption`,
        );
      }
      summary.created += 1;
    }

    const channelId = `channel-${item.channelCode.toLowerCase()}`;
    statements.push(
      db
        .prepare(
          `INSERT INTO content_items(
             id, channel_id, title, content_type, drive_url,
             produced_at, qa_score, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             channel_id=excluded.channel_id,
             title=excluded.title,
             content_type=excluded.content_type,
             drive_url=excluded.drive_url,
             produced_at=excluded.produced_at,
             qa_score=excluded.qa_score`,
        )
        .bind(
          item.id,
          channelId,
          item.title,
          item.contentType,
          item.driveUrl,
          item.producedAt,
          item.qaScore,
          now,
        ),
    );

    const existingTargets = new Set(
      currentJobs.map((job) => job.platform_code),
    );
    summary.targetsPreserved += [...existingTargets].filter(
      (target) => !item.targets.includes(target),
    ).length;
    for (const target of item.targets) {
      if (existingTargets.has(target)) continue;
      const platformId = PLATFORM_IDS[target];
      const jobId = `${item.id}:${platformId}`;
      statements.push(
        db
          .prepare(
            "INSERT INTO distribution_jobs(id, content_id, platform_id, created_at) VALUES (?, ?, ?, ?)",
          )
          .bind(jobId, item.id, platformId, now),
        db
          .prepare(
            `INSERT INTO distribution_events(
               id, job_id, sequence, event_type, state, actor_email,
               idempotency_key, created_at
             ) VALUES (?, ?, 1, 'CREATED', 'READY', ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            jobId,
            actor,
            `ingest:${idempotencyKey}:${jobId}`,
            now,
          ),
      );
      summary.jobsCreated += 1;
    }

    statements.push(
      db
        .prepare(
          `INSERT INTO content_ingest_records(
             content_id, source_system, source_revision, source_updated_at,
             drive_file_id, asset_hash, distribution_revision,
             qa_receipt_hash, payload_hash, first_ingested_at, last_ingested_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(content_id) DO UPDATE SET
             source_system=excluded.source_system,
             source_revision=excluded.source_revision,
             source_updated_at=excluded.source_updated_at,
             drive_file_id=excluded.drive_file_id,
             asset_hash=excluded.asset_hash,
             distribution_revision=excluded.distribution_revision,
             qa_receipt_hash=excluded.qa_receipt_hash,
             payload_hash=excluded.payload_hash,
             last_ingested_at=excluded.last_ingested_at`,
        )
        .bind(
          item.id,
          sourceSystem,
          item.sourceRevision,
          item.sourceUpdatedAt,
          item.driveFileId,
          item.assetHash,
          item.distributionRevision,
          item.qaReceiptHash,
          itemHash,
          now,
          now,
        ),
    );
  }

  const response = {
    sourceSystem,
    itemCount: items.length,
    ...summary,
    replayed: false,
  };
  statements.push(
    db
      .prepare(
        `INSERT INTO ingest_batches(
           idempotency_key, source_system, actor, payload_hash,
           item_count, response_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        idempotencyKey,
        sourceSystem,
        actor,
        payloadHash,
        items.length,
        JSON.stringify(response),
        now,
      ),
  );

  try {
    await db.batch(statements);
    return response;
  } catch (error) {
    const concurrent = await storedBatch(idempotencyKey);
    if (concurrent) return replayedResponse(concurrent, payloadHash);
    throw error;
  }
}
