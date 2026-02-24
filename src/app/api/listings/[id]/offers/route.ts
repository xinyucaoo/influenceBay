import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type ListingRow = {
  id: string;
  influencerProfileId: string;
  pricingType: string;
  fixedPrice: number | null;
  startingBid: number | null;
  auctionEndsAt: Date | null;
  status: string;
};

type OfferRow = {
  id: string;
  listingId: string;
  brandProfileId: string;
  amount: number;
  message: string | null;
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

const createOfferSchema = z.object({
  amount: z.number().min(0, "Amount must be positive"),
  message: z.string().max(1000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const listing = (await prisma.sponsorshipListing.findUnique({
      where: { id },
    })) as ListingRow | null;

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const influencerProfile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });

    const isOwner = influencerProfile?.id === listing.influencerProfileId;

    // Influencer sees all offers; brand sees only their own
    const offerWhere = isOwner
      ? { listingId: id }
      : { listingId: id, brandProfileId: brandProfile?.id ?? "" };

    if (!isOwner && !brandProfile) {
      return NextResponse.json({ offers: [] });
    }

    const offers = (await prisma.offer.findMany({
      where: offerWhere,
      orderBy: { createdAt: "desc" },
    })) as OfferRow[];

    if (offers.length === 0) {
      return NextResponse.json({ offers: [] });
    }

    const brandProfileIds = [...new Set(offers.map((o) => o.brandProfileId))];
    const brandProfiles = (await prisma.brandProfile.findMany({
      where: { id: { in: brandProfileIds } },
      select: {
        id: true,
        handle: true,
        companyName: true,
        logo: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    })) as BrandProfileRow[];

    const brandMap = new Map(brandProfiles.map((b) => [b.id, b]));

    const enriched = offers.map((offer) => ({
      ...offer,
      brandProfile: brandMap.get(offer.brandProfileId) ?? null,
    }));

    return NextResponse.json({ offers: enriched });
  } catch (error) {
    console.error("GET /api/listings/[id]/offers error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "BRAND") {
      return NextResponse.json(
        { error: "Only brands can make offers" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!brandProfile) {
      return NextResponse.json(
        { error: "Brand profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const listing = (await prisma.sponsorshipListing.findUnique({
      where: { id },
    })) as ListingRow | null;

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.status !== "OPEN") {
      return NextResponse.json(
        { error: "This listing is no longer accepting offers" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createOfferSchema.parse(body);

    // One pending offer per brand per listing
    const existingPending = await prisma.offer.findFirst({
      where: {
        listingId: id,
        brandProfileId: brandProfile.id,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending offer on this listing" },
        { status: 409 }
      );
    }

    if (listing.pricingType === "AUCTION") {
      if (listing.auctionEndsAt && new Date() > listing.auctionEndsAt) {
        return NextResponse.json(
          { error: "This auction has ended" },
          { status: 400 }
        );
      }

      const currentHighest = await prisma.offer.findFirst({
        where: {
          listingId: id,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        orderBy: { amount: "desc" },
      });

      const minBid = currentHighest
        ? currentHighest.amount
        : (listing.startingBid ?? 0);

      if (data.amount <= minBid) {
        return NextResponse.json(
          {
            error: `Your bid must be higher than $${minBid.toLocaleString()}`,
          },
          { status: 400 }
        );
      }

      // Mark previous highest as OUTBID
      if (currentHighest) {
        await prisma.offer.update({
          where: { id: currentHighest.id },
          data: { status: "OUTBID" },
        });
      }
    }

    const offer = await prisma.offer.create({
      data: {
        listingId: id,
        brandProfileId: brandProfile.id,
        amount: data.amount,
        message: data.message ?? null,
      },
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/listings/[id]/offers error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
