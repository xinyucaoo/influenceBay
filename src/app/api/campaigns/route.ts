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

const createCampaignSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  requirements: z.string().optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  deadline: z.string().datetime().optional(),
  nicheIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const q = params.get("q")?.trim() || "";
    const niche = params.get("niche")?.trim() || "";
    const minBudget = params.get("minBudget")
      ? parseFloat(params.get("minBudget")!)
      : null;
    const maxBudget = params.get("maxBudget")
      ? parseFloat(params.get("maxBudget")!)
      : null;
    const page = Math.max(1, parseInt(params.get("page") || "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(params.get("limit") || "12") || 12)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: "OPEN" };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    if (minBudget !== null) {
      where.budgetMax = { ...(where.budgetMax || {}), gte: minBudget };
    }
    if (maxBudget !== null) {
      where.budgetMin = { ...(where.budgetMin || {}), lte: maxBudget };
    }

    if (niche) {
      const nicheRecord = (await prisma.niche.findUnique({
        where: { slug: niche },
      })) as NicheRow | null;

      if (nicheRecord) {
        where.niches = { some: { id: nicheRecord.id } };
      } else {
        return NextResponse.json({
          campaigns: [],
          total: 0,
          page,
          totalPages: 0,
        });
      }
    }

    const [total, campaigns] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil((total as number) / limit);
    const rows = campaigns as CampaignRow[];

    if (rows.length === 0) {
      return NextResponse.json({
        campaigns: [],
        total,
        page,
        totalPages,
      });
    }

    const brandProfileIds = [...new Set(rows.map((c) => c.brandProfileId))];
    const brandProfiles = (await prisma.brandProfile.findMany({
      where: { id: { in: brandProfileIds } },
    })) as BrandRow[];
    const brandMap = new Map(brandProfiles.map((b) => [b.id, b]));

    const campaignIds = rows.map((c) => c.id);
    const campaignsWithNiches = (await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, niches: true },
    })) as Array<{ id: string; niches: NicheRow[] }>;

    const nicheMap = new Map(
      campaignsWithNiches.map((c) => [c.id, c.niches])
    );

    const enriched = rows.map((campaign) => ({
      ...campaign,
      brandProfile: brandMap.get(campaign.brandProfileId) ?? null,
      niches: nicheMap.get(campaign.id) ?? [],
    }));

    return NextResponse.json({
      campaigns: enriched,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
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
        { error: "Only brands can create campaigns" },
        { status: 403 }
      );
    }

    const brandProfile = (await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
    })) as BrandRow | null;

    if (!brandProfile) {
      return NextResponse.json(
        { error: "Brand profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createCampaignSchema.parse(body);

    const campaign = await prisma.campaign.create({
      data: {
        brandProfileId: brandProfile.id,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        ...(data.nicheIds && data.nicheIds.length > 0
          ? { niches: { connect: data.nicheIds.map((id) => ({ id })) } }
          : {}),
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
