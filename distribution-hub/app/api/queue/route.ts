import { requestActor } from "@/lib/auth";
import { ensureDatabase, listQueue } from "@/db/control";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requestActor(request);
    await ensureDatabase();
    return Response.json({ actor, items: await listQueue() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "AUTH_REQUIRED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
