import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Megaphone,
  FileText,
  Mail,
  Plus,
  Users,
  MessageSquare,
  Clock,
  ArrowRight,
  Settings,
  Tag,
} from "lucide-react";

type BrandRow = {
  id: string;
  userId: string;
  handle: string;
  companyName: string;
  logo: string | null;
  createdAt: Date;
};

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
};

const CAMPAIGN_STATUS_STYLES: Record<string, { className: string; label: string }> = {
  OPEN: { className: "bg-green-100 text-green-800 border-green-200", label: "Open" },
  CLOSED: { className: "bg-gray-100 text-gray-600 border-gray-200", label: "Closed" },
};

export default async function BrandDashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/auth/signin");
  if (!session.user.role) redirect("/onboarding");

  const profile = (await prisma.brandProfile.findUnique({
    where: { userId: session.user.id },
  })) as BrandRow | null;

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Megaphone className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Complete Your Brand Profile</h1>
          <p className="mt-3 text-muted-foreground">
            Set up your brand profile to start posting campaigns and discovering influencers.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/dashboard/profile">Create Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [allCampaigns, totalApplications, contactRequestsSent] =
    await Promise.all([
      prisma.campaign.findMany({
        where: { brandProfileId: profile.id },
        orderBy: { createdAt: "desc" },
      }) as Promise<CampaignRow[]>,
      prisma.application.count({
        where: {
          campaign: { brandProfileId: profile.id },
        },
      }) as Promise<number>,
      prisma.contactRequest.count({
        where: { fromUserId: session.user.id },
      }) as Promise<number>,
    ]);

  const activeCampaigns = allCampaigns.filter((c) => c.status === "OPEN");

  // Fetch per-campaign application counts separately
  const campaignAppCounts =
    allCampaigns.length > 0
      ? await Promise.all(
          allCampaigns.slice(0, 5).map(async (c) => ({
            campaignId: c.id,
            count: (await prisma.application.count({
              where: { campaignId: c.id },
            })) as number,
          }))
        )
      : [];
  const appCountMap = new Map(
    campaignAppCounts.map((x) => [x.campaignId, x.count])
  );

  const stats = [
    { label: "Active Campaigns", value: activeCampaigns.length, icon: Megaphone },
    { label: "Total Applications", value: totalApplications, icon: FileText },
    { label: "Contact Requests Sent", value: contactRequestsSent, icon: Mail },
  ];

  const recentCampaigns = allCampaigns.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile.companyName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s an overview of your brand activity.
          </p>
        </div>
        <Button asChild className="gap-2 self-start">
          <Link href="/dashboard/campaigns/new">
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-w-0 items-center gap-3 rounded-lg border bg-card px-3 py-2.5 shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:block">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="text-base font-semibold tabular-nums">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My Campaigns</CardTitle>
            <CardDescription>Your recent campaigns and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Clock className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No campaigns yet. Create your first campaign to start receiving applications.
                </p>
                <Button asChild variant="outline" className="mt-4" size="sm">
                  <Link href="/dashboard/campaigns/new">Create Campaign</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign) => {
                  const style =
                    CAMPAIGN_STATUS_STYLES[campaign.status] ??
                    CAMPAIGN_STATUS_STYLES.OPEN;
                  const appCount = appCountMap.get(campaign.id) ?? 0;
                  return (
                    <Link
                      key={campaign.id}
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{campaign.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {appCount} application{appCount !== 1 ? "s" : ""} &middot;{" "}
                          {new Date(campaign.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={style.className}>
                          {style.label}
                        </Badge>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/dashboard/campaigns/new">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/listings">
                <Tag className="h-4 w-4" />
                Sponsorship Listings
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/influencers">
                <Users className="h-4 w-4" />
                Browse Influencers
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/dashboard/messages">
                <MessageSquare className="h-4 w-4" />
                View Messages
              </Link>
            </Button>
            <Separator className="my-2" />
            <Button asChild className="gap-2">
              <Link href={`/brand/${profile.handle}`}>
                View Public Profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
