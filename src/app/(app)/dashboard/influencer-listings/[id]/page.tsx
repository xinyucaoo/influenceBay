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
  Pencil,
  Trash2,
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
  highestBid: number | null;
}

interface Bid {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  createdAt: string;
  brandProfile: {
    id: string;
    companyName: string;
    handle: string;
    user: { name: string | null; avatarUrl: string | null };
  };
}

const BID_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  OUTBID: { label: "Outbid", variant: "secondary" },
};

export default function InfluencerListingDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: session, status: authStatus } = useSession();

  const [listing, setListing] = useState<Listing | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      const [listingRes, bidsRes] = await Promise.all([
        fetch(`/api/influencer-listings/${listingId}`),
        fetch(`/api/influencer-listings/${listingId}/bids`),
      ]);

      if (listingRes.ok) {
        const data = await listingRes.json();
        setListing(data);
      }

      if (bidsRes.ok) {
        const data = await bidsRes.json();
        setBids(data.bids ?? []);
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

  async function updateBidStatus(
    bidId: string,
    newStatus: "ACCEPTED" | "REJECTED",
  ) {
    setUpdatingId(bidId);
    try {
      const res = await fetch(
        `/api/influencer-listings/${listingId}/bids/${bidId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update bid");
      }

      toast.success(
        `Bid ${newStatus === "ACCEPTED" ? "accepted" : "rejected"}`,
      );

      setBids((prev) =>
        prev.map((b) =>
          b.id === bidId ? { ...b, status: newStatus } : b,
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
      const res = await fetch(`/api/influencer-listings/${listingId}`, {
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

  async function handleDelete() {
    if (!listing) return;
    if (!confirm("Are you sure you want to delete this listing?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/influencer-listings/${listingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete listing");
      }

      toast.success("Listing deleted");
      router.push("/dashboard/influencer-listings");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setDeleting(false);
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
          onClick={() => router.push("/dashboard/influencer-listings")}
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

  const pendingBids = bids.filter((b) => b.status === "PENDING");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/influencer-listings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">Back to my listings</span>
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
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={`/dashboard/influencer-listings/${listingId}/edit`}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-destructive hover:text-destructive"
                  >
                    {deleting ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </>
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
            {listing.pricingType === "AUCTION" && listing.highestBid != null && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Highest bid:</span>
                <span className="font-semibold">
                  ${listing.highestBid.toLocaleString()}
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

      {/* Bids from brands - only for auction listings */}
      {listing.pricingType === "AUCTION" && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Bids ({bids.length})
          </CardTitle>
          <CardDescription>
            Review and accept or reject bids from brands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bids.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No bids yet. Share your listing to attract brands!
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/influencer-listings">Browse as brand</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {bids
                .sort((a, b) => b.amount - a.amount)
                .map((bid, i) => {
                  const config =
                    BID_STATUS_CONFIG[bid.status] ??
                    BID_STATUS_CONFIG.PENDING;

                  return (
                    <div key={bid.id}>
                      {i > 0 && <Separator className="my-5" />}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {bid.brandProfile.user?.name ??
                                  bid.brandProfile.companyName}
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                @{bid.brandProfile.handle}
                              </span>
                            </div>
                            <p className="mt-1 text-lg font-bold text-emerald-600">
                              ${bid.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(bid.createdAt).toLocaleDateString(
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

                        {bid.message && (
                          <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                            {bid.message}
                          </p>
                        )}

                        {bid.status === "PENDING" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                updateBidStatus(bid.id, "ACCEPTED")
                              }
                              disabled={updatingId === bid.id}
                            >
                              {updatingId === bid.id ? (
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
                                updateBidStatus(bid.id, "REJECTED")
                              }
                              disabled={updatingId === bid.id}
                            >
                              {updatingId === bid.id ? (
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
      )}
    </div>
  );
}
