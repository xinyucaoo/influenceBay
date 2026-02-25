"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Niche {
  id: string;
  name: string;
  slug: string;
}

interface Campaign {
  id: string;
  title: string;
  status: string;
}

export default function NewListingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [niches, setNiches] = useState<Niche[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);

  const [campaignId, setCampaignId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricingType, setPricingType] = useState<"FIXED" | "AUCTION">("FIXED");
  const [fixedPrice, setFixedPrice] = useState("");
  const [startingBid, setStartingBid] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [auctionEndsAt, setAuctionEndsAt] = useState("");
  const [selectedNicheIds, setSelectedNicheIds] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (
      status === "authenticated" &&
      session?.user?.role !== "BRAND"
    ) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    fetch("/api/niches")
      .then((r) => r.json())
      .then((data: Niche[]) => setNiches(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/campaigns?mine=true&limit=100")
      .then((r) => r.json())
      .then((data: { campaigns: Campaign[] }) => setCampaigns(data.campaigns ?? []))
      .catch(() => {});
  }, []);

  function toggleNiche(id: string) {
    setSelectedNicheIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!campaignId) {
      toast.error("Please select a campaign.");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Description must be at least 20 characters.");
      return;
    }

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
        campaignId,
        title: title.trim(),
        description: description.trim(),
        pricingType,
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

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create listing");
      }

      toast.success("Listing created!");
      router.push("/dashboard/listings");
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
    (status === "authenticated" && session?.user?.role !== "BRAND")
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Sponsorship Listing</CardTitle>
          <CardDescription>
            Add a sponsorship opportunity to one of your campaigns. Influencers can browse and make offers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign</Label>
              <Select
                value={campaignId}
                onValueChange={setCampaignId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Upcoming family vlog - kids product integration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your content, audience, deliverables, and what brands can expect..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-4">
              <Label>Pricing Type</Label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="pricingType"
                    checked={pricingType === "FIXED"}
                    onChange={() => setPricingType("FIXED")}
                    className="h-4 w-4"
                  />
                  Fixed Price
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="pricingType"
                    checked={pricingType === "AUCTION"}
                    onChange={() => setPricingType("AUCTION")}
                    className="h-4 w-4"
                  />
                  Auction
                </label>
              </div>
            </div>

            {pricingType === "FIXED" ? (
              <div className="space-y-2">
                <Label htmlFor="fixedPrice">Fixed Price (USD)</Label>
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
              <div>
                <Label>Niches</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select content themes to help influencers find your listing.
                </p>
              </div>
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
                {niches.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Loading niches...
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Listing
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
