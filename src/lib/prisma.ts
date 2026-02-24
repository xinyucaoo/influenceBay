import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl =
    process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DIRECT_DATABASE_URL must be set");
  }

  if (
    databaseUrl.startsWith("prisma+postgres://") ||
    databaseUrl.startsWith("prisma://")
  ) {
    const { withAccelerate } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@prisma/extension-accelerate") as typeof import("@prisma/extension-accelerate");
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    }).$extends(withAccelerate()) as unknown as PrismaClient;
  }

  // prisma dev (port 51214) only supports 1 connection; Docker/standalone Postgres supports more
  const isPrismaDev = databaseUrl.includes("51214");
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: isPrismaDev ? 1 : 10,
    idleTimeoutMillis: isPrismaDev ? 1 : 10000,
    connectionTimeoutMillis: 10000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
