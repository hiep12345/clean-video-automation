import { requestIdentity } from "@/lib/auth";
import { ActionError } from "@/lib/errors";
import { ensureDatabase } from "@/db/control";
import {
  linkPublicationAlias,
  listMappingReview,
} from "@/db/receipts";
import { resolveMembership } from "@/db/team";
import type { PublicationAliasNamespace } from "@/lib/types";

export const dynamic = "force-dynamic";

type LinkAliasPayload = {
  receiptId?: string;
  namespace?: PublicationAliasNamespace;
  externalId?: string;
  permalink?: string;
  idempotencyKey?: string;
};

function errorResponse(error: unknown): Response {
  if (error instanceof ActionError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json(
    { error: message },
    { status: message === "AUTH_REQUIRED" ? 401 : 500 },
  );
}

export async function GET(request: Request) {
  try {
    const identity = await requestIdentity(request);
    await ensureDatabase();
    const member = await resolveMembership(identity);
    return Response.json({ items: await listMappingReview(member) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requestIdentity(request);
    const payload = (await request.json()) as LinkAliasPayload;
    if (
      !payload.receiptId ||
      !payload.namespace ||
      !payload.externalId ||
      !payload.idempotencyKey
    ) {
      throw new ActionError(
        400,
        "receiptId, namespace, externalId and idempotencyKey are required",
      );
    }
    await ensureDatabase();
    const member = await resolveMembership(identity);
    return Response.json(
      await linkPublicationAlias({
        member,
        receiptId: payload.receiptId,
        namespace: payload.namespace,
        externalId: payload.externalId,
        permalink: payload.permalink,
        idempotencyKey: payload.idempotencyKey,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
