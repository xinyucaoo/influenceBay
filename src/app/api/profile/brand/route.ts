import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const brandSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/),
  companyName: z.string().min(2).max(100),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  industry: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.brandProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(profile);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = brandSchema.parse(body);

    const existing = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Profile already exists. Use PUT to update." },
        { status: 400 }
      );
    }

    const handleTaken = await prisma.brandProfile.findUnique({
      where: { handle: data.handle },
    });
    if (handleTaken) {
      return NextResponse.json(
        { error: "Handle already taken" },
        { status: 400 }
      );
    }

    const profile = await prisma.brandProfile.create({
      data: {
        userId: session.user.id,
        handle: data.handle,
        companyName: data.companyName,
        logo: data.logo,
        website: data.website,
        industry: data.industry,
        description: data.description,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboarded: true },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = brandSchema.partial().parse(body);

    const existing = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (data.handle && data.handle !== existing.handle) {
      const handleTaken = await prisma.brandProfile.findUnique({
        where: { handle: data.handle },
      });
      if (handleTaken) {
        return NextResponse.json(
          { error: "Handle already taken" },
          { status: 400 }
        );
      }
    }

    const profile = await prisma.brandProfile.update({
      where: { userId: session.user.id },
      data: {
        handle: data.handle,
        companyName: data.companyName,
        logo: data.logo,
        website: data.website,
        industry: data.industry,
        description: data.description,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
