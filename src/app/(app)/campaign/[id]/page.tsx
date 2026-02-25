import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  DollarSign,
  Megaphone,
  Building2,
  ClipboardList,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApplyForm } from "./apply-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });

  if (!campaign) return { title: "Campaign Not Found" };

  return {
    title: `${campaign.title} — InfluenceBay`,
    description:
      campaign.description?.slice(0, 160) ??
      `View details for the campaign "${campaign.title}" on InfluenceBay.`,
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const brandProfile = await prisma.brandProfile.findUnique({
    where: { id: campaign.brandProfileId },
  });

  const niches = await prisma.niche.findMany({
    where: { campaigns: { some: { id } } },
  });

  const initials = brandProfile
    ? brandProfile.companyName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "B";

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-emerald-600/10 via-background to-teal-600/10 pb-16 pt-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Megaphone className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            {campaign.title}
          </h1>

          {brandProfile && (
            <Link
              href={`/brand/${brandProfile.handle}`}
              className="mt-4 inline-flex items-center gap-3 rounded-full bg-muted/60 px-4 py-2 transition-colors hover:bg-muted"
            >
              <Avatar className="h-8 w-8 border">
                <AvatarImage
                  src={brandProfile.logo ?? undefined}
                  alt={brandProfile.companyName}
                />
                <AvatarFallback className="text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {brandProfile.companyName}
              </span>
            </Link>
          )}

          {niches.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {niches.map((n) => (
                <Badge key={n.id} variant="secondary">
                  {n.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        {/* Budget & Deadline */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-lg font-bold">
                  {campaign.budgetMin && campaign.budgetMax
                    ? `$${campaign.budgetMin.toLocaleString()} – $${campaign.budgetMax.toLocaleString()}`
                    : campaign.budgetMin
                      ? `From $${campaign.budgetMin.toLocaleString()}`
                      : campaign.budgetMax
                        ? `Up to $${campaign.budgetMax.toLocaleString()}`
                        : "Flexible"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <CalendarDays className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className="text-lg font-bold">
                  {campaign.deadline
                    ? new Date(campaign.deadline).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "No deadline"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {campaign.description && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {campaign.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Requirements */}
        {campaign.requirements && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {campaign.requirements}
              </p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Apply section */}
        <Card>
          <CardHeader>
            <CardTitle>Interested in this campaign?</CardTitle>
            <CardDescription>
              Submit your pitch to let the brand know why you&apos;re a great
              fit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApplyForm campaignId={id} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
