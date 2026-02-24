import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type ListingRow = {
  id: string;
  influencerProfileId: string;
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

type InfluencerProfileRow = {
  id: string;
  handle: string;
  bio: string | null;
  user: { name: string | null; avatarUrl: string | null };
  socialAccounts: { platform: string; handle: string; followerCount: number }[];
};

type NicheRow = {
  id: string;
  name: string;
  slug: string;
};

const updateListingSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  status: z.enum(["OPEN", "CLOSED", "SOLD"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const [influencerProfile, niches, offerCount, highestBid] =
      await Promise.all([
        prisma.influencerProfile.findUnique({
          where: { id: listing.influencerProfileId },
          select: {
            id: true,
            handle: true,
            bio: true,
            user: { select: { name: true, avatarUrl: true } },
            socialAccounts: {
              select: { platform: true, handle: true, followerCount: true },
            },
          },
        }) as Promise<InfluencerProfileRow | null>,
        prisma.niche.findMany({
          where: { listings: { some: { id } } },
        }) as Promise<NicheRow[]>,
        prisma.offer.count({ where: { listingId: id } }),
        listing.pricingType === "AUCTION"
          ? prisma.offer
              .findFirst({
                where: {
                  listingId: id,
                  status: { in: ["PENDING", "ACCEPTED"] },
                },
                orderBy: { amount: "desc" },
              })
              .then((o) => o?.amount ?? null)
          : Promise.resolve(null),
      ]);

    return NextResponse.json({
      ...listing,
      influencerProfile: influencerProfile ?? null,
      niches,
      offerCount,
      highestBid,
    });
  } catch (error) {
    console.error("GET /api/listings/[id] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
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

    const profile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile || profile.id !== listing.influencerProfileId) {
      return NextResponse.json(
        { error: "You can only edit your own listings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateListingSchema.parse(body);

    const updated = await prisma.sponsorshipListing.update({
      where: { id },
      data: data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/listings/[id] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const profile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile || profile.id !== listing.influencerProfileId) {
      return NextResponse.json(
        { error: "You can only delete your own listings" },
        { status: 403 }
      );
    }

    await prisma.sponsorshipListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/listings/[id] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
