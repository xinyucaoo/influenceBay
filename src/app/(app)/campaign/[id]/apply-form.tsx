"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface ApplyFormProps {
  campaignId: string;
}

export function ApplyForm({ campaignId }: ApplyFormProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isInfluencer = session?.user?.role === "INFLUENCER";

  if (!session?.user) {
    return (
      <p className="text-sm text-muted-foreground">
        Please{" "}
        <a href="/auth/signin" className="font-medium text-primary underline">
          sign in
        </a>{" "}
        to apply for this campaign.
      </p>
    );
  }

  if (!isInfluencer) {
    return (
      <p className="text-sm text-muted-foreground">
        Only influencers can apply to campaigns.
      </p>
    );
  }

  async function handleSubmit() {
    if (!pitch.trim()) {
      toast.error("Please write a pitch before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch: pitch.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit application");
      }

      toast.success("Application submitted! The brand will review your pitch.");
      setOpen(false);
      setPitch("");
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
          <Send className="h-4 w-4" />
          Apply Now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Your Application</DialogTitle>
          <DialogDescription>
            Write a compelling pitch explaining why you&apos;re a great fit for
            this campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="pitch">Your Pitch</Label>
          <Textarea
            id="pitch"
            placeholder="Tell the brand about your audience, content style, and why this campaign excites you..."
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            rows={6}
          />
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
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
