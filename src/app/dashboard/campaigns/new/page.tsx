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

interface Niche {
  id: string;
  name: string;
  slug: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [niches, setNiches] = useState<Niche[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
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

  function toggleNiche(id: string) {
    setSelectedNicheIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Campaign title is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          requirements: requirements.trim() || undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          deadline: deadline || undefined,
          nicheIds: selectedNicheIds.length ? selectedNicheIds : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create campaign");
      }

      toast.success("Campaign created!");
      router.push("/dashboard/brand");
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
          <CardTitle className="text-2xl">Create a New Campaign</CardTitle>
          <CardDescription>
            Set up your campaign details so influencers can discover and apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Campaign Title</Label>
              <Input
                id="title"
                placeholder="e.g. Summer Product Launch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what the campaign is about, goals, and expectations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
              />
            </div>

            {/* Requirements */}
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                placeholder="What do you need from influencers? Minimum followers, content type, platforms..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
              />
            </div>

            {/* Budget */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budgetMin">Minimum Budget (USD)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  min={0}
                  placeholder="500"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax">Maximum Budget (USD)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  min={0}
                  placeholder="5000"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            {/* Niches */}
            <div className="space-y-4">
              <div>
                <Label>Niches</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select the niches relevant to this campaign.
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

            {/* Submit */}
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
