import { buildApiUrl } from "./config";

const TOKEN_KEY = "planora_token";

export function setToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function getCurrentUser(): Promise<{ id: string; name: string; email: string } | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(buildApiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    const data = await res.json();
    return data?.data ?? data?.user ?? null;
  } catch {
    return null;
  }
}
