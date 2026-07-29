import { ensureDatabase } from "@/db/control";
import { ingestFacebookAnalyticsAliases } from "@/db/receipts";
import { requestIngestPrincipal } from "@/lib/auth";
import { ActionError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const principal = await requestIngestPrincipal(request);
    if (principal.kind === "user" && !principal.identity.isLocal) {
      throw new ActionError(
        403,
        "Analytics alias ingest requires a dedicated Cloudflare Access service token",
      );
    }
    await ensureDatabase();
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > 256 * 1024) {
      throw new ActionError(413, "Analytics alias payload exceeds 256 KiB");
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 256 * 1024) {
      throw new ActionError(413, "Analytics alias payload exceeds 256 KiB");
    }
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new ActionError(400, "Analytics alias payload must be valid JSON");
    }
    const headerKey = request.headers.get("idempotency-key")?.trim();
    const bodyKey =
      payload && typeof payload === "object"
        ? (payload as { idempotencyKey?: unknown }).idempotencyKey
        : null;
    if (!headerKey || headerKey !== bodyKey) {
      throw new ActionError(
        400,
        "Idempotency-Key header must match payload.idempotencyKey",
      );
    }
    return Response.json(
      await ingestFacebookAnalyticsAliases(payload, principal.actor),
    );
  } catch (error) {
    if (error instanceof ActionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Unexpected alias ingest error";
    return Response.json(
      { error: message },
      { status: message === "AUTH_REQUIRED" ? 401 : 500 },
    );
  }
}
