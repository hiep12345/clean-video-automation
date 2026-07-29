import { requestIdentity } from "@/lib/auth";
import { ActionError } from "@/lib/errors";
import { applyJobAction, ensureDatabase } from "@/db/control";
import { resolveMembership } from "@/db/team";
import type { JobAction } from "@/lib/types";

export const dynamic = "force-dynamic";

type ActionPayload = {
  jobId?: string;
  action?: JobAction;
  expectedVersion?: number;
  idempotencyKey?: string;
  scheduledAt?: string;
  externalUrl?: string;
  blockedReason?: string;
};

export async function POST(request: Request) {
  try {
    const identity = requestIdentity(request);
    const payload = (await request.json()) as ActionPayload;
    const supported = new Set<JobAction>([
      "claim",
      "release",
      "schedule",
      "upload",
      "block",
      "unblock",
    ]);
    if (!payload.action || !supported.has(payload.action)) {
      throw new ActionError(400, "Unsupported action");
    }
    if (typeof payload.expectedVersion !== "number") {
      throw new ActionError(400, "expectedVersion is required");
    }

    await ensureDatabase();
    const member = await resolveMembership(identity);
    const result = await applyJobAction({
      jobId: payload.jobId ?? "",
      action: payload.action,
      expectedVersion: payload.expectedVersion,
      idempotencyKey: payload.idempotencyKey ?? "",
      actor: member.email,
      member,
      scheduledAt: payload.scheduledAt,
      externalUrl: payload.externalUrl,
      blockedReason: payload.blockedReason,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof ActionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "AUTH_REQUIRED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
