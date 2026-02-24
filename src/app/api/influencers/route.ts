import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type InfluencerRow = {
  id: string;
  userId: string;
  handle: string;
  bio: string | null;
  pricing: unknown;
  portfolioLinks: string[];
  profileViews: number;
  isPublic: boolean;
  createdAt: Date;
};

function getLowestPrice(pricing: unknown): number {
  if (!pricing || typeof pricing !== "object") return Infinity;
  const p = pricing as Record<string, unknown>;
  const values = [p.dedicatedVideo, p.integration, p.socialPost].filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  return values.length > 0 ? Math.min(...values) : Infinity;
}

function matchesPriceRange(
  pricing: unknown,
  min?: number,
  max?: number
): boolean {
  if (!pricing || typeof pricing !== "object") return false;
  const p = pricing as Record<string, unknown>;
  const values = [p.dedicatedVideo, p.integration, p.socialPost].filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  if (values.length === 0) return false;
  if (min !== undefined && Math.max(...values) < min) return false;
  if (max !== undefined && Math.min(...values) > max) return false;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const q = params.get("q")?.trim() || "";
    const nicheSlug = params.get("niche") || "";
    const platform = params.get("platform") || "";
    const minPrice = Number(params.get("minPrice")) || undefined;
    const maxPrice = Number(params.get("maxPrice")) || undefined;
    const sort = params.get("sort") || "recent";
    const page = Math.max(1, parseInt(params.get("page") || "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(params.get("limit") || "12") || 12)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isPublic: true };

    if (q) {
      where.OR = [
        { handle: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } },
      ];
    }

    if (nicheSlug) {
      where.niches = { some: { slug: nicheSlug } };
    }

    if (platform) {
      where.socialAccounts = { some: { platform } };
    }

    const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;
    const needsAppSort = sort === "followers" || sort === "price";

    let profiles: InfluencerRow[];
    let total: number;

    if (hasPriceFilter || needsAppSort) {
      let all = (await prisma.influencerProfile.findMany({
        where,
      })) as InfluencerRow[];

      if (hasPriceFilter) {
        all = all.filter((p) => matchesPriceRange(p.pricing, minPrice, maxPrice));
      }

      total = all.length;

      if (sort === "followers") {
        const ids = all.map((p) => p.id);
        const allSocials = (await prisma.socialAccount.findMany({
          where: { influencerProfileId: { in: ids } },
        })) as Array<{ influencerProfileId: string; followerCount: number }>;
        const sumMap = new Map<string, number>();
        for (const sa of allSocials) {
          sumMap.set(
            sa.influencerProfileId,
            (sumMap.get(sa.influencerProfileId) || 0) + sa.followerCount
          );
        }
        all.sort(
          (a, b) => (sumMap.get(b.id) || 0) - (sumMap.get(a.id) || 0)
        );
      } else if (sort === "price") {
        all.sort(
          (a, b) => getLowestPrice(a.pricing) - getLowestPrice(b.pricing)
        );
      } else {
        all.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      profiles = all.slice((page - 1) * limit, page * limit);
    } else {
      const [count, rows] = await Promise.all([
        prisma.influencerProfile.count({ where }),
        prisma.influencerProfile.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      total = count as number;
      profiles = rows as InfluencerRow[];
    }

    const totalPages = Math.ceil(total / limit);

    if (profiles.length === 0) {
      return NextResponse.json({ influencers: [], total, page, totalPages });
    }

    const profileIds = profiles.map((p) => p.id);
    const userIds = profiles.map((p) => p.userId);

    const [users, socialAccounts, nichesByProfile] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatarUrl: true },
      }),
      prisma.socialAccount.findMany({
        where: { influencerProfileId: { in: profileIds } },
      }),
      Promise.all(
        profileIds.map((id) =>
          prisma.niche.findMany({
            where: { influencers: { some: { id } } },
          })
        )
      ),
    ]);

    type UserRow = { id: string; name: string | null; avatarUrl: string | null };
    type SocialRow = {
      id: string;
      influencerProfileId: string;
      platform: string;
      handle: string;
      followerCount: number;
      profileUrl: string | null;
    };

    const userMap = new Map(
      (users as UserRow[]).map((u) => [u.id, u])
    );

    const socialMap = new Map<string, SocialRow[]>();
    for (const sa of socialAccounts as SocialRow[]) {
      const list = socialMap.get(sa.influencerProfileId) || [];
      list.push(sa);
      socialMap.set(sa.influencerProfileId, list);
    }

    const influencers = profiles.map((profile, i) => ({
      ...profile,
      user: userMap.get(profile.userId) ?? null,
      socialAccounts: socialMap.get(profile.id) ?? [],
      niches: nichesByProfile[i] ?? [],
    }));

    return NextResponse.json({ influencers, total, page, totalPages });
  } catch (error) {
    console.error("GET /api/influencers error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
