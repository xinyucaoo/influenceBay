import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type MessageRow = {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  body: string;
  contactRequestId: string | null;
  applicationId: string | null;
  createdAt: Date;
};

type ContactRow = {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: string;
  createdAt: Date;
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

type BrandRow = {
  id: string;
  userId: string;
  handle: string;
  companyName: string;
  logo: string | null;
  website: string | null;
  industry: string | null;
};

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

const sendMessageSchema = z.object({
  receiverUserId: z.string().min(1, "Receiver user ID is required"),
  body: z.string().min(1, "Message body is required"),
  contactRequestId: z.string().optional(),
  applicationId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const contactRequestId = params.get("contactRequestId");
    const applicationId = params.get("applicationId");

    if (!contactRequestId && !applicationId) {
      return NextResponse.json(
        { error: "Either contactRequestId or applicationId is required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    if (contactRequestId) {
      const contact = (await prisma.contactRequest.findUnique({
        where: { id: contactRequestId },
      })) as ContactRow | null;

      if (!contact) {
        return NextResponse.json(
          { error: "Contact request not found" },
          { status: 404 }
        );
      }

      if (contact.fromUserId !== userId && contact.toUserId !== userId) {
        return NextResponse.json(
          { error: "You are not a participant of this contact request" },
          { status: 403 }
        );
      }
    }

    if (applicationId) {
      const application = (await prisma.application.findUnique({
        where: { id: applicationId },
      })) as ApplicationRow | null;

      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }

      const influencerProfile = (await prisma.influencerProfile.findUnique({
        where: { id: application.influencerProfileId },
      })) as InfluencerProfileRow | null;

      const campaign = (await prisma.campaign.findUnique({
        where: { id: application.campaignId },
      })) as CampaignRow | null;

      let brandUserId: string | null = null;
      if (campaign) {
        const brand = (await prisma.brandProfile.findUnique({
          where: { id: campaign.brandProfileId },
        })) as BrandRow | null;
        brandUserId = brand?.userId ?? null;
      }

      const isInfluencer = influencerProfile?.userId === userId;
      const isBrand = brandUserId === userId;

      if (!isInfluencer && !isBrand) {
        return NextResponse.json(
          { error: "You are not a participant of this application" },
          { status: 403 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (contactRequestId) where.contactRequestId = contactRequestId;
    if (applicationId) where.applicationId = applicationId;

    const messages = (await prisma.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
    })) as MessageRow[];

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const data = sendMessageSchema.parse(rawBody);

    if (!data.contactRequestId && !data.applicationId) {
      return NextResponse.json(
        { error: "At least one of contactRequestId or applicationId is required" },
        { status: 400 }
      );
    }

    if (data.receiverUserId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot send a message to yourself" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    if (data.contactRequestId) {
      const contact = (await prisma.contactRequest.findUnique({
        where: { id: data.contactRequestId },
      })) as ContactRow | null;

      if (!contact) {
        return NextResponse.json(
          { error: "Contact request not found" },
          { status: 404 }
        );
      }

      if (contact.fromUserId !== userId && contact.toUserId !== userId) {
        return NextResponse.json(
          { error: "You are not a participant of this contact request" },
          { status: 403 }
        );
      }

      const otherUserId =
        contact.fromUserId === userId ? contact.toUserId : contact.fromUserId;
      if (data.receiverUserId !== otherUserId) {
        return NextResponse.json(
          { error: "Receiver must be the other participant in this contact request" },
          { status: 400 }
        );
      }
    }

    if (data.applicationId) {
      const application = (await prisma.application.findUnique({
        where: { id: data.applicationId },
      })) as ApplicationRow | null;

      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }

      const influencerProfile = (await prisma.influencerProfile.findUnique({
        where: { id: application.influencerProfileId },
      })) as InfluencerProfileRow | null;

      const campaign = (await prisma.campaign.findUnique({
        where: { id: application.campaignId },
      })) as CampaignRow | null;

      let brandUserId: string | null = null;
      if (campaign) {
        const brand = (await prisma.brandProfile.findUnique({
          where: { id: campaign.brandProfileId },
        })) as BrandRow | null;
        brandUserId = brand?.userId ?? null;
      }

      const isInfluencer = influencerProfile?.userId === userId;
      const isBrand = brandUserId === userId;

      if (!isInfluencer && !isBrand) {
        return NextResponse.json(
          { error: "You are not a participant of this application" },
          { status: 403 }
        );
      }

      const expectedReceiver = isInfluencer ? brandUserId : influencerProfile?.userId;
      if (data.receiverUserId !== expectedReceiver) {
        return NextResponse.json(
          { error: "Receiver must be the other participant in this application" },
          { status: 400 }
        );
      }
    }

    const message = await prisma.message.create({
      data: {
        senderUserId: session.user.id,
        receiverUserId: data.receiverUserId,
        body: data.body,
        contactRequestId: data.contactRequestId ?? null,
        applicationId: data.applicationId ?? null,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/messages error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
