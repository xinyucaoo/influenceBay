import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type ContactRow = {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: string;
  createdAt: Date;
};

type MessageRow = {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  body: string;
  contactRequestId: string | null;
  applicationId: string | null;
  createdAt: Date;
};

type UserRow = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

const updateStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const contact = (await prisma.contactRequest.findUnique({
      where: { id },
    })) as ContactRow | null;

    if (!contact) {
      return NextResponse.json(
        { error: "Contact request not found" },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    if (contact.fromUserId !== userId && contact.toUserId !== userId) {
      return NextResponse.json(
        { error: "You are not a participant of this contact request" },
        { status: 403 }
      );
    }

    const otherUserId =
      contact.fromUserId === userId ? contact.toUserId : contact.fromUserId;

    const otherUser = (await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, avatarUrl: true },
    })) as UserRow | null;

    const messages = (await prisma.message.findMany({
      where: { contactRequestId: id },
      orderBy: { createdAt: "asc" },
    })) as MessageRow[];

    return NextResponse.json({
      ...contact,
      otherUser,
      messages,
    });
  } catch (error) {
    console.error("GET /api/contacts/[id] error:", error);
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

    const contact = (await prisma.contactRequest.findUnique({
      where: { id },
    })) as ContactRow | null;

    if (!contact) {
      return NextResponse.json(
        { error: "Contact request not found" },
        { status: 404 }
      );
    }

    if (contact.toUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the recipient can update the contact request status" },
        { status: 403 }
      );
    }

    if (contact.status !== "PENDING") {
      return NextResponse.json(
        { error: "This contact request has already been processed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = updateStatusSchema.parse(body);

    const updated = await prisma.contactRequest.update({
      where: { id },
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
    console.error("PUT /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
