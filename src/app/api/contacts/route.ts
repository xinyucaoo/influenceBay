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

type UserRow = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

const createContactSchema = z.object({
  toUserId: z.string().min(1, "Recipient user ID is required"),
  message: z.string().min(1, "Message is required"),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    };

    const contacts = (await prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as ContactRow[];

    if (contacts.length === 0) {
      return NextResponse.json({ contacts: [] });
    }

    const otherUserIds = [
      ...new Set(
        contacts.map((c) =>
          c.fromUserId === userId ? c.toUserId : c.fromUserId
        )
      ),
    ];

    const users = (await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: { id: true, name: true, avatarUrl: true },
    })) as UserRow[];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = contacts.map((contact) => {
      const otherUserId =
        contact.fromUserId === userId
          ? contact.toUserId
          : contact.fromUserId;
      return {
        ...contact,
        otherUser: userMap.get(otherUserId) ?? null,
      };
    });

    return NextResponse.json({ contacts: enriched });
  } catch (error) {
    console.error("GET /api/contacts error:", error);
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

    if (session.user.role !== "BRAND") {
      return NextResponse.json(
        { error: "Only brands can send contact requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createContactSchema.parse(body);

    if (data.toUserId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot send a contact request to yourself" },
        { status: 400 }
      );
    }

    const toUser = (await prisma.user.findUnique({
      where: { id: data.toUserId },
      select: { id: true, role: true },
    })) as { id: string; role: string | null } | null;

    if (!toUser) {
      return NextResponse.json(
        { error: "Recipient user not found" },
        { status: 404 }
      );
    }

    if (toUser.role !== "INFLUENCER") {
      return NextResponse.json(
        { error: "Contact requests can only be sent to influencers" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingWhere: any = {
      fromUserId: session.user.id,
      toUserId: data.toUserId,
      status: { in: ["PENDING", "ACCEPTED"] },
    };

    const existing = (await prisma.contactRequest.findFirst({
      where: existingWhere,
    })) as ContactRow | null;

    if (existing) {
      return NextResponse.json(
        { error: "An active contact request already exists with this user" },
        { status: 409 }
      );
    }

    const contact = await prisma.contactRequest.create({
      data: {
        fromUserId: session.user.id,
        toUserId: data.toUserId,
        message: data.message,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/contacts error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
