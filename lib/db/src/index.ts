import { PrismaPg } from "@prisma/adapter-pg";
import prismaClientPkg from "@prisma/client";

const PrismaClient =
  (prismaClientPkg as any).PrismaClient ??
  (prismaClientPkg as any)?.default?.PrismaClient;

if (!PrismaClient) {
  throw new Error("Could not find PrismaClient export in @prisma/client");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set (missing env var).");
}

const adapter = new PrismaPg({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const prisma = new PrismaClient({ adapter });

export default prisma;