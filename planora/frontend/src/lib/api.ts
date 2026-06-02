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
