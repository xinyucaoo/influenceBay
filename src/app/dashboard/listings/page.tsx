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
import { Tag, Plus, DollarSign, Gavel, Clock } from "lucide-react";

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  OPEN: { className: "bg-green-100 text-green-800 border-green-200", label: "Open" },
  CLOSED: { className: "bg-gray-100 text-gray-600 border-gray-200", label: "Closed" },
  SOLD: { className: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Sold" },
};

const PRICING_STYLES: Record<string, { className: string; label: string }> = {
  FIXED: { className: "bg-blue-100 text-blue-800 border-blue-200", label: "Fixed Price" },
  AUCTION: { className: "bg-amber-100 text-amber-800 border-amber-200", label: "Auction" },
};

export default async function ListingsPage() {
  const session = await auth();

  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "INFLUENCER") redirect("/dashboard");

  const profile = await prisma.influencerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="mt-3 text-muted-foreground">
            Set up your influencer profile before creating sponsorship listings.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/dashboard/profile">Create Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  const listings = await prisma.sponsorshipListing.findMany({
    where: { influencerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      niches: true,
      _count: { select: { offers: true } },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            My Sponsorship Listings
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your content sponsorship opportunities for brands to discover.
          </p>
        </div>
        <Button asChild className="gap-2 self-start">
          <Link href="/dashboard/listings/new">
            <Plus className="h-4 w-4" />
            New Listing
          </Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Tag className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No listings yet</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Create your first sponsorship listing to let brands discover and bid on your upcoming content opportunities.
            </p>
            <Button asChild className="mt-6" size="lg">
              <Link href="/dashboard/listings/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Listing
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const statusStyle = STATUS_STYLES[listing.status] ?? STATUS_STYLES.OPEN;
            const pricingStyle = PRICING_STYLES[listing.pricingType] ?? PRICING_STYLES.FIXED;
            const priceDisplay =
              listing.pricingType === "FIXED"
                ? `$${listing.fixedPrice?.toLocaleString() ?? "—"}`
                : `From $${listing.startingBid?.toLocaleString() ?? "—"}`;

            return (
              <Link
                key={listing.id}
                href={`/dashboard/listings/${listing.id}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="line-clamp-2">{listing.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-1">
                        {listing.description}
                      </CardDescription>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className={statusStyle.className}>
                          {statusStyle.label}
                        </Badge>
                        <Badge variant="outline" className={pricingStyle.className}>
                          {pricingStyle.label}
                        </Badge>
                        {listing.niches.slice(0, 2).map((n) => (
                          <Badge key={n.id} variant="secondary" className="text-xs">
                            {n.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        {listing.pricingType === "FIXED" ? (
                          <DollarSign className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Gavel className="h-5 w-5 text-amber-600" />
                        )}
                        {priceDisplay}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {listing._count.offers} offer{listing._count.offers !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
