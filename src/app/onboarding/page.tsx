"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Megaphone, Users } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [selected, setSelected] = useState<"INFLUENCER" | "BRAND" | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);

    const res = await fetch("/api/auth/select-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selected }),
    });

    if (res.ok) {
      await update();
      router.push("/dashboard/profile");
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">How will you use InfluenceBay?</h1>
          <p className="text-muted-foreground">
            Choose your role to get started. You can always change this later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selected === "INFLUENCER"
                ? "border-primary ring-2 ring-primary/20"
                : ""
            }`}
            onClick={() => setSelected("INFLUENCER")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>I&apos;m an Influencer</CardTitle>
              <CardDescription>
                Content creator looking for brand deals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Create your media kit and public profile</li>
                <li>Get discovered by brands and agencies</li>
                <li>Apply to sponsored campaigns</li>
                <li>Manage collaboration requests</li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selected === "BRAND"
                ? "border-primary ring-2 ring-primary/20"
                : ""
            }`}
            onClick={() => setSelected("BRAND")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Megaphone className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>I&apos;m a Brand</CardTitle>
              <CardDescription>
                Company looking for influencer partnerships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Discover and connect with influencers</li>
                <li>Post campaigns and review applications</li>
                <li>Browse verified media kits</li>
                <li>Manage sponsorship outreach</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!selected || loading}
            onClick={handleContinue}
            className="min-w-[200px]"
          >
            {loading ? "Setting up..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
