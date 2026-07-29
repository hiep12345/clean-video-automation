import { ensureDatabase } from "@/db/control";
import { ingestContentBatch } from "@/db/ingest";
import { requestIngestPrincipal } from "@/lib/auth";
import { ActionError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const principal = await requestIngestPrincipal(request);
    if (principal.kind === "user" && !principal.identity.isLocal) {
      throw new ActionError(
        403,
        "Automated ingest requires a dedicated Cloudflare Access service token",
      );
    }
    await ensureDatabase();
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > 512 * 1024) {
      throw new ActionError(413, "Ingest payload exceeds 512 KiB");
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 512 * 1024) {
      throw new ActionError(413, "Ingest payload exceeds 512 KiB");
    }
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new ActionError(400, "Ingest payload must be valid JSON");
    }
    const headerKey = request.headers.get("idempotency-key")?.trim();
    if (!headerKey) {
      throw new ActionError(400, "Idempotency-Key header is required");
    }
    const bodyKey =
      payload && typeof payload === "object"
        ? (payload as { idempotencyKey?: unknown }).idempotencyKey
        : null;
    if (headerKey !== bodyKey) {
      throw new ActionError(
        400,
        "Idempotency-Key header must match payload.idempotencyKey",
      );
    }
    return Response.json(
      await ingestContentBatch(payload, principal.actor),
    );
  } catch (error) {
    if (error instanceof ActionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Unexpected ingest error";
    const status = message === "AUTH_REQUIRED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
