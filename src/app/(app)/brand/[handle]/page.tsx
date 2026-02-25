import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe, ExternalLink, Building2 } from "lucide-react";
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
  const profile = await prisma.brandProfile.findUnique({
    where: { handle },
  });

  if (!profile) return { title: "Brand Not Found" };

  return {
    title: `${profile.companyName} — InfluenceBay`,
    description:
      profile.description?.slice(0, 160) ??
      `Learn more about ${profile.companyName} on InfluenceBay.`,
  };
}

export default async function Page({ params }: Props) {
  const { handle } = await params;

  const profile = await prisma.brandProfile.findUnique({
    where: { handle },
  });

  if (!profile) notFound();

  const campaigns = await prisma.campaign.findMany({
    where: { brandProfileId: profile.id, status: "OPEN" },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const user = await prisma.user.findUnique({
    where: { id: profile.userId },
  });

  const initials = profile.companyName
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
              src={profile.logo ?? user?.avatarUrl ?? undefined}
              alt={profile.companyName}
            />
            <AvatarFallback className="text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              {profile.companyName}
            </h1>
            <p className="text-muted-foreground">@{handle}</p>
          </div>

          {profile.industry && (
            <Badge variant="secondary" className="text-sm">
              <Building2 className="mr-1 h-3.5 w-3.5" />
              {profile.industry}
            </Badge>
          )}

          {profile.description && (
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              {profile.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-3">
            {profile.website && (
              <Button asChild variant="outline" size="lg">
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Website
                </a>
              </Button>
            )}
            <Button asChild size="lg">
              <Link href="/auth/signin">Contact</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Open Campaigns
            </CardTitle>
            <CardDescription>
              Currently accepting influencer applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No open campaigns yet.
              </p>
            ) : (
              <div className="space-y-1">
                {campaigns.map((campaign, i) => (
                  <div key={campaign.id}>
                    {i > 0 && <Separator className="my-4" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-semibold leading-snug">
                          {campaign.title}
                        </h3>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {campaign.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                          {(campaign.budgetMin || campaign.budgetMax) && (
                            <span>
                              Budget:{" "}
                              {campaign.budgetMin && campaign.budgetMax
                                ? `$${campaign.budgetMin.toLocaleString()} – $${campaign.budgetMax.toLocaleString()}`
                                : campaign.budgetMin
                                  ? `From $${campaign.budgetMin.toLocaleString()}`
                                  : `Up to $${campaign.budgetMax!.toLocaleString()}`}
                            </span>
                          )}
                          {campaign.deadline && (
                            <span>
                              Deadline:{" "}
                              {new Date(campaign.deadline).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={`/campaign/${campaign.id}`}
                        className="shrink-0 text-primary transition-colors hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
