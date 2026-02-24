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

type InfluencerRow = {
  id: string;
  userId: string;
  handle: string;
};

type ApplicationRow = {
  id: string;
  campaignId: string;
  influencerProfileId: string;
};

const applySchema = z.object({
  pitch: z.string().min(10, "Pitch must be at least 10 characters"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "INFLUENCER") {
      return NextResponse.json(
        { error: "Only influencers can apply to campaigns" },
        { status: 403 }
      );
    }

    const influencerProfile = (await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    })) as InfluencerRow | null;

    if (!influencerProfile) {
      return NextResponse.json(
        { error: "Influencer profile not found. Complete onboarding first." },
        { status: 400 }
      );
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

    if (campaign.status !== "OPEN") {
      return NextResponse.json(
        { error: "This campaign is no longer accepting applications" },
        { status: 400 }
      );
    }

    const existingApplication = (await prisma.application.findUnique({
      where: {
        campaignId_influencerProfileId: {
          campaignId: id,
          influencerProfileId: influencerProfile.id,
        },
      },
    })) as ApplicationRow | null;

    if (existingApplication) {
      return NextResponse.json(
        { error: "You have already applied to this campaign" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const data = applySchema.parse(body);

    const application = await prisma.application.create({
      data: {
        campaignId: id,
        influencerProfileId: influencerProfile.id,
        pitch: data.pitch,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/campaigns/[id]/apply error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
