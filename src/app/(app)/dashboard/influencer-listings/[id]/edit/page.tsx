"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Niche {
  id: string;
  name: string;
  slug: string;
}

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
  niches: { id: string; name: string; slug: string }[];
}

export default function EditInfluencerListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: session, status } = useSession();

  const [listing, setListing] = useState<Listing | null>(null);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fixedPrice, setFixedPrice] = useState("");
  const [startingBid, setStartingBid] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [auctionEndsAt, setAuctionEndsAt] = useState("");
  const [selectedNicheIds, setSelectedNicheIds] = useState<string[]>([]);

  const listingId = params.id;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (
      status === "authenticated" &&
      session?.user?.role !== "INFLUENCER"
    ) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!listingId) return;
    fetch(`/api/influencer-listings/${listingId}`)
      .then((r) => r.json())
      .then((data: Listing) => {
        setListing(data);
        setTitle(data.title);
        setDescription(data.description);
        setFixedPrice(data.fixedPrice?.toString() ?? "");
        setStartingBid(data.startingBid?.toString() ?? "");
        setReservePrice(data.reservePrice?.toString() ?? "");
        setAuctionEndsAt(
          data.auctionEndsAt
            ? new Date(data.auctionEndsAt).toISOString().slice(0, 16)
            : ""
        );
        setSelectedNicheIds(data.niches?.map((n) => n.id) ?? []);
      })
      .catch(() => toast.error("Failed to load listing"))
      .finally(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    fetch("/api/niches")
      .then((r) => r.json())
      .then((data: Niche[]) => setNiches(data))
      .catch(() => {});
  }, []);

  function toggleNiche(id: string) {
    setSelectedNicheIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listing) return;

    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Description must be at least 20 characters.");
      return;
    }

    const pricingType = listing.pricingType as "FIXED" | "AUCTION";
    if (pricingType === "FIXED") {
      const price = parseFloat(fixedPrice);
      if (isNaN(price) || price < 0) {
        toast.error("Please enter a valid fixed price.");
        return;
      }
    } else {
      const bid = parseFloat(startingBid);
      if (isNaN(bid) || bid < 0) {
        toast.error("Please enter a valid starting bid.");
        return;
      }
      if (!auctionEndsAt) {
        toast.error("Auction end date is required.");
        return;
      }
      const endDate = new Date(auctionEndsAt);
      if (endDate <= new Date()) {
        toast.error("Auction must end in the future.");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        nicheIds: selectedNicheIds.length ? selectedNicheIds : undefined,
      };

      if (pricingType === "FIXED") {
        body.fixedPrice = parseFloat(fixedPrice);
      } else {
        body.startingBid = parseFloat(startingBid);
        body.auctionEndsAt = new Date(auctionEndsAt).toISOString();
        if (reservePrice) {
          const reserve = parseFloat(reservePrice);
          if (!isNaN(reserve) && reserve >= 0) {
            body.reservePrice = reserve;
          }
        }
      }

      const res = await fetch(`/api/influencer-listings/${listingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update listing");
      }

      toast.success("Listing updated!");
      router.push(`/dashboard/influencer-listings/${listingId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    status === "loading" ||
    (status === "authenticated" && session?.user?.role !== "INFLUENCER")
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading || !listing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (listing.status !== "OPEN") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-muted-foreground">
          Only open listings can be edited. This listing is {listing.status.toLowerCase()}.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/dashboard/influencer-listings/${listingId}`}>
            Back to Listing
          </Link>
        </Button>
      </div>
    );
  }

  const pricingType = listing.pricingType as "FIXED" | "AUCTION";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/influencer-listings/${listingId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">Back to listing</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Listing</CardTitle>
          <CardDescription>
            Update your sponsorship opportunity. Changes will be visible to brands immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Family vlog sponsorship - kids product integration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your content, audience, deliverables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>

            {pricingType === "FIXED" ? (
              <div className="space-y-2">
                <Label htmlFor="fixedPrice">Expected Quote (USD)</Label>
                <Input
                  id="fixedPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="500"
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startingBid">Starting Bid (USD)</Label>
                  <Input
                    id="startingBid"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="200"
                    value={startingBid}
                    onChange={(e) => setStartingBid(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservePrice">Reserve Price (USD, optional)</Label>
                  <Input
                    id="reservePrice"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="500"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="auctionEndsAt">Auction Ends</Label>
                  <Input
                    id="auctionEndsAt"
                    type="datetime-local"
                    value={auctionEndsAt}
                    onChange={(e) => setAuctionEndsAt(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Label>Niches</Label>
              <div className="flex flex-wrap gap-2">
                {niches.map((niche) => {
                  const selected = selectedNicheIds.includes(niche.id);
                  return (
                    <Badge
                      key={niche.id}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer select-none transition-colors"
                      onClick={() => toggleNiche(niche.id)}
                    >
                      {niche.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
