import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createBidSchema = z.object({
  amount: z.number().min(0, "Amount must be positive"),
  message: z.string().max(500).optional(),
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

    const listing = await prisma.influencerListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const profile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });

    // Only the listing owner (influencer) can see bids
    if (!profile || profile.id !== listing.influencerProfileId) {
      return NextResponse.json(
        { error: "Only the listing owner can view bids" },
        { status: 403 }
      );
    }

    const bids = await prisma.listingBid.findMany({
      where: { listingId: id },
      orderBy: { amount: "desc" },
      include: {
        brandProfile: {
          select: {
            id: true,
            companyName: true,
            handle: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    return NextResponse.json({ bids });
  } catch (error) {
    console.error("GET /api/influencer-listings/[id]/bids error:", error);
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
        { error: "Only brands can place bids on influencer listings" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const listing = await prisma.influencerListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (listing.status !== "OPEN") {
      return NextResponse.json(
        { error: "This listing is no longer accepting bids" },
        { status: 400 }
      );
    }

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!brandProfile) {
      return NextResponse.json(
        { error: "Brand profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createBidSchema.parse(body);

    if (listing.pricingType === "FIXED") {
      if (data.amount < (listing.fixedPrice ?? 0)) {
        return NextResponse.json(
          { error: "Amount must be at least the fixed price" },
          { status: 400 }
        );
      }
    } else {
      // Auction
      const minBid = listing.startingBid ?? 0;
      const highestBid = await prisma.listingBid.findFirst({
        where: {
          listingId: id,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        orderBy: { amount: "desc" },
      });
      const minRequired = highestBid ? highestBid.amount : minBid;
      if (data.amount <= minRequired) {
        return NextResponse.json(
          {
            error: `Bid must be higher than $${minRequired.toLocaleString()}`,
          },
          { status: 400 }
        );
      }
      if (
        listing.auctionEndsAt &&
        new Date() > listing.auctionEndsAt
      ) {
        return NextResponse.json(
          { error: "This auction has ended" },
          { status: 400 }
        );
      }
    }

    const bid = await prisma.listingBid.create({
      data: {
        listingId: id,
        brandProfileId: brandProfile.id,
        amount: data.amount,
        message: data.message,
      },
      include: {
        brandProfile: {
          select: {
            id: true,
            companyName: true,
            handle: true,
          },
        },
      },
    });

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/influencer-listings/[id]/bids error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
