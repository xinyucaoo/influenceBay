import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateListingSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  status: z.enum(["OPEN", "CLOSED", "SOLD"]).optional(),
  fixedPrice: z.number().min(0).optional(),
  startingBid: z.number().min(0).optional(),
  reservePrice: z.number().min(0).optional(),
  auctionEndsAt: z.string().datetime().optional(),
  nicheIds: z.array(z.string()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const listing = await prisma.influencerListing.findUnique({
      where: { id },
      include: {
        niches: true,
        influencerProfile: {
          select: {
            id: true,
            handle: true,
            bio: true,
            user: { select: { name: true, avatarUrl: true } },
            socialAccounts: true,
          },
        },
        _count: { select: { bids: true } },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const highestBid =
      listing.pricingType === "AUCTION"
        ? await prisma.listingBid.findFirst({
            where: {
              listingId: id,
              status: { in: ["PENDING", "ACCEPTED"] },
            },
            orderBy: { amount: "desc" },
          })
        : null;

    return NextResponse.json({
      ...listing,
      highestBid: highestBid?.amount ?? null,
    });
  } catch (error) {
    console.error("GET /api/influencer-listings/[id] error:", error);
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

    if (!profile || profile.id !== listing.influencerProfileId) {
      return NextResponse.json(
        { error: "You can only edit your own listings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateListingSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.title != null) updateData.title = data.title;
    if (data.description != null) updateData.description = data.description;
    if (data.status != null) updateData.status = data.status;

    if (listing.status === "OPEN") {
      if (data.fixedPrice != null) updateData.fixedPrice = data.fixedPrice;
      if (data.startingBid != null) updateData.startingBid = data.startingBid;
      if (data.reservePrice != null) updateData.reservePrice = data.reservePrice;
      if (data.auctionEndsAt != null)
        updateData.auctionEndsAt = new Date(data.auctionEndsAt);
      if (data.nicheIds != null) {
        updateData.niches = {
          set: data.nicheIds.map((nid) => ({ id: nid })),
        };
      }
    }

    const updated = await prisma.influencerListing.update({
      where: { id },
      data: updateData,
      include: { niches: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/influencer-listings/[id] error:", error);
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

    if (!profile || profile.id !== listing.influencerProfileId) {
      return NextResponse.json(
        { error: "You can only delete your own listings" },
        { status: 403 }
      );
    }

    await prisma.influencerListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/influencer-listings/[id] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
