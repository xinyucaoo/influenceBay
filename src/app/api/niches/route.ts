import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const niches = await prisma.niche.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(niches);
}
