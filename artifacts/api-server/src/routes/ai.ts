import { Router, type Request, type Response } from "express";
import { generateItinerary } from "../services/ai.service";
import prisma from "../../../../lib/db/src/index";

const router = Router();

/**
 * Helper: extract user ID from Bearer token (same pattern as trips.ts)
 */
function getUserFromHeader(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  try {
    const token = auth.split(" ")[1];
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * POST /api/ai/itinerary
 *
 * Calls the Gemini AI service to generate a structured day-by-day
 * travel itinerary and returns it as JSON.
 *
 * Body: { location: string, startDate: string, endDate: string, preferences?: string }
 */
router.post("/itinerary", async (req: Request, res: Response): Promise<void> => {
  const { trip_id, location, startDate, endDate, preferences } = req.body ?? {};

  // ── Input validation ────────────────────────────────────────────────────
  if (!location || !startDate || !endDate) {
    res.status(400).json({
      error: "location, startDate, and endDate are required",
    });
    return;
  }

  // ── Call AI service ─────────────────────────────────────────────────────
  try {
    const itinerary = await generateItinerary({
      location: String(location),
      startDate: String(startDate),
      endDate: String(endDate),
      preferences: preferences !== undefined ? String(preferences) : undefined,
    });
    // Save to DB — round-trip through JSON to satisfy Prisma's InputJsonValue type
    if (trip_id && typeof trip_id === "string") {
      await prisma.trip.update({
        where: { id: trip_id },
        data: {
          itinerary: JSON.parse(JSON.stringify(itinerary)),
        },
      });
    }
    res.json({ itinerary });
  }

  catch (err: unknown) {
    console.error("[ai route] generateItinerary failed:", {
      status: (err as any)?.status,
      message: (err as any)?.message,
    });

    const status = (err as { status?: number })?.status;
    // Handle rate limit
    if (status === 429) {
      res.status(429).json({
        error: "AI rate limit reached. Please try again in a moment.",
      });
      return;
    }

    // Handle Gemini Overload (503)
    if (status === 503) {
      res.status(200).json({
        itinerary: {
          location,
          days: [
            {
              day: 1,
              title: "Welcome & Exploration",
              activities: [
                "Check in to your accommodation",
                "Explore nearby areas",
                "Try local cuisine",
                "Relax and prepare for the trip"
              ]
            },
            {
              day: 2,
              title: "Local Highlights",
              activities: [
                "Visit top attractions",
                "Enjoy a local experience",
                "Capture photos and explore markets",
                "Evening leisure time"
              ]
            }
          ],
          notes: "AI is busy right now. Showing a basic plan. You can regenerate shortly."
        },
        fallback: true
      });
      return;
    }
    res.status(500).json({
      error: "Failed to generate itinerary"
    });
  }
});
export default router;
