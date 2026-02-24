"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2,
  CalendarDays,
  DollarSign,
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Listing {
  id: string;
  title: string;
  description: string;
  pricingType: string;
  fixedPrice: number | null;
  startingBid: number | null;
  reservePrice: number | null;
  auctionEndsAt: string | null;
  status: string;
  createdAt: string;
  niches: { id: string; name: string; slug: string }[];
}

interface Offer {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  createdAt: string;
  brandProfile: {
    companyName: string;
    handle: string;
    user: { name: string | null };
  };
}

const OFFER_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  OUTBID: { label: "Outbid", variant: "secondary" },
};

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: session, status: authStatus } = useSession();

  const [listing, setListing] = useState<Listing | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const listingId = params.id;

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/signin");
    } else if (
      authStatus === "authenticated" &&
      session?.user?.role !== "INFLUENCER"
    ) {
      router.push("/dashboard");
    }
  }, [authStatus, session, router]);

  const fetchData = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    try {
      const [listingRes, offersRes] = await Promise.all([
        fetch(`/api/listings/${listingId}`),
        fetch(`/api/listings/${listingId}/offers`),
      ]);

      if (listingRes.ok) {
        const data = await listingRes.json();
        setListing(data);
      }

      if (offersRes.ok) {
        const data = await offersRes.json();
        setOffers(data.offers ?? []);
      }
    } catch {
      toast.error("Failed to load listing data");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "INFLUENCER") {
      fetchData();
    }
  }, [authStatus, session, fetchData]);

  async function updateOfferStatus(
    offerId: string,
    newStatus: "ACCEPTED" | "REJECTED",
  ) {
    setUpdatingId(offerId);
    try {
      const res = await fetch(
        `/api/listings/${listingId}/offers/${offerId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update offer");
      }

      toast.success(
        `Offer ${newStatus === "ACCEPTED" ? "accepted" : "rejected"}`,
      );

      setOffers((prev) =>
        prev.map((o) =>
          o.id === offerId ? { ...o, status: newStatus } : o,
        ),
      );
      setListing((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus === "ACCEPTED" ? "SOLD" : prev.status,
            }
          : null,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCloseListing() {
    if (!listing || listing.status !== "OPEN") return;
    setClosing(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to close listing");
      }

      toast.success("Listing closed");
      setListing((prev) => (prev ? { ...prev, status: "CLOSED" } : null));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setClosing(false);
    }
  }

  if (
    authStatus === "loading" ||
    (authStatus === "authenticated" && loading)
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "INFLUENCER") return null;

  if (!listing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold">Listing not found</h2>
        <p className="mt-2 text-muted-foreground">
          This listing doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/dashboard/listings")}
        >
          Back to Listings
        </Button>
      </div>
    );
  }

  const priceDisplay =
    listing.pricingType === "FIXED"
      ? `$${listing.fixedPrice?.toLocaleString() ?? "—"}`
      : `Starting at $${listing.startingBid?.toLocaleString() ?? "—"}`;

  const pendingOffers = offers.filter((o) => o.status === "PENDING");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/listings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">Back to listings</span>
      </div>

      {/* Listing overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{listing.title}</CardTitle>
              <CardDescription className="mt-1">
                Created{" "}
                {new Date(listing.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  listing.status === "OPEN"
                    ? "default"
                    : listing.status === "SOLD"
                      ? "default"
                      : "secondary"
                }
              >
                {listing.status}
              </Badge>
              {listing.status === "OPEN" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseListing}
                  disabled={closing}
                >
                  {closing ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Close Listing
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-muted-foreground">
            {listing.description}
          </p>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              {listing.pricingType === "FIXED" ? (
                <DollarSign className="h-4 w-4 text-emerald-600" />
              ) : (
                <Gavel className="h-4 w-4 text-amber-600" />
              )}
              <span className="font-medium">{priceDisplay}</span>
            </div>
            {listing.pricingType === "AUCTION" && listing.auctionEndsAt && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span>
                  Ends:{" "}
                  {new Date(listing.auctionEndsAt).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </div>
            )}
          </div>

          {listing.niches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {listing.niches.map((n) => (
                <Badge key={n.id} variant="secondary">
                  {n.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Offers ({offers.length})
          </CardTitle>
          <CardDescription>
            Review and accept or reject offers from brands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No offers yet. Share your listing to attract brands!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {offers
                .sort((a, b) => b.amount - a.amount)
                .map((offer, i) => {
                  const config =
                    OFFER_STATUS_CONFIG[offer.status] ??
                    OFFER_STATUS_CONFIG.PENDING;

                  return (
                    <div key={offer.id}>
                      {i > 0 && <Separator className="my-5" />}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {offer.brandProfile.user.name ??
                                  offer.brandProfile.companyName}
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                {offer.brandProfile.companyName}
                              </span>
                            </div>
                            <p className="mt-1 text-lg font-bold text-emerald-600">
                              ${offer.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(offer.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>

                        {offer.message && (
                          <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                            {offer.message}
                          </p>
                        )}

                        {offer.status === "PENDING" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                updateOfferStatus(offer.id, "ACCEPTED")
                              }
                              disabled={updatingId === offer.id}
                            >
                              {updatingId === offer.id ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                              )}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateOfferStatus(offer.id, "REJECTED")
                              }
                              disabled={updatingId === offer.id}
                            >
                              {updatingId === offer.id ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="mr-1 h-4 w-4" />
                              )}
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
