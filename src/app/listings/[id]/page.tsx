import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  DollarSign,
  Tag,
  Gavel,
  Users,
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
import { OfferForm } from "./offer-form";
import { ContactDialog } from "./contact-dialog";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.sponsorshipListing.findUnique({
    where: { id },
  });

  if (!listing) return { title: "Listing Not Found" };

  return {
    title: `${listing.title} — InfluenceBay`,
    description:
      listing.description?.slice(0, 160) ??
      `View sponsorship opportunity "${listing.title}" on InfluenceBay.`,
  };
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const listing = await prisma.sponsorshipListing.findUnique({
    where: { id },
  });
  if (!listing) notFound();

  const [influencerProfile, niches, highestBid] = await Promise.all([
    prisma.influencerProfile.findUnique({
      where: { id: listing.influencerProfileId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        socialAccounts: true,
      },
    }),
    prisma.niche.findMany({
      where: { listings: { some: { id } } },
    }),
    listing.pricingType === "AUCTION"
      ? prisma.offer
          .findFirst({
            where: {
              listingId: id,
              status: { in: ["PENDING", "ACCEPTED"] },
            },
            orderBy: { amount: "desc" },
          })
          .then((o) => o?.amount ?? null)
      : Promise.resolve(null),
  ]);

  if (!influencerProfile) notFound();

  const totalFollowers = influencerProfile.socialAccounts.reduce(
    (sum, a) => sum + a.followerCount,
    0,
  );
  const initials = influencerProfile.user?.name
    ? influencerProfile.user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const priceDisplay =
    listing.pricingType === "FIXED"
      ? `$${listing.fixedPrice?.toLocaleString() ?? "—"}`
      : `From $${listing.startingBid?.toLocaleString() ?? "—"}`;

  const isAuctionEnded =
    listing.pricingType === "AUCTION" &&
    listing.auctionEndsAt &&
    new Date(listing.auctionEndsAt) < new Date();

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-amber-600/10 via-background to-orange-600/10 pb-16 pt-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Tag className="h-7 w-7 text-amber-700" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            {listing.title}
          </h1>

          <Link
            href={`/influencer/${influencerProfile.handle}`}
            className="mt-4 inline-flex items-center gap-3 rounded-full bg-muted/60 px-4 py-2 transition-colors hover:bg-muted"
          >
            <Avatar className="h-8 w-8 border">
              <AvatarImage
                src={influencerProfile.user?.avatarUrl ?? undefined}
                alt={influencerProfile.user?.name ?? undefined}
              />
              <AvatarFallback className="text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {influencerProfile.user?.name ?? `@${influencerProfile.handle}`}
            </span>
            <span className="text-xs text-muted-foreground">
              @{influencerProfile.handle} · {formatFollowers(totalFollowers)}{" "}
              followers
            </span>
          </Link>

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
        {/* Price & Auction info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                {listing.pricingType === "FIXED" ? (
                  <DollarSign className="h-5 w-5 text-emerald-700" />
                ) : (
                  <Gavel className="h-5 w-5 text-amber-700" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {listing.pricingType === "FIXED"
                    ? "Fixed Price"
                    : "Auction"}
                </p>
                <p className="text-lg font-bold">{priceDisplay}</p>
                {listing.pricingType === "AUCTION" && highestBid != null && (
                  <p className="text-sm text-muted-foreground">
                    Current bid: ${highestBid.toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {listing.pricingType === "AUCTION" && listing.auctionEndsAt && (
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <CalendarDays className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isAuctionEnded ? "Auction ended" : "Auction ends"}
                  </p>
                  <p className="text-lg font-bold">
                    {new Date(listing.auctionEndsAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              About This Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {listing.description}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-4">
          {/* Creator reach */}
          {influencerProfile.socialAccounts.length > 0 && (
            <Card className="flex-1 min-w-[200px]">
              <CardHeader>
                <CardTitle className="text-base">Platforms & Reach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {influencerProfile.socialAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="capitalize text-muted-foreground">
                      {acc.platform}
                    </span>
                    <span className="font-medium">
                      {formatFollowers(acc.followerCount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        {/* Offer / Message section */}
        <Card>
          <CardHeader>
            <CardTitle>Interested in this opportunity?</CardTitle>
            <CardDescription>
              {listing.pricingType === "AUCTION"
                ? "Place a bid or message the creator to discuss."
                : "Make an offer at the asking price or message to inquire."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {listing.status === "OPEN" && !isAuctionEnded && (
              <OfferForm
                listingId={id}
                pricingType={listing.pricingType}
                fixedPrice={listing.fixedPrice}
                startingBid={listing.startingBid}
                highestBid={highestBid}
                auctionEndsAt={
                  listing.auctionEndsAt?.toISOString() ?? null
                }
              />
            )}
            {listing.status !== "OPEN" && (
              <Badge variant="secondary" className="text-sm">
                This listing is {listing.status.toLowerCase()}
              </Badge>
            )}
            <ContactDialog
              listingId={id}
              listingTitle={listing.title}
              influencerUserId={influencerProfile.user?.id ?? ""}
            />
            <Button variant="outline" size="lg" asChild className="gap-2">
              <Link href={`/influencer/${influencerProfile.handle}`}>
                View Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
