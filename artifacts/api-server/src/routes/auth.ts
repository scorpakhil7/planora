import { Router, type Request, type Response } from "express";
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import prisma from "../../../../lib/db/src/index";

const router = Router();

const SECRET = process.env.SESSION_SECRET || "planora-dev-secret";

function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;

    const expectedSig = createHmac("sha256", SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    const exp = Buffer.from(expectedSig);
    const act = Buffer.from(sig);

    if (exp.length !== act.length || !timingSafeEqual(exp, act)) return null;

    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch (err) {
    return null;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const newHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(newHash, "hex"));
}

function getTokenFromHeader(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

/* ================= SIGNUP ================= */

router.post("/auth/signup", async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashPassword(password),
        name: typeof name === "string" ? name : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const access_token = signToken({ sub: user.id, email: user.email });

    res.status(201).json({
      access_token,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
    return;
  }
});

/* ================= LOGIN ================= */

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
      },
    });

    if (!user || !verifyPassword(password, user.password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const access_token = signToken({ sub: user.id, email: user.email });

    res.json({
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
      },
    });
  } catch {
    res.status(500).json({ error: "Login failed" });
    return;
  }
});

/* ================= ME ================= */

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  const token = getTokenFromHeader(req);

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const payload = verifyToken(token);

  if (!payload || typeof payload.sub !== "string") {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
    return;
  }
});

export default router;