import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type RequestIdentity = {
  email: string;
  displayName: string;
  isLocal: boolean;
};

export type IngestPrincipal =
  | {
      kind: "user";
      actor: string;
      identity: RequestIdentity;
    }
  | {
      kind: "service";
      actor: string;
      serviceTokenId: string;
    };

export type AuthProvider = "cloudflare-access" | "openai-sites";

type HeaderSource = {
  get(name: string): string | null;
};

const CLOUDFLARE_EMAIL_HEADER = "cf-access-authenticated-user-email";
const CLOUDFLARE_JWT_HEADER = "cf-access-jwt-assertion";
const OPENAI_EMAIL_HEADER = "oai-authenticated-user-email";
let cachedAccessJwks:
  | {
      url: string;
      value: ReturnType<typeof createRemoteJWKSet>;
    }
  | undefined;

export function configuredAuthProvider(): AuthProvider {
  const runtime = env as unknown as {
    DISTRIBUTION_AUTH_PROVIDER?: string;
  };
  return runtime.DISTRIBUTION_AUTH_PROVIDER?.trim().toLowerCase() ===
    "cloudflare-access"
    ? "cloudflare-access"
    : "openai-sites";
}

function optionalOpenAIDisplayName(
  requestHeaders: HeaderSource,
  email: string,
): string {
  const encoded = requestHeaders.get("oai-authenticated-user-full-name");
  const encoding = requestHeaders.get(
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

function normalizedEmail(value: string | null): string | null {
  const email = value?.trim().toLowerCase();
  return email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

function cloudflareAccessConfig(): {
  audience: string;
  jwksUrl: string;
} {
  const runtime = env as unknown as {
    CF_ACCESS_AUD?: string;
    CF_ACCESS_JWKS_URL?: string;
  };
  const audience = runtime.CF_ACCESS_AUD?.trim();
  const jwksUrl = runtime.CF_ACCESS_JWKS_URL?.trim();
  if (!audience || !jwksUrl) throw new Error("AUTH_CONFIG_REQUIRED");
  return { audience, jwksUrl };
}

type VerifiedCloudflarePrincipal =
  | { kind: "user"; email: string }
  | { kind: "service"; serviceTokenId: string };

async function verifiedCloudflarePrincipal(
  requestHeaders: HeaderSource,
): Promise<VerifiedCloudflarePrincipal> {
  const headerEmail = normalizedEmail(
    requestHeaders.get(CLOUDFLARE_EMAIL_HEADER),
  );
  const assertion = requestHeaders.get(CLOUDFLARE_JWT_HEADER)?.trim();
  if (!assertion) throw new Error("AUTH_REQUIRED");

  const { audience, jwksUrl } = cloudflareAccessConfig();
  const url = new URL(jwksUrl);
  if (url.protocol !== "https:") throw new Error("AUTH_CONFIG_REQUIRED");
  if (!cachedAccessJwks || cachedAccessJwks.url !== url.href) {
    cachedAccessJwks = {
      url: url.href,
      value: createRemoteJWKSet(url),
    };
  }

  try {
    const { payload } = await jwtVerify(assertion, cachedAccessJwks.value, {
      audience,
      issuer: url.origin,
    });
    const tokenEmail = normalizedEmail(
      typeof payload.email === "string" ? payload.email : null,
    );
    if (tokenEmail) {
      if (!headerEmail || tokenEmail !== headerEmail) {
        throw new Error("Access identity does not match its signed token");
      }
      return { kind: "user", email: tokenEmail };
    }

    const serviceTokenId =
      typeof payload.common_name === "string"
        ? payload.common_name.trim()
        : "";
    if (!serviceTokenId) throw new Error("AUTH_REQUIRED");
    return { kind: "service", serviceTokenId };
  } catch {
    throw new Error("AUTH_REQUIRED");
  }
}

function configuredIngestServiceIds(): Set<string> {
  const runtime = env as unknown as {
    DISTRIBUTION_INGEST_SERVICE_IDS?: string;
  };
  return new Set(
    (runtime.DISTRIBUTION_INGEST_SERVICE_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

async function identityFromTrustedHeaders(
  requestHeaders: HeaderSource,
  isLocal: boolean,
): Promise<RequestIdentity> {
  if (isLocal) {
    const email = "local.preview@distribution-hub";
    return { email, displayName: "Local preview", isLocal: true };
  }

  const provider = configuredAuthProvider();
  const cloudflarePrincipal =
    provider === "cloudflare-access"
      ? await verifiedCloudflarePrincipal(requestHeaders)
      : null;
  if (cloudflarePrincipal?.kind === "service") {
    throw new Error("AUTH_REQUIRED");
  }
  const email =
    cloudflarePrincipal?.kind === "user"
      ? cloudflarePrincipal.email
      : normalizedEmail(requestHeaders.get(OPENAI_EMAIL_HEADER));
  if (!email) throw new Error("AUTH_REQUIRED");

  return {
    email,
    displayName:
      provider === "openai-sites"
        ? optionalOpenAIDisplayName(requestHeaders, email)
        : email.split("@")[0],
    isLocal: false,
  };
}

export async function requestIdentityFromHeaders(
  requestHeaders: HeaderSource,
  host: string | null,
): Promise<RequestIdentity> {
  const hostname = (host ?? "").split(":", 1)[0].toLowerCase();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  return identityFromTrustedHeaders(requestHeaders, isLocal);
}

export async function requestIdentity(
  request: Request,
): Promise<RequestIdentity> {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return identityFromTrustedHeaders(request.headers, isLocal);
}

export async function requestActor(request: Request): Promise<string> {
  return (await requestIdentity(request)).email;
}

export async function requestIngestPrincipal(
  request: Request,
): Promise<IngestPrincipal> {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (isLocal || configuredAuthProvider() !== "cloudflare-access") {
    const identity = await requestIdentity(request);
    return { kind: "user", actor: identity.email, identity };
  }

  const principal = await verifiedCloudflarePrincipal(request.headers);
  if (principal.kind === "user") {
    const identity: RequestIdentity = {
      email: principal.email,
      displayName: principal.email.split("@")[0],
      isLocal: false,
    };
    return { kind: "user", actor: identity.email, identity };
  }

  if (!configuredIngestServiceIds().has(principal.serviceTokenId)) {
    throw new Error("AUTH_REQUIRED");
  }
  return {
    kind: "service",
    actor: `service:${principal.serviceTokenId}`,
    serviceTokenId: principal.serviceTokenId,
  };
}
