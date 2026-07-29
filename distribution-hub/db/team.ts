import { env } from "cloudflare:workers";
import type { RequestIdentity } from "@/lib/auth";
import { ActionError } from "@/lib/errors";
import type {
  MemberContext,
  TeamChannel,
  TeamMember,
  TeamResponse,
  TeamRole,
} from "@/lib/types";

type RawMember = {
  email: string;
  display_name: string;
  role: TeamRole;
  active: number;
  version: number;
};

type AssignmentRow = {
  member_email: string;
  channel_code: string;
};

type SaveMemberInput = {
  actor: MemberContext;
  email: string;
  displayName?: string;
  role: TeamRole;
  active: boolean;
  channelCodes: string[];
  expectedVersion: number;
  idempotencyKey: string;
};

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

function configuredAdminEmail(): string | null {
  const runtime = env as unknown as {
    DISTRIBUTION_ADMIN_EMAIL?: string;
  };
  return runtime.DISTRIBUTION_ADMIN_EMAIL?.trim().toLowerCase() || null;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new ActionError(400, "A valid member email is required");
  }
  return email;
}

function assertRole(value: string): asserts value is TeamRole {
  if (!["ADMIN", "OPERATOR", "VIEWER"].includes(value)) {
    throw new ActionError(400, "Unsupported team role");
  }
}

async function assignmentsFor(email: string): Promise<string[]> {
  const result = await database()
    .prepare(
      `SELECT ch.code AS channel_code
       FROM channel_assignments ca
       JOIN channels ch ON ch.id = ca.channel_id
       WHERE ca.member_email = ?
       ORDER BY ch.code`,
    )
    .bind(email)
    .all<{ channel_code: string }>();
  return result.results.map((row) => row.channel_code);
}

async function rawMember(email: string): Promise<RawMember | null> {
  return database()
    .prepare(
      `SELECT email, display_name, role, active, version
       FROM team_members WHERE email = ?`,
    )
    .bind(email)
    .first<RawMember>();
}

async function mapMember(row: RawMember): Promise<TeamMember> {
  return {
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    active: Boolean(row.active),
    version: Number(row.version),
    channelCodes: await assignmentsFor(row.email),
  };
}

export async function resolveMembership(
  identity: RequestIdentity,
): Promise<MemberContext> {
  const db = database();
  const adminEmail = configuredAdminEmail();
  const isLocalAdmin =
    identity.isLocal && identity.email === "local.preview@distribution-hub";
  const isConfiguredAdmin = adminEmail === identity.email;

  if (isLocalAdmin || isConfiguredAdmin) {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO team_members(
          email, display_name, role, active, version, created_at, updated_at
        ) VALUES (?, ?, 'ADMIN', 1, 1, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          display_name = excluded.display_name,
          role = 'ADMIN',
          active = 1,
          updated_at = excluded.updated_at`,
      )
      .bind(identity.email, identity.displayName, now, now)
      .run();
  }

  const member = await rawMember(identity.email);
  if (!member || !member.active) {
    throw new ActionError(
      403,
      "Your account is not active in Distribution Hub. Ask an admin to add it.",
    );
  }

  const channelCodes = await assignmentsFor(member.email);
  return {
    email: member.email,
    displayName: member.display_name,
    role: member.role,
    channelCodes,
    canManageTeam: member.role === "ADMIN",
  };
}

function requireAdmin(member: MemberContext): void {
  if (!member.canManageTeam) {
    throw new ActionError(403, "Only an admin can manage team assignments");
  }
}

export async function listTeam(actor: MemberContext): Promise<TeamResponse> {
  requireAdmin(actor);
  const db = database();
  const [memberRows, assignmentRows, channelRows] = await Promise.all([
    db
      .prepare(
        `SELECT email, display_name, role, active, version
         FROM team_members ORDER BY active DESC, display_name, email`,
      )
      .all<RawMember>(),
    db
      .prepare(
        `SELECT ca.member_email, ch.code AS channel_code
         FROM channel_assignments ca
         JOIN channels ch ON ch.id = ca.channel_id
         ORDER BY ca.member_email, ch.code`,
      )
      .all<AssignmentRow>(),
    db
      .prepare("SELECT code, name FROM channels ORDER BY code")
      .all<TeamChannel>(),
  ]);

  const assignments = new Map<string, string[]>();
  for (const row of assignmentRows.results) {
    const codes = assignments.get(row.member_email) ?? [];
    codes.push(row.channel_code);
    assignments.set(row.member_email, codes);
  }

  return {
    members: memberRows.results.map((row) => ({
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      active: Boolean(row.active),
      version: Number(row.version),
      channelCodes: assignments.get(row.email) ?? [],
    })),
    channels: channelRows.results,
  };
}

export async function saveTeamMember(
  input: SaveMemberInput,
): Promise<{ member: TeamMember; replayed: boolean }> {
  requireAdmin(input.actor);
  assertRole(input.role);
  if (input.idempotencyKey.length < 8) {
    throw new ActionError(400, "idempotencyKey is too short");
  }

  const db = database();
  const email = normalizeEmail(input.email);
  const displayName = input.displayName?.trim() || email.split("@")[0];
  const channelCodes = [...new Set(input.channelCodes.map((code) => code.trim()))]
    .filter(Boolean)
    .sort();
  if (input.role !== "ADMIN" && input.active && channelCodes.length === 0) {
    throw new ActionError(
      400,
      "An active operator or viewer needs at least one assigned channel",
    );
  }

  const replay = await db
    .prepare("SELECT member_email FROM team_events WHERE idempotency_key = ?")
    .bind(input.idempotencyKey)
    .first<{ member_email: string }>();
  if (replay) {
    const replayedMember = await rawMember(replay.member_email);
    if (!replayedMember) throw new ActionError(409, "Replay target is missing");
    return { member: await mapMember(replayedMember), replayed: true };
  }

  const configuredAdmin = configuredAdminEmail();
  if (
    configuredAdmin === email &&
    (!input.active || input.role !== "ADMIN")
  ) {
    throw new ActionError(409, "The configured owner must remain an active admin");
  }

  const current = await rawMember(email);
  if (!current && input.expectedVersion !== 0) {
    throw new ActionError(409, "Member does not exist; reload the team list");
  }
  if (current && Number(current.version) !== input.expectedVersion) {
    throw new ActionError(409, "Member changed; reload before saving");
  }
  if (
    current?.role === "ADMIN" &&
    current.active &&
    (!input.active || input.role !== "ADMIN")
  ) {
    const otherAdmins = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM team_members WHERE role = 'ADMIN' AND active = 1 AND email <> ?",
      )
      .bind(email)
      .first<{ count: number }>();
    if ((otherAdmins?.count ?? 0) === 0) {
      throw new ActionError(409, "At least one active admin is required");
    }
  }

  const validChannels = await db
    .prepare(
      `SELECT id, code FROM channels
       WHERE code IN (${channelCodes.map(() => "?").join(",") || "NULL"})`,
    )
    .bind(...channelCodes)
    .all<{ id: string; code: string }>();
  if (validChannels.results.length !== channelCodes.length) {
    throw new ActionError(400, "One or more assigned channels are invalid");
  }

  const now = new Date().toISOString();
  const nextVersion = current ? Number(current.version) + 1 : 1;
  const statements: D1PreparedStatement[] = [];

  if (current) {
    statements.push(
      db
        .prepare(
          `UPDATE team_members
           SET display_name = ?, role = ?, active = ?, version = ?,
               updated_at = ?
           WHERE email = ? AND version = ?`,
        )
        .bind(
          displayName,
          input.role,
          input.active ? 1 : 0,
          nextVersion,
          now,
          email,
          input.expectedVersion,
        ),
    );
  } else {
    statements.push(
      db
        .prepare(
          `INSERT INTO team_members(
            email, display_name, role, active, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
        )
        .bind(
          email,
          displayName,
          input.role,
          input.active ? 1 : 0,
          now,
          now,
        ),
    );
  }

  statements.push(
    db
      .prepare("DELETE FROM channel_assignments WHERE member_email = ?")
      .bind(email),
  );
  for (const channel of validChannels.results) {
    statements.push(
      db
        .prepare(
          `INSERT INTO channel_assignments(
            member_email, channel_id, created_at
          ) VALUES (?, ?, ?)`,
        )
        .bind(email, channel.id, now),
    );
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO team_events(
          id, member_email, actor_email, event_type, member_version,
          idempotency_key, created_at
        ) VALUES (?, ?, ?, 'MEMBER_SAVED', ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        email,
        input.actor.email,
        nextVersion,
        input.idempotencyKey,
        now,
      ),
  );

  try {
    await db.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      throw new ActionError(409, "Concurrent team update detected; reload");
    }
    throw error;
  }

  const saved = await rawMember(email);
  if (!saved) throw new ActionError(500, "Saved member could not be reloaded");
  return { member: await mapMember(saved), replayed: false };
}
