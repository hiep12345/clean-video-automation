import { ensureDatabase } from "@/db/control";
import { listTeam, resolveMembership, saveTeamMember } from "@/db/team";
import { requestIdentity } from "@/lib/auth";
import { ActionError } from "@/lib/errors";
import type { TeamRole } from "@/lib/types";

export const dynamic = "force-dynamic";

type TeamPayload = {
  action?: "save";
  email?: string;
  displayName?: string;
  role?: TeamRole;
  active?: boolean;
  channelCodes?: string[];
  expectedVersion?: number;
  idempotencyKey?: string;
};

function errorResponse(error: unknown): Response {
  if (error instanceof ActionError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = message === "AUTH_REQUIRED" ? 401 : 500;
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const identity = await requestIdentity(request);
    await ensureDatabase();
    const actor = await resolveMembership(identity);
    return Response.json(await listTeam(actor));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requestIdentity(request);
    const payload = (await request.json()) as TeamPayload;
    if (payload.action !== "save") {
      throw new ActionError(400, "Unsupported team action");
    }
    if (!payload.role || typeof payload.expectedVersion !== "number") {
      throw new ActionError(400, "role and expectedVersion are required");
    }

    await ensureDatabase();
    const actor = await resolveMembership(identity);
    return Response.json(
      await saveTeamMember({
        actor,
        email: payload.email ?? "",
        displayName: payload.displayName,
        role: payload.role,
        active: payload.active ?? true,
        channelCodes: payload.channelCodes ?? [],
        expectedVersion: payload.expectedVersion,
        idempotencyKey: payload.idempotencyKey ?? "",
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
