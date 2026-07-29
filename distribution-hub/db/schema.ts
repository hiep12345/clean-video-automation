import {
  integer,
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
