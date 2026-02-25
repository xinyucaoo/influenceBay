import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Building2,
  Megaphone,
  UserPlus,
  Search,
  Handshake,
  FileText,
  Eye,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Star,
} from "lucide-react";

type InfluencerRow = {
  id: string;
  handle: string;
  bio: string | null;
  profileViews: number;
  userId: string;
};

type UserRow = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  status: string;
  brandProfileId: string;
};

type BrandRow = {
  id: string;
  companyName: string;
  logo: string | null;
};

export default async function HomePage() {
  const [
    influencerCount,
    brandCount,
    campaignCount,
    recentInfluencers,
    recentCampaigns,
  ] = await Promise.all([
    prisma.influencerProfile.count() as Promise<number>,
    prisma.brandProfile.count() as Promise<number>,
    prisma.campaign.count() as Promise<number>,
    prisma.influencerProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
    }) as Promise<InfluencerRow[]>,
    prisma.campaign.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }) as Promise<CampaignRow[]>,
  ]);

  // Fetch related users and brands separately (Accelerate constraint)
  const influencerUserIds = recentInfluencers.map((i) => i.userId);
  const campaignBrandIds = recentCampaigns.map((c) => c.brandProfileId);

  const [influencerUsers, campaignBrands] = await Promise.all([
    influencerUserIds.length > 0
      ? (prisma.user.findMany({
          where: { id: { in: influencerUserIds } },
        }) as Promise<UserRow[]>)
      : ([] as UserRow[]),
    campaignBrandIds.length > 0
      ? (prisma.brandProfile.findMany({
          where: { id: { in: campaignBrandIds } },
        }) as Promise<BrandRow[]>)
      : ([] as BrandRow[]),
  ]);

  const userMap = new Map(influencerUsers.map((u) => [u.id, u]));
  const brandMap = new Map(campaignBrands.map((b) => [b.id, b]));

  const platformStats = [
    { label: "Influencers", value: influencerCount, icon: Users },
    { label: "Brands", value: brandCount, icon: Building2 },
    { label: "Campaigns", value: campaignCount, icon: Megaphone },
  ];

  const influencerSteps = [
    {
      icon: UserPlus,
      title: "Create Your Profile",
      description:
        "Build your media kit with audience stats, niches, and portfolio links.",
    },
    {
      icon: Search,
      title: "Discover Campaigns",
      description:
        "Browse open campaigns from brands that match your niche and audience.",
    },
    {
      icon: Handshake,
      title: "Land Deals",
      description:
        "Apply directly, negotiate transparently, and grow your income.",
    },
  ];

  const brandSteps = [
    {
      icon: FileText,
      title: "Post a Campaign",
      description:
        "Describe your campaign goals, requirements, and budget range.",
    },
    {
      icon: Eye,
      title: "Find Creators",
      description:
        "Browse influencer profiles, filter by niche, and review media kits.",
    },
    {
      icon: MessageSquare,
      title: "Collaborate",
      description:
        "Connect with influencers, review applications, and manage partnerships.",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,hsl(var(--primary)/0.08),transparent)]" />
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              The influencer marketplace
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Where Influencers{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Meet Brands
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              InfluenceBay is the marketplace for better, more transparent
              sponsorship deals. Build your media kit, discover campaigns, and
              grow your business.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="gap-2 text-base px-8">
                <Link href="/auth/signup">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-base px-8"
              >
                <Link href="/influencers">Browse Influencers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {platformStats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Whether you&apos;re an influencer or a brand, getting started is
              simple.
            </p>
          </div>

          <div className="grid gap-16 lg:grid-cols-2">
            {/* Influencer steps */}
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <Star className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold">For Influencers</h3>
              </div>
              <div className="space-y-6">
                {influencerSteps.map((step, i) => (
                  <div key={step.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-violet-200 bg-violet-50 text-sm font-bold text-violet-700">
                        {i + 1}
                      </div>
                      {i < influencerSteps.length - 1 && (
                        <div className="mt-2 h-full w-px bg-violet-200" />
                      )}
                    </div>
                    <div className="pb-6">
                      <h4 className="font-semibold">{step.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand steps */}
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold">For Brands</h3>
              </div>
              <div className="space-y-6">
                {brandSteps.map((step, i) => (
                  <div key={step.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-50 text-sm font-bold text-blue-700">
                        {i + 1}
                      </div>
                      {i < brandSteps.length - 1 && (
                        <div className="mt-2 h-full w-px bg-blue-200" />
                      )}
                    </div>
                    <div className="pb-6">
                      <h4 className="font-semibold">{step.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Influencers */}
      {recentInfluencers.length > 0 && (
        <section className="border-t bg-muted/20 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Featured Influencers
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Discover talented creators on the platform.
                </p>
              </div>
              <Button asChild variant="ghost" className="hidden gap-1 sm:flex">
                <Link href="/influencers">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentInfluencers.map((influencer) => {
                const user = userMap.get(influencer.userId);
                return (
                  <Link
                    key={influencer.id}
                    href={`/influencer/${influencer.handle}`}
                  >
                    <Card className="transition-shadow hover:shadow-md">
                      <CardContent className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarImage
                            src={user?.avatarUrl ?? undefined}
                          />
                          <AvatarFallback>
                            {(user?.name ?? influencer.handle)
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {user?.name ?? influencer.handle}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{influencer.handle}
                          </p>
                          {influencer.bio && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {influencer.bio}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Button asChild variant="outline" className="gap-1">
                <Link href="/influencers">
                  View all influencers
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Featured Campaigns */}
      {recentCampaigns.length > 0 && (
        <section className="border-t py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Open Campaigns
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Browse the latest opportunities from brands.
                </p>
              </div>
              <Button asChild variant="ghost" className="hidden gap-1 sm:flex">
                <Link href="/campaigns">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentCampaigns.map((campaign) => {
                const brand = brandMap.get(campaign.brandProfileId);
                const budget =
                  campaign.budgetMin && campaign.budgetMax
                    ? `$${campaign.budgetMin.toLocaleString("en-US")} – $${campaign.budgetMax.toLocaleString("en-US")}`
                    : campaign.budgetMin
                      ? `From $${campaign.budgetMin.toLocaleString("en-US")}`
                      : campaign.budgetMax
                        ? `Up to $${campaign.budgetMax.toLocaleString("en-US")}`
                        : null;
                return (
                  <Link
                    key={campaign.id}
                    href={`/campaign/${campaign.id}`}
                  >
                    <Card className="transition-shadow hover:shadow-md">
                      <CardContent>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Open
                          </Badge>
                          {budget && (
                            <span className="text-sm font-medium text-primary">
                              {budget}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 truncate font-semibold">
                          {campaign.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {campaign.description}
                        </p>
                        {brand && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            by{" "}
                            <span className="font-medium text-foreground">
                              {brand.companyName}
                            </span>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Button asChild variant="outline" className="gap-1">
                <Link href="/campaigns">
                  View all campaigns
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join InfluenceBay today and start building meaningful partnerships
              between creators and brands.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="gap-2 text-base px-8">
                <Link href="/auth/signup">
                  Create Your Free Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
