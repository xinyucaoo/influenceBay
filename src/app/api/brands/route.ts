import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type BrandRow = {
  id: string;
  userId: string;
  handle: string;
  companyName: string;
  logo: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const q = params.get("q")?.trim() || "";
    const industry = params.get("industry")?.trim() || "";
    const page = Math.max(1, parseInt(params.get("page") || "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(params.get("limit") || "12") || 12)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (q) {
      where.OR = [
        { companyName: { contains: q, mode: "insensitive" } },
        { handle: { contains: q, mode: "insensitive" } },
      ];
    }

    if (industry) {
      where.industry = { equals: industry, mode: "insensitive" };
    }

    const [total, brandProfiles] = await Promise.all([
      prisma.brandProfile.count({ where }),
      prisma.brandProfile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil((total as number) / limit);

    const profiles = brandProfiles as BrandRow[];

    if (profiles.length === 0) {
      return NextResponse.json({
        brands: [],
        total,
        page,
        totalPages,
      });
    }

    const userIds = profiles.map((b) => b.userId);

    const users = (await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true },
    })) as Array<{ id: string; name: string | null; avatarUrl: string | null }>;

    const userMap = new Map(users.map((u) => [u.id, u]));

    const brands = profiles.map((brand) => ({
      ...brand,
      user: userMap.get(brand.userId) ?? null,
    }));

    return NextResponse.json({ brands, total, page, totalPages });
  } catch (error) {
    console.error("GET /api/brands error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
