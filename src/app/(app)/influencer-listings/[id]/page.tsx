import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  DollarSign,
  Tag,
  Gavel,
  User,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BidForm } from "./bid-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.influencerListing.findUnique({
    where: { id },
    include: { influencerProfile: { select: { handle: true } } },
  });

  if (!listing) return { title: "Listing Not Found" };

  return {
    title: `${listing.title} — InfluenceBay`,
    description:
      listing.description?.slice(0, 160) ??
      `View sponsorship opportunity "${listing.title}" from @${listing.influencerProfile?.handle ?? "influencer"} on InfluenceBay.`,
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const listing = await prisma.influencerListing.findUnique({
    where: { id },
    include: {
      influencerProfile: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
  if (!listing) notFound();

  const [niches, highestBid] = await Promise.all([
    prisma.niche.findMany({
      where: { influencerListings: { some: { id } } },
    }),
    listing.pricingType === "AUCTION"
      ? prisma.listingBid
          .findFirst({
            where: {
              listingId: id,
              status: { in: ["PENDING", "ACCEPTED"] },
            },
            orderBy: { amount: "desc" },
          })
          .then((b) => b?.amount ?? null)
      : Promise.resolve(null),
  ]);

  const influencer = listing.influencerProfile;
  const initials = influencer.user?.name
    ? influencer.user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : influencer.handle.slice(0, 2).toUpperCase();

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
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-violet-600/10 via-background to-fuchsia-600/10 pb-16 pt-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
            <Tag className="h-7 w-7 text-violet-700" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            {listing.title}
          </h1>

          <Link
            href={`/influencer/${influencer.handle}`}
            className="mt-4 inline-flex items-center gap-3 rounded-full bg-muted/60 px-4 py-2 transition-colors hover:bg-muted"
          >
            <Avatar className="h-8 w-8 border">
              <AvatarImage
                src={influencer.user?.avatarUrl ?? undefined}
                alt={influencer.user?.name ?? undefined}
              />
              <AvatarFallback className="text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {influencer.user?.name ?? influencer.handle}
            </span>
            <span className="text-xs text-muted-foreground">
              @{influencer.handle}
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
                    ? "Expected Quote"
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
              <User className="h-5 w-5 text-primary" />
              About This Sponsorship Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {listing.description}
            </p>
          </CardContent>
        </Card>

        {/* Bid section */}
        <Card>
          <CardHeader>
            <CardTitle>Interested in this opportunity?</CardTitle>
            <CardDescription>
              {listing.pricingType === "AUCTION"
                ? "Place a bid to compete for this sponsorship."
                : "Purchase at the expected quote or make an offer."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {listing.status === "OPEN" && !isAuctionEnded && (
              <BidForm
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
            <Button variant="outline" size="lg" asChild className="gap-2">
              <Link href={`/influencer/${influencer.handle}`}>
                View Influencer Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
