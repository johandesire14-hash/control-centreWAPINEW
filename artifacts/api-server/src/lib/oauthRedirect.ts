function getEnvironment(): "production" | "staging" | "development" {
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "staging") return "staging";
  return "development";
}

function getReplitExpoDomain(): string {
  const explicit = process.env.REPLIT_EXPO_DEV_DOMAIN ?? "";
  if (explicit) {
    return explicit.replace(/^https?:\/\//, "").split("/", 1)[0].toLowerCase();
  }

  const publicDomain = process.env.REPLIT_DEV_DOMAIN ?? "";
  const host = publicDomain.replace(/^https?:\/\//, "").split("/", 1)[0].toLowerCase();
  return host.replace(/\.archer\.replit\.dev$/, ".expo.archer.replit.dev");
}

function getConfiguredRedirects(environment: string): string[] {
  return (process.env[`MOBILE_AUTH_REDIRECT_ALLOWLIST_${environment.toUpperCase()}`] ?? process.env.MOBILE_AUTH_REDIRECT_ALLOWLIST ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function getSafeMobileRedirect(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;

  const environment = getEnvironment();
  const configured = getConfiguredRedirects(environment);
  const defaults = environment === "production"
    ? ["wapigarage://auth"]
    : ["wapigarage://auth", "exp://127.0.0.1:8081/--/auth"];
  const allowlist = new Set([...defaults, ...configured]);
  const replitExpoDomain = getReplitExpoDomain();

  try {
    const url = new URL(value);
    const normalized = value.split("?")[0].replace(/\/$/, "");
    const isAllowedReplitExpoRedirect =
      environment !== "production" &&
      url.protocol === "exp:" &&
      Boolean(replitExpoDomain) &&
      (url.hostname.toLowerCase() === replitExpoDomain || url.hostname.toLowerCase().endsWith(`.${replitExpoDomain}`)) &&
      /^\/--\//.test(url.pathname);

    if (!allowlist.has(normalized) && !isAllowedReplitExpoRedirect) return null;

    const allowedProtocols = new Set(["http:", "https:", "wapigarage:"]);
    if (environment !== "production") allowedProtocols.add("exp:");
    if (!allowedProtocols.has(url.protocol)) return null;
    return value;
  } catch {
    return null;
  }
}

export function getDefaultMobileRedirect(): string | null {
  const environment = getEnvironment();
  if (environment === "production") return "wapigarage://auth";
  const domain = getReplitExpoDomain();
  return domain ? `exp://${domain}/--/auth` : null;
}
