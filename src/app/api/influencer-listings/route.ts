import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createListingSchema = z
  .object({
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
    const page = Math.max(1, parseInt(params.get("page") || "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(params.get("limit") || "12") || 12)
    );

    // Influencer fetching their own listings
    if (mine && session?.user?.role === "INFLUENCER") {
      const profile = await prisma.influencerProfile.findUnique({
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

      const where = { influencerProfileId: profile.id };
      const [total, listings] = await Promise.all([
        prisma.influencerListing.count({ where }),
        prisma.influencerListing.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            niches: true,
            _count: { select: { bids: true } },
          },
        }),
      ]);

      return NextResponse.json({
        listings,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    // Public browse: open influencer listings
    const andConditions: Record<string, unknown>[] = [{ status: "OPEN" }];
    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (pricingType && ["FIXED", "AUCTION"].includes(pricingType)) {
      andConditions.push({ pricingType });
    }
    if (niche) {
      const nicheRecord = await prisma.niche.findUnique({
        where: { slug: niche },
      });
      if (nicheRecord) {
        andConditions.push({ niches: { some: { id: nicheRecord.id } } });
      } else {
        return NextResponse.json({
          listings: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    }

    const where = { AND: andConditions };
    const [total, listings] = await Promise.all([
      prisma.influencerListing.count({ where }),
      prisma.influencerListing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          niches: true,
          influencerProfile: {
            select: {
              id: true,
              handle: true,
              user: { select: { name: true, avatarUrl: true } },
              socialAccounts: true,
            },
          },
          _count: { select: { bids: true } },
        },
      }),
    ]);

    return NextResponse.json({
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/influencer-listings error:", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "INFLUENCER") {
      return NextResponse.json(
        { error: "Only influencers can create sponsorship listings" },
        { status: 403 }
      );
    }

    const profile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Influencer profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createListingSchema.parse(body);

    const listing = await prisma.influencerListing.create({
      data: {
        influencerProfileId: profile.id,
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
      include: { niches: true },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/influencer-listings error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
