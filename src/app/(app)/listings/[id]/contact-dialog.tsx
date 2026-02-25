"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
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

interface ContactDialogProps {
  listingId: string;
  listingTitle: string;
  brandUserId: string;
}

export function ContactDialog({
  listingId,
  listingTitle,
  brandUserId,
}: ContactDialogProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isInfluencer = session?.user?.role === "INFLUENCER";

  if (!session?.user) {
    return (
      <Button variant="outline" size="lg" asChild className="gap-2">
        <a href="/auth/signin">
          <MessageSquare className="h-4 w-4" />
          Sign in to Message
        </a>
      </Button>
    );
  }

  if (!isInfluencer) {
    return null;
  }

  async function handleSubmit() {
    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: brandUserId,
          message: message.trim(),
          listingId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to send message");
      }

      toast.success("Inquiry sent! The brand will respond when they can.");
      setOpen(false);
      setMessage("");
      router.push("/dashboard/messages");
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
        <Button variant="outline" size="lg" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Message Brand About Listing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message Brand</DialogTitle>
          <DialogDescription>
            Send an inquiry about &ldquo;{listingTitle}&rdquo;. The brand will
            receive your message and can respond through the messages page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="contact-message">Your Message</Label>
          <Textarea
            id="contact-message"
            placeholder="Introduce your brand and explain your interest in this sponsorship opportunity..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
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
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
