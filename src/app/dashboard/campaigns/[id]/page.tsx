"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  User,
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

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  deadline: string | null;
  status: string;
  createdAt: string;
}

interface Application {
  id: string;
  pitch: string;
  status: string;
  createdAt: string;
  influencerProfile: {
    handle: string;
    user: { name: string; avatarUrl: string | null };
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default function ManageCampaignPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: session, status: authStatus } = useSession();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const campaignId = params.id;

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/signin");
    } else if (
      authStatus === "authenticated" &&
      session?.user?.role !== "BRAND"
    ) {
      router.push("/dashboard");
    }
  }, [authStatus, session, router]);

  const fetchData = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [campaignRes, appsRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch(`/api/campaigns/${campaignId}/applications`),
      ]);

      if (campaignRes.ok) {
        const data = await campaignRes.json();
        setCampaign(data);
      }

      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(data);
      }
    } catch {
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "BRAND") {
      fetchData();
    }
  }, [authStatus, session, fetchData]);

  async function updateApplicationStatus(
    applicationId: string,
    newStatus: "ACCEPTED" | "REJECTED",
  ) {
    setUpdatingId(applicationId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/applications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update application");
      }

      toast.success(
        `Application ${newStatus === "ACCEPTED" ? "accepted" : "rejected"}`,
      );

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app,
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setUpdatingId(null);
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

  if (!session?.user || session.user.role !== "BRAND") return null;

  if (!campaign) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold">Campaign not found</h2>
        <p className="mt-2 text-muted-foreground">
          This campaign doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/dashboard/brand")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      {/* Campaign overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{campaign.title}</CardTitle>
              <CardDescription className="mt-1">
                Created{" "}
                {new Date(campaign.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardDescription>
            </div>
            <Badge
              variant={
                campaign.status === "OPEN"
                  ? "default"
                  : campaign.status === "CLOSED"
                    ? "secondary"
                    : "outline"
              }
            >
              {campaign.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.description && (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {campaign.description}
            </p>
          )}

          <div className="flex flex-wrap gap-6 text-sm">
            {(campaign.budgetMin || campaign.budgetMax) && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>
                  {campaign.budgetMin && campaign.budgetMax
                    ? `$${campaign.budgetMin.toLocaleString()} – $${campaign.budgetMax.toLocaleString()}`
                    : campaign.budgetMin
                      ? `From $${campaign.budgetMin.toLocaleString()}`
                      : `Up to $${campaign.budgetMax!.toLocaleString()}`}
                </span>
              </div>
            )}
            {campaign.deadline && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span>
                  Deadline:{" "}
                  {new Date(campaign.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Applications ({applications.length})
          </CardTitle>
          <CardDescription>
            Review and manage influencer applications for this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No applications yet. Share your campaign to attract influencers!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {applications.map((app, i) => {
                const config = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.PENDING;

                return (
                  <div key={app.id}>
                    {i > 0 && <Separator className="my-5" />}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {app.influencerProfile.user.name}
                            </h4>
                            <span className="text-sm text-muted-foreground">
                              @{app.influencerProfile.handle}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Applied{" "}
                            {new Date(app.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>

                      <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                        {app.pitch}
                      </p>

                      {app.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              updateApplicationStatus(app.id, "ACCEPTED")
                            }
                            disabled={updatingId === app.id}
                          >
                            {updatingId === app.id ? (
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
                              updateApplicationStatus(app.id, "REJECTED")
                            }
                            disabled={updatingId === app.id}
                          >
                            {updatingId === app.id ? (
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
