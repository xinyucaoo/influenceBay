import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DIRECT_DATABASE_URL must be set");
}

// Seed requires direct Postgres URL (not Prisma Accelerate)
if (
  databaseUrl.startsWith("prisma+postgres://") ||
  databaseUrl.startsWith("prisma://")
) {
  throw new Error(
    "Seeding requires DIRECT_DATABASE_URL with a direct Postgres connection"
  );
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const niches = [
  "Tech",
  "Beauty",
  "Gaming",
  "Fitness",
  "Food",
  "Travel",
  "Fashion",
  "Music",
  "Photography",
  "Art",
  "Education",
  "Finance",
  "Health",
  "Lifestyle",
  "Sports",
  "Entertainment",
  "DIY",
  "Pets",
  "Parenting",
  "Automotive",
];

async function main() {
  for (const name of niches) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.niche.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }
  console.log(`Seeded ${niches.length} niches`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
