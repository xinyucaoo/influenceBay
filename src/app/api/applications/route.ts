import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "INFLUENCER") {
      return NextResponse.json(
        { error: "Only influencers can view their applications" },
        { status: 403 }
      );
    }

    const profile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ applications: [] });
    }

    const applications = await prisma.application.findMany({
      where: { influencerProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          include: {
            brandProfile: {
              include: {
                user: {
                  select: { name: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      applications: applications.map((app) => ({
        id: app.id,
        pitch: app.pitch,
        status: app.status,
        createdAt: app.createdAt,
        campaign: {
          id: app.campaign.id,
          title: app.campaign.title,
          status: app.campaign.status,
          brandProfile: {
            companyName: app.campaign.brandProfile.companyName,
            handle: app.campaign.brandProfile.handle,
            user: app.campaign.brandProfile.user,
          },
        },
      })),
    });
  } catch (error) {
    console.error("GET /api/applications error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
