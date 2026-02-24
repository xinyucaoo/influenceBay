import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const TCP_URL =
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

const adapter = new PrismaPg({ connectionString: TCP_URL });
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
