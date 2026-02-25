import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateBidStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: listingId, bidId } = await params;

    const listing = await prisma.influencerListing.findUnique({
      where: { id: listingId },
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
        { error: "Only the listing owner can accept or reject bids" },
        { status: 403 }
      );
    }

    const bid = await prisma.listingBid.findUnique({
      where: { id: bidId },
    });

    if (!bid || bid.listingId !== listingId) {
      return NextResponse.json(
        { error: "Bid not found for this listing" },
        { status: 404 }
      );
    }

    if (bid.status !== "PENDING") {
      return NextResponse.json(
        { error: "This bid has already been processed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = updateBidStatusSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedBid = await tx.listingBid.update({
        where: { id: bidId },
        data: { status: data.status },
      });

      if (data.status === "ACCEPTED") {
        await tx.listingBid.updateMany({
          where: {
            listingId,
            id: { not: bidId },
            status: "PENDING",
          },
          data: { status: "OUTBID" },
        });
        await tx.influencerListing.update({
          where: { id: listingId },
          data: { status: "SOLD" },
        });
      }

      return updatedBid;
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/influencer-listings/[id]/bids/[bidId] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
