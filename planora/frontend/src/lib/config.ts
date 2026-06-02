const PRODUCTION_API_URL = "https://planora-ai.up.railway.app/api";

function isLocalUrl(value: string): boolean {
  return /(^|\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/i.test(value);
}

function normalizeApiBaseUrl(value?: string): string {
  const raw = (value || PRODUCTION_API_URL).trim().replace(/\/+$/, "");
  const safeRaw =
    process.env.NODE_ENV === "production" && isLocalUrl(raw)
      ? PRODUCTION_API_URL
      : raw;

  return safeRaw.endsWith("/api") ? safeRaw : `${safeRaw}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export function buildApiUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "").replace(/^api\/?/, "");
  return `${API_BASE_URL}/${normalizedPath}`;
}
