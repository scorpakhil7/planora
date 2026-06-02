import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

// ── Client singleton ────────────────────────────────────────────────────────

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (_client) return _client;

  const apiKey = process.env["GEMINI_API_KEY"];

  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "GEMINI_API_KEY environment variable is required but was not provided."
    );
  }

  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

// ── Model accessor ──────────────────────────────────────────────────────────

/**
 * Returns a configured Gemini model instance.
 *
 * FIX: `gemini-pro` was removed from the v1beta API.
 *      Use `gemini-1.5-pro` which is the current stable model.
 */
export function getGeminiModel(): GenerativeModel {
  return getClient().getGenerativeModel({ model: "gemini-2.5-flash" });
}

// ── JSON extraction helper ──────────────────────────────────────────────────

/**
 * Gemini sometimes wraps JSON in markdown code fences (```json ... ```).
 * This strips them and returns only the raw JSON string.
 * Throws if no JSON object or array is found in the response.
 */
function extractJSON(raw: string): string {
  // Strip ```json ... ``` or ``` ... ``` wrappers
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // Fall back: find the first { ... } or [ ... ] block
  const objectMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objectMatch?.[1]) return objectMatch[1].trim();

  throw new Error(`No JSON found in AI response. Raw output:\n${raw}`);
}

// ── Main service function ───────────────────────────────────────────────────

export async function generateItinerary(input: {
  location: string;
  startDate: string;
  endDate: string;
  preferences?: string;
}): Promise<unknown> {
  const model = getGeminiModel();

  const prompt = `
You are a professional travel planner AI.

Generate a detailed travel itinerary in STRICT JSON format.

Rules:
- Output ONLY valid JSON — no markdown, no explanation, no text outside the JSON block
- Follow the exact schema below exactly

Schema:
{
  "location": string,
  "days": [
    {
      "day": number,
      "title": string,
      "activities": string[]
    }
  ]
}

Trip Details:
Location: ${input.location}
Start Date: ${input.startDate}
End Date: ${input.endDate}
Preferences: ${input.preferences ?? "general tourism"}

Requirements:
- One entry per day between start and end date
- 3 to 5 realistic, specific activities per day
- Titles should reflect the theme of each day
`;

  const result = await model.generateContent(prompt);
  const rawText = result.response.text();

  console.log("[ai.service] raw Gemini output:\n", rawText);

  const jsonString = extractJSON(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (parseErr) {
    throw new Error(
      `Failed to parse Gemini JSON response. Extracted string:\n${jsonString}`
    );
  }

  return parsed;
}