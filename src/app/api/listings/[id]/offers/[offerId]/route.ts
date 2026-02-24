import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type ListingRow = {
  id: string;
  influencerProfileId: string;
  status: string;
};

type OfferRow = {
  id: string;
  listingId: string;
  brandProfileId: string;
  status: string;
};

const updateOfferStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: listingId, offerId } = await params;

    const listing = (await prisma.sponsorshipListing.findUnique({
      where: { id: listingId },
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

    if (!influencerProfile || influencerProfile.id !== listing.influencerProfileId) {
      return NextResponse.json(
        { error: "Only the listing owner can accept or reject offers" },
        { status: 403 }
      );
    }

    const offer = (await prisma.offer.findUnique({
      where: { id: offerId },
    })) as OfferRow | null;

    if (!offer || offer.listingId !== listingId) {
      return NextResponse.json(
        { error: "Offer not found for this listing" },
        { status: 404 }
      );
    }

    if (offer.status !== "PENDING") {
      return NextResponse.json(
        { error: "This offer has already been processed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = updateOfferStatusSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOffer = await tx.offer.update({
        where: { id: offerId },
        data: { status: data.status },
      });

      if (data.status === "ACCEPTED") {
        await tx.offer.updateMany({
          where: {
            listingId,
            id: { not: offerId },
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        });
        await tx.sponsorshipListing.update({
          where: { id: listingId },
          data: { status: "SOLD" },
        });
      }

      return updatedOffer;
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/listings/[id]/offers/[offerId] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
