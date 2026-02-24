"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Send, Gavel, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OfferFormProps {
  listingId: string;
  pricingType: string;
  fixedPrice: number | null;
  startingBid: number | null;
  highestBid: number | null;
  auctionEndsAt: string | null;
}

export function OfferForm({
  listingId,
  pricingType,
  fixedPrice,
  startingBid,
  highestBid,
  auctionEndsAt,
}: OfferFormProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isBrand = session?.user?.role === "BRAND";

  const minAmount =
    pricingType === "AUCTION"
      ? (highestBid ?? startingBid ?? 0) + 1
      : 0;
  const suggestedAmount =
    pricingType === "FIXED"
      ? fixedPrice ?? 0
      : (highestBid ?? startingBid ?? 0) + 10;

  const isAuctionEnded =
    pricingType === "AUCTION" &&
    auctionEndsAt &&
    new Date(auctionEndsAt) < new Date();

  if (!session?.user) {
    return (
      <p className="text-sm text-muted-foreground">
        Please{" "}
        <a href="/auth/signin" className="font-medium text-primary underline">
          sign in
        </a>{" "}
        to make an offer on this listing.
      </p>
    );
  }

  if (!isBrand) {
    return (
      <p className="text-sm text-muted-foreground">
        Only brands can make offers on sponsorship listings.
      </p>
    );
  }

  if (isAuctionEnded) {
    return (
      <p className="text-sm text-muted-foreground">
        This auction has ended.
      </p>
    );
  }

  async function handleSubmit() {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (pricingType === "AUCTION" && numAmount <= (highestBid ?? startingBid ?? 0)) {
      toast.error(
        `Your bid must be higher than $${(highestBid ?? startingBid ?? 0).toLocaleString()}`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          message: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit offer");
      }

      toast.success(
        pricingType === "AUCTION"
          ? "Bid placed successfully!"
          : "Offer submitted! The creator will review it.",
      );
      setOpen(false);
      setAmount("");
      setMessage("");
      window.location.reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          {pricingType === "AUCTION" ? (
            <Gavel className="h-4 w-4" />
          ) : (
            <DollarSign className="h-4 w-4" />
          )}
          {pricingType === "AUCTION" ? "Place Bid" : "Make Offer"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {pricingType === "AUCTION" ? "Place Your Bid" : "Make an Offer"}
          </DialogTitle>
          <DialogDescription>
            {pricingType === "AUCTION"
              ? `Your bid must be higher than $${(highestBid ?? startingBid ?? 0).toLocaleString()}.`
              : `Suggested price: $${(fixedPrice ?? 0).toLocaleString()}. You can offer any amount.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount (USD) {pricingType === "AUCTION" && `(min $${minAmount})`}
            </Label>
            <Input
              id="amount"
              type="number"
              min={minAmount}
              step={pricingType === "AUCTION" ? 1 : 0.01}
              placeholder={suggestedAmount.toString()}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a note about your brand or collaboration goals..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pricingType === "AUCTION" ? "Place Bid" : "Submit Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
