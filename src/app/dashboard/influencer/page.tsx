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
  Eye,
  Send,
  UserCheck,
  Pencil,
  Megaphone,
  MessageSquare,
  Clock,
  ArrowRight,
} from "lucide-react";

type InfluencerRow = {
  id: string;
  userId: string;
  handle: string;
  bio: string | null;
  profileViews: number;
  createdAt: Date;
};

type ApplicationRow = {
  id: string;
  campaignId: string;
  status: string;
  createdAt: Date;
};

type CampaignRow = {
  id: string;
  title: string;
};

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  PENDING: { className: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pending" },
  ACCEPTED: { className: "bg-green-100 text-green-800 border-green-200", label: "Accepted" },
  REJECTED: { className: "bg-red-100 text-red-800 border-red-200", label: "Rejected" },
};

export default async function InfluencerDashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/auth/signin");
  if (!session.user.role) redirect("/onboarding");

  const profile = (await prisma.influencerProfile.findUnique({
    where: { userId: session.user.id },
  })) as InfluencerRow | null;

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <UserCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="mt-3 text-muted-foreground">
            Set up your influencer profile to start discovering campaigns and connecting with brands.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/dashboard/profile">Create Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [applicationCount, recentApplications, contactRequestCount] =
    await Promise.all([
      prisma.application.count({
        where: { influencerProfileId: profile.id },
      }) as Promise<number>,
      prisma.application.findMany({
        where: { influencerProfileId: profile.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }) as Promise<ApplicationRow[]>,
      prisma.contactRequest.count({
        where: { toUserId: session.user.id },
      }) as Promise<number>,
    ]);

  const campaignIds = recentApplications.map((a) => a.campaignId);
  const campaigns =
    campaignIds.length > 0
      ? ((await prisma.campaign.findMany({
          where: { id: { in: campaignIds } },
        })) as CampaignRow[])
      : [];
  const campaignMap = new Map(campaigns.map((c) => [c.id, c]));

  const stats = [
    {
      label: "Profile Views",
      value: profile.profileViews,
      icon: Eye,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Applications Sent",
      value: applicationCount,
      icon: Send,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Contact Requests",
      value: contactRequestCount,
      icon: UserCheck,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session.user.name ?? profile.handle}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your influencer activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Your latest campaign applications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Clock className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No applications yet. Browse campaigns to get started.
                </p>
                <Button asChild variant="outline" className="mt-4" size="sm">
                  <Link href="/campaigns">Browse Campaigns</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApplications.map((app) => {
                  const campaign = campaignMap.get(app.campaignId);
                  const style = STATUS_STYLES[app.status] ?? STATUS_STYLES.PENDING;
                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {campaign?.title ?? "Unknown Campaign"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(app.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={style.className}
                      >
                        {style.label}
                      </Badge>
                    </div>
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
              <Link href="/dashboard/profile">
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/campaigns">
                <Megaphone className="h-4 w-4" />
                Browse Campaigns
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
              <Link href={`/influencer/${profile.handle}`}>
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
