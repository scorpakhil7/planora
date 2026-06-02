import { Router, Request, Response } from "express";
import prisma from "../../../../lib/db/src/index";

const router = Router();

/**
 * Helper: Extract user from token
 */
function getUserFromHeader(req: Request) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;

  try {
    const token = auth.split(" ")[1];
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );
    return payload?.sub || null;
  } catch {
    return null;
  }
}

/**
 * CREATE TRIP
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserFromHeader(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Accept snake_case fields matching what the frontend sends
  const { title, start_date, end_date, destinations } = req.body ?? {};

  // Derive a location string from the first destination city for storage
  const location =
    Array.isArray(destinations) && destinations.length > 0
      ? destinations.map((d: { city: string }) => d.city).join(", ")
      : undefined;

  if (!title || !start_date || !end_date) {
    res.status(400).json({ error: "Missing required fields: title, start_date, end_date" });
    return;
  }

  try {
    const trip = await prisma.trip.create({
      data: {
        title,
        location: location ?? "",
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        userId,
      },
    });

    res.status(201).json(trip);
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to create trip" });
    return;
  }
});

/**
 * GET ALL TRIPS
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserFromHeader(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const trips = await prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(trips);
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trips" });
    return;
  }
});

/**
 * GET SINGLE TRIP
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserFromHeader(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = String(req.params["id"]);

  try {
    const trip = await prisma.trip.findUnique({ where: { id } });

    if (!trip || trip.userId !== userId) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    res.json(trip);
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trip" });
    return;
  }
});

/**
 * UPDATE TRIP
 */
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserFromHeader(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = String(req.params["id"]);
  const { title, location, start_date, end_date } = req.body ?? {};

  if (!title || !start_date || !end_date) {
    res.status(400).json({ error: "Missing required fields: title, start_date, end_date" });
    return;
  }

  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    res.status(400).json({ error: "Invalid trip dates" });
    return;
  }

  if (startDate > endDate) {
    res.status(400).json({ error: "Start date cannot be after end date" });
    return;
  }

  try {
    const trip = await prisma.trip.findUnique({ where: { id } });

    if (!trip || trip.userId !== userId) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    const updated = await prisma.trip.update({
      where: { id },
      data: {
        title: String(title).trim(),
        location: typeof location === "string" ? location.trim() : trip.location,
        startDate,
        endDate,
      },
    });

    res.json(updated);
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to update trip" });
    return;
  }
});

/**
 * DELETE TRIP
 */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserFromHeader(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = String(req.params["id"]);

  try {
    const trip = await prisma.trip.findUnique({ where: { id } });

    if (!trip || trip.userId !== userId) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    await prisma.trip.delete({ where: { id } });

    res.json({ success: true });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trip" });
    return;
  }
});

export default router;
