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
import { Plus, Settings, Clock } from "lucide-react";

const CAMPAIGN_STATUS_STYLES: Record<string, { className: string; label: string }> = {
  OPEN: { className: "bg-green-100 text-green-800 border-green-200", label: "Open" },
  CLOSED: { className: "bg-gray-100 text-gray-600 border-gray-200", label: "Closed" },
};

export default async function CampaignsPage() {
  const session = await auth();

  if (!session?.user) redirect("/auth/signin");
  if (!session.user.role) redirect("/onboarding");

  if (session.user.role !== "BRAND") {
    redirect("/dashboard");
  }

  const profile = await prisma.brandProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    redirect("/dashboard/profile");
  }

  const campaigns = await prisma.campaign.findMany({
    where: { brandProfileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const campaignAppCounts =
    campaigns.length > 0
      ? await Promise.all(
          campaigns.map(async (c) => ({
            campaignId: c.id,
            count: await prisma.application.count({ where: { campaignId: c.id } }),
          }))
        )
      : [];
  const appCountMap = new Map(
    campaignAppCounts.map((x) => [x.campaignId, x.count])
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Campaigns</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your campaigns and view applications.
          </p>
        </div>
        <Button asChild className="gap-2 self-start">
          <Link href="/dashboard/campaigns/new">
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>Your campaigns and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Clock className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No campaigns yet. Create your first campaign to start receiving applications.
              </p>
              <Button asChild variant="outline" className="mt-4" size="sm">
                <Link href="/dashboard/campaigns/new">Create Campaign</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
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
    </div>
  );
}
