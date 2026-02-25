"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Megaphone,
  ArrowRight,
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

interface Application {
  id: string;
  pitch: string;
  status: string;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    status: string;
    brandProfile: {
      companyName: string;
      handle: string;
      user: { name: string | null; avatarUrl: string | null };
    };
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: { label: "Pending", variant: "outline", icon: Clock },
  ACCEPTED: { label: "Accepted", variant: "default", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "INFLUENCER") {
      fetch("/api/applications")
        .then((res) => res.json())
        .then((data) => setApplications(data.applications ?? []))
        .finally(() => setLoading(false));
    } else if (authStatus === "authenticated" && session?.user?.role !== "INFLUENCER") {
      router.push("/dashboard");
    }
  }, [authStatus, session, router]);

  if (authStatus === "loading" || (authStatus === "authenticated" && loading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "INFLUENCER") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
        <p className="mt-1 text-muted-foreground">
          View and manage your campaign applications
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <CardTitle className="text-lg">No applications yet</CardTitle>
            <CardDescription className="mt-2">
              Browse campaigns and apply to get started. Your applications will appear here.
            </CardDescription>
            <Button asChild className="mt-6" size="lg">
              <Link href="/campaigns" className="gap-2">
                <Megaphone className="h-4 w-4" />
                Browse Campaigns
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const config = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = config.icon;
            return (
              <Card key={app.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        <Link
                          href={`/campaign/${app.campaign.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {app.campaign.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        {app.campaign.brandProfile.companyName}
                      </CardDescription>
                    </div>
                    <Badge variant={config.variant} className="shrink-0 gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                    {app.pitch}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Applied{" "}
                      {new Date(app.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <Button asChild variant="ghost" size="sm" className="h-8 gap-1">
                      <Link href={`/campaign/${app.campaign.id}`}>
                        View Campaign
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
