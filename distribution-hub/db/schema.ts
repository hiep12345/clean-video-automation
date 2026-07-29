import {
  integer,
  index,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull().default("slate"),
  createdAt: text("created_at").notNull(),
});

export const platforms = sqliteTable("platforms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull().default("slate"),
  createdAt: text("created_at").notNull(),
});

export const teamMembers = sqliteTable("team_members", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const channelAssignments = sqliteTable(
  "channel_assignments",
  {
    memberEmail: text("member_email")
      .notNull()
      .references(() => teamMembers.email),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("channel_assignment_uq").on(
      table.memberEmail,
      table.channelId,
    ),
  ],
);

export const teamEvents = sqliteTable(
  "team_events",
  {
    id: text("id").primaryKey(),
    memberEmail: text("member_email").notNull(),
    actorEmail: text("actor_email").notNull(),
    eventType: text("event_type").notNull(),
    memberVersion: integer("member_version").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("team_event_idempotency_uq").on(table.idempotencyKey),
    uniqueIndex("team_event_member_version_uq").on(
      table.memberEmail,
      table.memberVersion,
    ),
  ],
);

export const contentItems = sqliteTable("content_items", {
  id: text("id").primaryKey(),
  channelId: text("channel_id")
    .notNull()
    .references(() => channels.id),
  title: text("title").notNull(),
  contentType: text("content_type").notNull(),
  driveUrl: text("drive_url"),
  producedAt: text("produced_at"),
  qaScore: real("qa_score"),
  createdAt: text("created_at").notNull(),
});

export const distributionJobs = sqliteTable(
  "distribution_jobs",
  {
    id: text("id").primaryKey(),
    contentId: text("content_id")
      .notNull()
      .references(() => contentItems.id),
    platformId: text("platform_id")
      .notNull()
      .references(() => platforms.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("distribution_job_target_uq").on(
      table.contentId,
      table.platformId,
    ),
  ],
);

export const distributionEvents = sqliteTable(
  "distribution_events",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => distributionJobs.id),
    sequence: integer("sequence").notNull(),
    eventType: text("event_type").notNull(),
    state: text("state").notNull(),
    actorEmail: text("actor_email").notNull(),
    assigneeEmail: text("assignee_email"),
    claimExpiresAt: text("claim_expires_at"),
    blockedReason: text("blocked_reason"),
    scheduledAt: text("scheduled_at"),
    uploadedAt: text("uploaded_at"),
    externalUrl: text("external_url"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("distribution_event_sequence_uq").on(
      table.jobId,
      table.sequence,
    ),
    uniqueIndex("distribution_event_idempotency_uq").on(
      table.idempotencyKey,
    ),
  ],
);

export const actionRequests = sqliteTable("action_requests", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  requestFingerprint: text("request_fingerprint").notNull(),
  jobId: text("job_id")
    .notNull()
    .references(() => distributionJobs.id),
  responseJson: text("response_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const publicationReceipts = sqliteTable(
  "publication_receipts",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => distributionJobs.id),
    provider: text("provider").notNull(),
    metaContentId: text("meta_content_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    publicationStatus: text("publication_status").notNull(),
    analyticsLinkStatus: text("analytics_link_status").notNull(),
    reportedBy: text("reported_by").notNull(),
    reportedAt: text("reported_at").notNull(),
    verifiedAt: text("verified_at"),
    verificationError: text("verification_error"),
  },
  (table) => [
    uniqueIndex("publication_receipt_job_uq").on(table.jobId),
    uniqueIndex("publication_receipt_meta_content_uq").on(
      table.provider,
      table.metaContentId,
    ),
    index("publication_receipts_status_idx").on(
      table.analyticsLinkStatus,
      table.reportedAt,
    ),
  ],
);

export const publicationAliases = sqliteTable(
  "publication_aliases",
  {
    id: text("id").primaryKey(),
    receiptId: text("receipt_id")
      .notNull()
      .references(() => publicationReceipts.id),
    namespace: text("namespace").notNull(),
    externalId: text("external_id").notNull(),
    permalink: text("permalink"),
    source: text("source").notNull(),
    verifiedAt: text("verified_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("publication_alias_namespace_id_uq").on(
      table.namespace,
      table.externalId,
    ),
    uniqueIndex("publication_alias_receipt_namespace_uq").on(
      table.receiptId,
      table.namespace,
    ),
  ],
);

export const publicationReceiptEvents = sqliteTable(
  "publication_receipt_events",
  {
    id: text("id").primaryKey(),
    receiptId: text("receipt_id")
      .notNull()
      .references(() => publicationReceipts.id),
    eventType: text("event_type").notNull(),
    actorEmail: text("actor_email").notNull(),
    namespace: text("namespace"),
    externalId: text("external_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("publication_receipt_event_idempotency_uq").on(
      table.idempotencyKey,
    ),
  ],
);

export const publicationAliasIngestBatches = sqliteTable(
  "publication_alias_ingest_batches",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    sourceSystem: text("source_system").notNull(),
    actor: text("actor").notNull(),
    payloadHash: text("payload_hash").notNull(),
    itemCount: integer("item_count").notNull(),
    responseJson: text("response_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
);

export const publicationReceiptActionRequests = sqliteTable(
  "publication_receipt_action_requests",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    requestFingerprint: text("request_fingerprint").notNull(),
    receiptId: text("receipt_id")
      .notNull()
      .references(() => publicationReceipts.id),
    createdAt: text("created_at").notNull(),
  },
);

export const contentIngestRecords = sqliteTable(
  "content_ingest_records",
  {
    contentId: text("content_id")
      .primaryKey()
      .references(() => contentItems.id),
    sourceSystem: text("source_system").notNull(),
    sourceRevision: text("source_revision").notNull(),
    sourceUpdatedAt: text("source_updated_at").notNull(),
    driveFileId: text("drive_file_id").notNull(),
    assetHash: text("asset_hash").notNull(),
    distributionRevision: text("distribution_revision").notNull(),
    qaReceiptHash: text("qa_receipt_hash").notNull(),
    payloadHash: text("payload_hash").notNull(),
    firstIngestedAt: text("first_ingested_at").notNull(),
    lastIngestedAt: text("last_ingested_at").notNull(),
  },
  (table) => [
    uniqueIndex("content_ingest_artifact_uq").on(
      table.driveFileId,
      table.distributionRevision,
    ),
  ],
);

export const ingestBatches = sqliteTable("ingest_batches", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  sourceSystem: text("source_system").notNull(),
  actor: text("actor").notNull(),
  payloadHash: text("payload_hash").notNull(),
  itemCount: integer("item_count").notNull(),
  responseJson: text("response_json").notNull(),
  createdAt: text("created_at").notNull(),
});
