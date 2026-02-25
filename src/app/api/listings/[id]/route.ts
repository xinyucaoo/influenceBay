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
  user: { id: string; name: string | null; avatarUrl: string | null };
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

    const [campaign, niches, offerCount, highestBid] =
      await Promise.all([
        prisma.campaign.findUnique({
          where: { id: listing.campaignId },
          select: {
            id: true,
            title: true,
            brandProfile: {
              select: {
                id: true,
                handle: true,
                companyName: true,
                logo: true,
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        }),
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
      campaign: campaign ?? null,
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

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });

    const campaign = await prisma.campaign.findFirst({
      where: { id: listing.campaignId, brandProfileId: brandProfile?.id ?? "" },
    });

    if (!brandProfile || !campaign) {
      return NextResponse.json(
        { error: "You can only edit listings in your campaigns" },
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

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });

    const campaign = await prisma.campaign.findFirst({
      where: { id: listing.campaignId, brandProfileId: brandProfile?.id ?? "" },
    });

    if (!brandProfile || !campaign) {
      return NextResponse.json(
        { error: "You can only delete listings in your campaigns" },
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
