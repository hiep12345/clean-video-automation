export function requestActor(request: Request): string {
  const forwarded = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  if (forwarded) return forwarded;

  const url = new URL(request.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return "local.preview@distribution-hub";
  }

  throw new Error("AUTH_REQUIRED");
}
