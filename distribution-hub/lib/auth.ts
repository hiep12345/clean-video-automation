export type RequestIdentity = {
  email: string;
  displayName: string;
  isLocal: boolean;
};

function optionalDisplayName(request: Request, email: string): string {
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get(
    "oai-authenticated-user-full-name-encoding",
  );
  if (encoded && encoding === "percent-encoded-utf-8") {
    try {
      return decodeURIComponent(encoded);
    } catch {
      // Fall through to the email-derived name.
    }
  }
  return email.split("@")[0];
}

export function requestIdentity(request: Request): RequestIdentity {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const forwarded = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  if (forwarded) {
    return {
      email: forwarded,
      displayName: optionalDisplayName(request, forwarded),
      isLocal,
    };
  }

  if (isLocal) {
    const email = "local.preview@distribution-hub";
    return { email, displayName: "Local preview", isLocal: true };
  }

  throw new Error("AUTH_REQUIRED");
}

export function requestActor(request: Request): string {
  return requestIdentity(request).email;
}
