import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/),
  bio: z.string().max(1000).optional(),
  audienceDemo: z
    .object({
      ageRanges: z.record(z.string(), z.number()).optional(),
      genderSplit: z.record(z.string(), z.number()).optional(),
      topCountries: z.array(z.string()).optional(),
    })
    .optional(),
  pricing: z
    .object({
      dedicatedVideo: z.number().optional(),
      integration: z.number().optional(),
      socialPost: z.number().optional(),
      other: z.string().optional(),
    })
    .optional(),
  portfolioLinks: z.preprocess(
    (arr) =>
      Array.isArray(arr)
        ? arr.filter((u) => typeof u === "string" && u.trim().length > 0)
        : arr,
    z.array(z.string().url()).optional()
  ),
  nicheIds: z.array(z.string()).optional(),
  socialAccounts: z
    .array(
      z.object({
        platform: z.enum(["YOUTUBE", "INSTAGRAM", "TIKTOK", "TWITTER"]),
        handle: z.string(),
        followerCount: z.preprocess(
          (v) => (typeof v === "number" && Number.isNaN(v) ? 0 : v),
          z.number().int().min(0)
        ),
        profileUrl: z.preprocess(
          (v) => (v === "" || v == null ? undefined : v),
          z.string().url().optional()
        ),
      })
    )
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.influencerProfile.findUnique({
    where: { userId: session.user.id },
    include: { socialAccounts: true, niches: true },
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
    const data = profileSchema.parse(body);

    const existing = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Profile already exists. Use PUT to update." },
        { status: 400 }
      );
    }

    const handleTaken = await prisma.influencerProfile.findUnique({
      where: { handle: data.handle },
    });
    if (handleTaken) {
      return NextResponse.json(
        { error: "Handle already taken" },
        { status: 400 }
      );
    }

    const profile = await prisma.influencerProfile.create({
      data: {
        userId: session.user.id,
        handle: data.handle,
        bio: data.bio,
        audienceDemo: data.audienceDemo ?? undefined,
        pricing: data.pricing ?? undefined,
        portfolioLinks: data.portfolioLinks ?? [],
        niches: data.nicheIds
          ? { connect: data.nicheIds.map((id) => ({ id })) }
          : undefined,
        socialAccounts: data.socialAccounts
          ? {
              create: data.socialAccounts.map((sa) => ({
                platform: sa.platform,
                handle: sa.handle,
                followerCount: sa.followerCount,
                profileUrl: sa.profileUrl,
              })),
            }
          : undefined,
      },
      include: { socialAccounts: true, niches: true },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboarded: true },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const field = issue.path.join(".");
      const msg = field ? `${field}: ${issue.message}` : issue.message;
      return NextResponse.json({ error: msg }, { status: 400 });
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
    const data = profileSchema.partial().parse(body);

    const existing = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (data.handle && data.handle !== existing.handle) {
      const handleTaken = await prisma.influencerProfile.findUnique({
        where: { handle: data.handle },
      });
      if (handleTaken) {
        return NextResponse.json(
          { error: "Handle already taken" },
          { status: 400 }
        );
      }
    }

    if (data.socialAccounts) {
      await prisma.socialAccount.deleteMany({
        where: { influencerProfileId: existing.id },
      });
    }

    const profile = await prisma.influencerProfile.update({
      where: { userId: session.user.id },
      data: {
        handle: data.handle,
        bio: data.bio,
        audienceDemo: data.audienceDemo ?? undefined,
        pricing: data.pricing ?? undefined,
        portfolioLinks: data.portfolioLinks,
        niches: data.nicheIds
          ? { set: data.nicheIds.map((id) => ({ id })) }
          : undefined,
        socialAccounts: data.socialAccounts
          ? {
              create: data.socialAccounts.map((sa) => ({
                platform: sa.platform,
                handle: sa.handle,
                followerCount: sa.followerCount,
                profileUrl: sa.profileUrl,
              })),
            }
          : undefined,
      },
      include: { socialAccounts: true, niches: true },
    });

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const field = issue.path.join(".");
      const msg = field ? `${field}: ${issue.message}` : issue.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
