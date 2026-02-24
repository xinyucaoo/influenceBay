import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type CampaignRow = {
  id: string;
  brandProfileId: string;
  title: string;
  description: string;
  requirements: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  deadline: Date | null;
  status: string;
  createdAt: Date;
};

type BrandRow = {
  id: string;
  userId: string;
  handle: string;
  companyName: string;
  logo: string | null;
  website: string | null;
  industry: string | null;
};

type NicheRow = {
  id: string;
  name: string;
  slug: string;
};

const updateCampaignSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").optional(),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .optional(),
  requirements: z.string().optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  deadline: z.string().datetime().optional(),
  nicheIds: z.array(z.string()).optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = (await prisma.campaign.findUnique({
      where: { id },
    })) as CampaignRow | null;

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const [brandProfile, campaignWithNiches, applicationCount] =
      await Promise.all([
        prisma.brandProfile.findUnique({
          where: { id: campaign.brandProfileId },
        }) as Promise<BrandRow | null>,
        prisma.campaign.findUnique({
          where: { id },
          select: { niches: true },
        }) as Promise<{ niches: NicheRow[] } | null>,
        prisma.application.count({ where: { campaignId: id } }),
      ]);

    return NextResponse.json({
      ...campaign,
      brandProfile: brandProfile ?? null,
      niches: campaignWithNiches?.niches ?? [],
      applicationCount,
    });
  } catch (error) {
    console.error("GET /api/campaigns/[id] error:", error);
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

    const campaign = (await prisma.campaign.findUnique({
      where: { id },
    })) as CampaignRow | null;

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const brandProfile = (await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    })) as BrandRow | null;

    if (!brandProfile || brandProfile.id !== campaign.brandProfileId) {
      return NextResponse.json(
        { error: "You can only edit your own campaigns" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateCampaignSchema.parse(body);

    const { nicheIds, ...updateFields } = data;

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...updateFields,
        ...(updateFields.deadline
          ? { deadline: new Date(updateFields.deadline) }
          : {}),
        ...(nicheIds !== undefined
          ? { niches: { set: nicheIds.map((nid) => ({ id: nid })) } }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const campaign = (await prisma.campaign.findUnique({
      where: { id },
    })) as CampaignRow | null;

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const brandProfile = (await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    })) as BrandRow | null;

    if (!brandProfile || brandProfile.id !== campaign.brandProfileId) {
      return NextResponse.json(
        { error: "You can only delete your own campaigns" },
        { status: 403 }
      );
    }

    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
