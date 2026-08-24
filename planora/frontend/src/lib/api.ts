import { getToken } from "./auth";
import { buildApiUrl } from "./config";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string | null;
};

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message =
      json?.error ||
      json?.detail ||
      json?.message ||
      (typeof json === "string" ? json : "") ||
      text ||
      "Request failed";
    throw new Error(Array.isArray(message) ? message.map((item) => item.msg).join(", ") : message);
  }

  const envelope = json as ApiEnvelope<T> | null;
  if (envelope && typeof envelope === "object" && "success" in envelope) {
    if (envelope.success === false) {
      throw new Error(envelope.error || "Request failed");
    }
    return envelope.data as T;
  }

  return json as T;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(buildApiUrl(url), {
    ...init,
    headers: {
      ...headers(),
      ...(init.headers || {}),
    },
  });
  return parseResponse<T>(res);
}

// ---------- Generic helpers ----------

export async function get<T>(url: string): Promise<T> {
  return request<T>(url);
}

export async function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function put<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function del<T>(url: string): Promise<T> {
  return request<T>(url, {
    method: "DELETE",
  });
}

// ---------- AI: Itinerary ----------

export type ItineraryDay = {
  day: number;
  title: string;
  activities: string[];
};

export type Itinerary = {
  location: string;
  days: ItineraryDay[];
};

export async function generateItinerary(data: {
  location: string;
  startDate: string;
  endDate: string;
  preferences?: string;
}): Promise<{ itinerary: Itinerary }> {
  return post<{ itinerary: Itinerary }>("/api/ai/itinerary", data);
}

// ---------- Profile ----------

export type TravelPreferences = {
  dietary?: string | null;
  hotel_tier?: string | null;
  seat_class?: string | null;
};

export type Traveler = {
  id: string;
  name: string;
  relation?: string | null;
  age?: number | null;
  dietary?: string | null;
  accessibility_needs?: string | null;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_verified: boolean;
  preferences: {
    phone?: string;
    travelers?: Traveler[];
    travel_preferences?: TravelPreferences;
    [key: string]: unknown;
  };
};

export async function getProfile(): Promise<UserProfile> {
  return get<UserProfile>("/auth/me");
}

export async function updateProfile(data: {
  name?: string;
  phone?: string;
}): Promise<UserProfile> {
  return request_patch<UserProfile>("/users/me", data);
}

export async function changePassword(data: {
  current_password: string;
  new_password: string;
}): Promise<{ changed: boolean }> {
  return put<{ changed: boolean }>("/users/me/password", data);
}

export async function updateTravelers(travelers: Traveler[]): Promise<UserProfile> {
  return put<UserProfile>("/users/me/travelers", { travelers });
}

export async function updateTravelPreferences(
  prefs: TravelPreferences
): Promise<UserProfile> {
  return put<UserProfile>("/users/me/travel-preferences", prefs);
}

async function request_patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(buildApiUrl(url), {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}
