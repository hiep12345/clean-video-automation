import { requestIdentity } from "@/lib/auth";
import { ActionError } from "@/lib/errors";
import { ensureDatabase, listQueue } from "@/db/control";
import { resolveMembership } from "@/db/team";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const identity = requestIdentity(request);
    await ensureDatabase();
    const membership = await resolveMembership(identity);
    return Response.json({
      actor: membership.email,
      membership,
      items: await listQueue(membership),
    });
  } catch (error) {
    if (error instanceof ActionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "AUTH_REQUIRED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
