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

type ApplicationRow = {
  id: string;
  campaignId: string;
  influencerProfileId: string;
  pitch: string;
  status: string;
  createdAt: Date;
};

type InfluencerProfileRow = {
  id: string;
  userId: string;
  handle: string;
  bio: string | null;
  isPublic: boolean;
};

const updateStatusSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export async function GET(
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
        { error: "Only the campaign owner can view applications" },
        { status: 403 }
      );
    }

    const applications = (await prisma.application.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "desc" },
    })) as ApplicationRow[];

    if (applications.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    const influencerProfileIds = [
      ...new Set(applications.map((a) => a.influencerProfileId)),
    ];

    const influencerProfiles = (await prisma.influencerProfile.findMany({
      where: { id: { in: influencerProfileIds } },
    })) as InfluencerProfileRow[];

    const profileMap = new Map(
      influencerProfiles.map((p) => [p.id, p])
    );

    const enriched = applications.map((app) => ({
      ...app,
      influencerProfile: profileMap.get(app.influencerProfileId) ?? null,
    }));

    return NextResponse.json({ applications: enriched });
  } catch (error) {
    console.error("GET /api/campaigns/[id]/applications error:", error);
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
        { error: "Only the campaign owner can manage applications" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateStatusSchema.parse(body);

    const application = (await prisma.application.findUnique({
      where: { id: data.applicationId },
    })) as ApplicationRow | null;

    if (!application || application.campaignId !== id) {
      return NextResponse.json(
        { error: "Application not found for this campaign" },
        { status: 404 }
      );
    }

    const updated = await prisma.application.update({
      where: { id: data.applicationId },
      data: { status: data.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/campaigns/[id]/applications error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
