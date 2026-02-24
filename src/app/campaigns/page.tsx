"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Megaphone, CalendarDays, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface BrandProfile {
  handle: string;
  companyName: string;
  logo: string | null;
}

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
  brandProfile: BrandProfile;
  niches: Niche[];
}

interface CampaignsResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
}

const LIMIT = 12;

function formatBudget(min: number | null, max: number | null): string {
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  return "Flexible";
}

function CampaignsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q") ?? "";
  const niche = searchParams.get("niche") ?? "";
  const minBudget = searchParams.get("minBudget") ?? "";
  const maxBudget = searchParams.get("maxBudget") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const [searchInput, setSearchInput] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      if (!updates.page) params.set("page", "1");
      router.push(`/campaigns?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value, page: "" });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    fetch("/api/niches")
      .then((res) => res.json())
      .then((data) => setNiches(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (niche) params.set("niche", niche);
    if (minBudget) params.set("minBudget", minBudget);
    if (maxBudget) params.set("maxBudget", maxBudget);
    params.set("page", page.toString());
    params.set("limit", LIMIT.toString());

    fetch(`/api/campaigns?${params.toString()}`)
      .then((res) => res.json())
      .then((data: CampaignsResponse) => {
        setCampaigns(data.campaigns);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => {
        setCampaigns([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [q, niche, minBudget, maxBudget, page]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm w-fit mb-6">
            <Megaphone className="h-4 w-4" />
            <span>
              {total > 0
                ? `${total.toLocaleString()} campaigns`
                : "Discover campaigns"}
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find Your Next
            <span className="block bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
              Campaign Opportunity
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-100">
            Browse open campaigns from top brands. Apply with your pitch and
            start collaborating on exciting projects.
          </p>

          {/* Search bar */}
          <div className="relative mx-auto mt-8 max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns by title or keyword..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-14 rounded-full border-0 bg-white pl-12 pr-4 text-base shadow-xl ring-1 ring-white/20 placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-amber-300"
            />
          </div>
        </div>
      </section>

      {/* Filter row */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          <Select
            value={niche || undefined}
            onValueChange={(val) =>
              updateParams({ niche: val === "all" ? "" : val })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Niches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {niches.map((n) => (
                <SelectItem key={n.id} value={n.slug}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Min budget"
            value={minBudget}
            onChange={(e) => updateParams({ minBudget: e.target.value })}
            className="w-[140px]"
          />

          <Input
            type="number"
            placeholder="Max budget"
            value={maxBudget}
            onChange={(e) => updateParams({ maxBudget: e.target.value })}
            className="w-[140px]"
          />

          {(q || niche || minBudget || maxBudget) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/campaigns")}
              className="ml-auto text-muted-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="space-y-2">
                    <div className="h-5 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-5 w-16 rounded-full bg-muted" />
                    <div className="h-5 w-20 rounded-full bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Megaphone className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">No campaigns found</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Try adjusting your search or filters to discover more campaigns.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => router.push("/campaigns")}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">{total}</span>{" "}
                campaign{total !== 1 && "s"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaign/${campaign.id}`}
                  className="group"
                >
                  <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-200">
                    <CardHeader>
                      <CardTitle className="text-base group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {campaign.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        by {campaign.brandProfile.companyName}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {campaign.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {campaign.description}
                        </p>
                      )}

                      {campaign.niches.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {campaign.niches.slice(0, 3).map((n) => (
                            <Badge
                              key={n.slug}
                              variant="secondary"
                              className="text-xs"
                            >
                              {n.name}
                            </Badge>
                          ))}
                          {campaign.niches.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{campaign.niches.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 border-t pt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium">
                            {formatBudget(campaign.budgetMin, campaign.budgetMax)}
                          </span>
                        </div>
                        {campaign.deadline && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              {new Date(campaign.deadline).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        className="w-full group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors"
                        tabIndex={-1}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() =>
                    updateParams({ page: (page - 1).toString() })
                  }
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page{" "}
                  <span className="font-semibold text-foreground">{page}</span>{" "}
                  of{" "}
                  <span className="font-semibold text-foreground">
                    {totalPages}
                  </span>
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() =>
                    updateParams({ page: (page + 1).toString() })
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense>
      <CampaignsPageContent />
    </Suspense>
  );
}
