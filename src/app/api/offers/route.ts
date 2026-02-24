import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OfferRow = {
  id: string;
  listingId: string;
  brandProfileId: string;
  amount: number;
  message: string | null;
  status: string;
  createdAt: Date;
};

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const influencerProfile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!influencerProfile && !brandProfile) {
      return NextResponse.json({ offers: [] });
    }

    const offerWhere =
      session.user.role === "INFLUENCER" && influencerProfile
        ? { listing: { influencerProfileId: influencerProfile.id } }
        : brandProfile
          ? { brandProfileId: brandProfile.id }
          : { id: "impossible" };

    const offers = (await prisma.offer.findMany({
      where: offerWhere,
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            status: true,
            pricingType: true,
            fixedPrice: true,
            startingBid: true,
            influencerProfile: {
              select: {
                handle: true,
                user: { select: { name: true } },
              },
            },
          },
        },
        brandProfile: {
          select: {
            id: true,
            companyName: true,
            handle: true,
            user: { select: { name: true } },
          },
        },
      },
    })) as (OfferRow & {
      listing: {
        id: string;
        title: string;
        status: string;
        pricingType: string;
        fixedPrice: number | null;
        startingBid: number | null;
        influencerProfile: { handle: string; user: { name: string | null } };
      };
      brandProfile: {
        id: string;
        companyName: string;
        handle: string;
        user: { name: string | null };
      };
    })[];

    return NextResponse.json({ offers });
  } catch (error) {
    console.error("GET /api/offers error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
