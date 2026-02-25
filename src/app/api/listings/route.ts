import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type ListingRow = {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  pricingType: string;
  fixedPrice: number | null;
  startingBid: number | null;
  reservePrice: number | null;
  auctionEndsAt: Date | null;
  status: string;
  createdAt: Date;
};

type BrandProfileRow = {
  id: string;
  handle: string;
  companyName: string;
  logo: string | null;
  user: { name: string | null; avatarUrl: string | null };
};

type CampaignRow = {
  id: string;
  title: string;
  brandProfile: BrandProfileRow;
};

type NicheRow = {
  id: string;
  name: string;
  slug: string;
};

const createListingSchema = z
  .object({
    campaignId: z.string().min(1, "Campaign is required"),
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    pricingType: z.enum(["FIXED", "AUCTION"]),
    fixedPrice: z.number().min(0).optional(),
    startingBid: z.number().min(0).optional(),
    reservePrice: z.number().min(0).optional(),
    auctionEndsAt: z.string().datetime().optional(),
    nicheIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.pricingType === "FIXED") {
        return data.fixedPrice != null && data.fixedPrice >= 0;
      }
      return (
        data.startingBid != null &&
        data.startingBid >= 0 &&
        data.auctionEndsAt != null
      );
    },
    {
      message:
        "FIXED requires fixedPrice; AUCTION requires startingBid and auctionEndsAt",
    }
  );

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const params = request.nextUrl.searchParams;

    const mine = params.get("mine") === "true";
    const q = params.get("q")?.trim() || "";
    const niche = params.get("niche")?.trim() || "";
    const pricingType = params.get("pricingType")?.trim() || "";
    const minPrice = params.get("minPrice")
      ? parseFloat(params.get("minPrice")!)
      : null;
    const maxPrice = params.get("maxPrice")
      ? parseFloat(params.get("maxPrice")!)
      : null;
    const page = Math.max(1, parseInt(params.get("page") || "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(params.get("limit") || "12") || 12)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (mine && session?.user?.role === "BRAND") {
      const profile = await prisma.brandProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!profile) {
        return NextResponse.json({
          listings: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
      where.campaign = { brandProfileId: profile.id };
    } else {
      where.status = "OPEN";
    }

    const andConditions: Record<string, unknown>[] = [];
    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (pricingType && ["FIXED", "AUCTION"].includes(pricingType)) {
      where.pricingType = pricingType;
    }
    if (minPrice !== null || maxPrice !== null) {
      const priceRange: Record<string, number> = {};
      if (minPrice !== null) priceRange.gte = minPrice;
      if (maxPrice !== null) priceRange.lte = maxPrice;
      const orConditions: Record<string, unknown>[] = [];
      if (!pricingType || pricingType === "FIXED") {
        orConditions.push({ pricingType: "FIXED", fixedPrice: priceRange });
      }
      if (!pricingType || pricingType === "AUCTION") {
        orConditions.push({ pricingType: "AUCTION", startingBid: priceRange });
      }
      if (orConditions.length > 0) {
        andConditions.push({ OR: orConditions });
      }
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (niche) {
      const nicheRecord = await prisma.niche.findUnique({
        where: { slug: niche },
      });
      if (nicheRecord) {
        where.niches = { some: { id: nicheRecord.id } };
      } else {
        return NextResponse.json({
          listings: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    }

    const [total, listings] = await Promise.all([
      prisma.sponsorshipListing.count({ where }),
      prisma.sponsorshipListing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil((total as number) / limit);
    const rows = listings as ListingRow[];

    if (rows.length === 0) {
      return NextResponse.json({
        listings: [],
        total,
        page,
        totalPages,
      });
    }

    const listingIds = rows.map((l) => l.id);
    const listingsWithRelations = await prisma.sponsorshipListing.findMany({
      where: { id: { in: listingIds } },
      select: {
        id: true,
        niches: true,
        campaign: {
          select: {
            id: true,
            title: true,
            brandProfile: {
              select: {
                id: true,
                handle: true,
                companyName: true,
                logo: true,
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    const relationMap = new Map(
      listingsWithRelations.map((l) => [
        l.id,
        {
          niches: l.niches as NicheRow[],
          campaign: l.campaign as CampaignRow,
        },
      ])
    );

    const enriched = rows.map((listing) => {
      const rel = relationMap.get(listing.id);
      return {
        ...listing,
        niches: rel?.niches ?? [],
        campaign: rel?.campaign ?? null,
      };
    });

    return NextResponse.json({
      listings: enriched,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/listings error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "BRAND") {
      return NextResponse.json(
        { error: "Only brands can create sponsorship listings" },
        { status: 403 }
      );
    }

    const profile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Brand profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createListingSchema.parse(body);

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: data.campaignId,
        brandProfileId: profile.id,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found or you do not own it" },
        { status: 400 }
      );
    }

    const listing = await prisma.sponsorshipListing.create({
      data: {
        campaignId: data.campaignId,
        title: data.title,
        description: data.description,
        pricingType: data.pricingType as "FIXED" | "AUCTION",
        fixedPrice: data.pricingType === "FIXED" ? data.fixedPrice : null,
        startingBid: data.pricingType === "AUCTION" ? data.startingBid : null,
        reservePrice: data.pricingType === "AUCTION" ? data.reservePrice : null,
        auctionEndsAt:
          data.pricingType === "AUCTION" && data.auctionEndsAt
            ? new Date(data.auctionEndsAt)
            : null,
        ...(data.nicheIds && data.nicheIds.length > 0
          ? { niches: { connect: data.nicheIds.map((id) => ({ id })) } }
          : {}),
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/listings error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
