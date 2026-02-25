import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe, ExternalLink, Users, DollarSign } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await prisma.influencerProfile.findUnique({
    where: { handle },
  });
  if (!profile) return { title: "Influencer Not Found" };

  const user = await prisma.user.findUnique({ where: { id: profile.userId } });
  return {
    title: `${user?.name ?? handle} — InfluenceBay`,
    description:
      profile.bio?.slice(0, 160) ??
      `Check out ${user?.name ?? handle}'s media kit on InfluenceBay.`,
  };
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    YOUTUBE: "YouTube",
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    TWITTER: "X / Twitter",
  };
  return labels[platform] ?? platform;
}

const pricingLabels: Record<string, string> = {
  dedicatedVideo: "Dedicated Video",
  integration: "Integration / Mention",
  socialPost: "Social Media Post",
};

export default async function Page({ params }: Props) {
  const { handle } = await params;

  const profile = await prisma.influencerProfile.findUnique({
    where: { handle },
  });

  if (!profile) notFound();

  const [user, socialAccounts, niches] = await Promise.all([
    prisma.user.findUnique({ where: { id: profile.userId } }),
    prisma.socialAccount.findMany({
      where: { influencerProfileId: profile.id },
    }),
    prisma.niche.findMany({
      where: { influencers: { some: { id: profile.id } } },
    }),
  ]);

  await prisma.influencerProfile.update({
    where: { id: profile.id },
    data: { profileViews: { increment: 1 } },
  });

  const pricing = profile.pricing as Record<string, number> | null;
  const hasPricing =
    pricing &&
    (pricing.dedicatedVideo || pricing.integration || pricing.socialPost);

  const displayName = user?.name ?? handle;
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-primary/10 pb-16 pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center">
          <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
            <AvatarImage
              src={user?.avatarUrl ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              {displayName}
            </h1>
            <p className="text-muted-foreground">@{handle}</p>
          </div>

          {niches.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {niches.map((niche) => (
                <Badge key={niche.id} variant="secondary">
                  {niche.name}
                </Badge>
              ))}
            </div>
          )}

          {profile.bio && (
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              {profile.bio}
            </p>
          )}

          <Button asChild size="lg" className="mt-2">
            <Link href="/auth/signin">Contact</Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-12 md:grid-cols-2">
        {socialAccounts.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Platforms &amp; Reach
              </CardTitle>
              <CardDescription>
                Connected social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {socialAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {platformLabel(account.platform)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{account.handle}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">
                        {formatFollowers(account.followerCount)}
                      </span>
                      {account.profileUrl && (
                        <a
                          href={account.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground transition-colors hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasPricing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-primary" />
                Pricing
              </CardTitle>
              <CardDescription>Starting rates for collaborations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(pricingLabels).map(([key, label]) => {
                const value = pricing?.[key];
                if (!value) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {label}
                      </span>
                      <span className="font-semibold">
                        ${value.toLocaleString()}
                      </span>
                    </div>
                    <Separator className="mt-3" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {profile.portfolioLinks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                Portfolio
              </CardTitle>
              <CardDescription>Previous work &amp; content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.portfolioLinks.map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{link}</span>
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
