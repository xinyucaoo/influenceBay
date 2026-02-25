"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SocialAccount {
  platform: string;
  handle: string;
  followerCount: number;
}

interface Niche {
  id: string;
  name: string;
  slug: string;
}

interface Influencer {
  id: string;
  handle: string;
  bio: string;
  profileViews: number;
  user: { name: string; avatarUrl: string };
  socialAccounts: SocialAccount[];
  niches: Niche[];
  pricing: Record<string, unknown>;
}

interface InfluencersResponse {
  influencers: Influencer[];
  total: number;
  page: number;
  totalPages: number;
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function getTotalFollowers(accounts: SocialAccount[]): number {
  return accounts.reduce((sum, a) => sum + a.followerCount, 0);
}

function getTopPlatform(accounts: SocialAccount[]): SocialAccount | null {
  if (accounts.length === 0) return null;
  return accounts.reduce((top, a) =>
    a.followerCount > top.followerCount ? a : top
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const PLATFORMS = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "Twitter" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "followers", label: "Most Followers" },
  { value: "price", label: "Lowest Price" },
];

const LIMIT = 12;

function InfluencersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q") ?? "";
  const niche = searchParams.get("niche") ?? "";
  const platform = searchParams.get("platform") ?? "";
  const sort = searchParams.get("sort") ?? "recent";
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
      router.push(`/influencers?${params.toString()}`);
    },
    [searchParams, router]
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
    if (platform) params.set("platform", platform);
    if (sort) params.set("sort", sort);
    params.set("page", page.toString());
    params.set("limit", LIMIT.toString());

    fetch(`/api/influencers?${params.toString()}`)
      .then((res) => res.json())
      .then((data: InfluencersResponse) => {
        setInfluencers(data.influencers);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => {
        setInfluencers([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [q, niche, platform, sort, page]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Influencers
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {total > 0
                  ? `${total.toLocaleString()} creators`
                  : "Browse creators by niche and platform"}
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search creators..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filter row */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </div>

          <Select
            value={niche || undefined}
            onValueChange={(val) =>
              updateParams({ niche: val === "all" ? "" : val })
            }
          >
            <SelectTrigger className="h-9 w-[160px]">
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

          <Select
            value={platform || undefined}
            onValueChange={(val) =>
              updateParams({ platform: val === "all" ? "" : val })
            }
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort}
            onValueChange={(val) => updateParams({ sort: val })}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(q || niche || platform || sort !== "recent") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/influencers")}
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
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted" />
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
        ) : influencers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">
              No influencers found
            </h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Try adjusting your search or filters to discover more creators.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => router.push("/influencers")}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {influencers.map((inf) => {
                const topPlatform = getTopPlatform(inf.socialAccounts);
                const totalFollowers = getTotalFollowers(inf.socialAccounts);

                return (
                  <Link
                    key={inf.id}
                    href={`/influencer/${inf.handle}`}
                    className="group"
                  >
                    <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-violet-200">
                      <CardHeader className="flex flex-row items-center gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-violet-100 ring-offset-2">
                          <AvatarImage
                            src={inf.user.avatarUrl}
                            alt={inf.user.name}
                          />
                          <AvatarFallback className="bg-violet-100 text-violet-700 font-semibold">
                            {getInitials(inf.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base group-hover:text-violet-700 transition-colors">
                            {inf.user.name}
                          </CardTitle>
                          <p className="truncate text-sm text-muted-foreground">
                            @{inf.handle}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {inf.bio && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {inf.bio}
                          </p>
                        )}

                        {inf.niches.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {inf.niches.slice(0, 3).map((n) => (
                              <Badge
                                key={n.slug}
                                variant="secondary"
                                className="text-xs"
                              >
                                {n.name}
                              </Badge>
                            ))}
                            {inf.niches.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{inf.niches.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t pt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Total Followers
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              {formatFollowers(totalFollowers)}
                            </p>
                          </div>
                          {topPlatform && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                Top Platform
                              </p>
                              <p className="text-sm font-semibold capitalize text-violet-600">
                                {topPlatform.platform}
                              </p>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          className="w-full group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-colors"
                          tabIndex={-1}
                        >
                          View Profile
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
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
                  <span className="font-semibold text-foreground">{page}</span>
                  {" "}of{" "}
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

export default function InfluencersPage() {
  return (
    <Suspense>
      <InfluencersPageContent />
    </Suspense>
  );
}
