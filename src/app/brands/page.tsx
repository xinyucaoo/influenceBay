"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INDUSTRIES = [
  "Technology",
  "E-commerce",
  "Food & Beverage",
  "Health & Wellness",
  "Fashion",
  "Entertainment",
  "Finance",
  "Sports",
  "Education",
  "Automotive",
] as const;

const LIMIT = 12;

interface Brand {
  id: string;
  handle: string;
  companyName: string;
  logo: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  user: { name: string | null; avatarUrl: string | null };
}

interface BrandsResponse {
  brands: Brand[];
  total: number;
  page: number;
  totalPages: number;
}

export default function BrandsPage() {
  return (
    <Suspense>
      <BrandsPageInner />
    </Suspense>
  );
}

function BrandsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("q") ?? "";
  const currentIndustry = searchParams.get("industry") ?? "";
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [search, setSearch] = useState(currentQuery);
  const [data, setData] = useState<BrandsResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (updates.q !== undefined || updates.industry !== undefined) {
        params.delete("page");
      }
      router.push(`/brands?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    setSearch(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams();
    if (currentQuery) params.set("q", currentQuery);
    if (currentIndustry) params.set("industry", currentIndustry);
    params.set("page", String(currentPage));
    params.set("limit", String(LIMIT));

    fetch(`/api/brands?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [currentQuery, currentIndustry, currentPage]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ q: search });
  }

  function handleIndustryChange(value: string) {
    updateParams({ industry: value === "all" ? "" : value });
  }

  function initials(brand: Brand) {
    return (brand.companyName ?? "B")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      {/* Hero header */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-primary/10 pb-12 pt-20">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Discover <span className="text-primary">Brands</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Browse companies looking for influencer partnerships. Find the
            perfect brand to collaborate with and grow together.
          </p>

          {/* Search & filters */}
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brands by name..."
                className="h-11 pl-10 pr-4"
              />
            </form>
            <Select
              value={currentIndustry || "all"}
              onValueChange={handleIndustryChange}
            >
              <SelectTrigger className="h-11 w-full sm:w-48">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-5/6 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data || data.brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">No brands found</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              {currentQuery || currentIndustry
                ? "Try adjusting your search or filters to find what you're looking for."
                : "There are no brands listed yet. Check back soon!"}
            </p>
            {(currentQuery || currentIndustry) && (
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => router.push("/brands")}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(data.page - 1) * LIMIT + 1}–
                  {Math.min(data.page * LIMIT, data.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {data.total}
                </span>{" "}
                brand{data.total !== 1 && "s"}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brand/${brand.handle}`}
                  className="group"
                >
                  <Card className="h-full transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border shadow-sm">
                          <AvatarImage
                            src={
                              brand.logo ??
                              brand.user.avatarUrl ??
                              undefined
                            }
                            alt={brand.companyName}
                          />
                          <AvatarFallback className="text-sm font-semibold">
                            {initials(brand)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base group-hover:text-primary transition-colors">
                            {brand.companyName}
                          </CardTitle>
                          {brand.industry && (
                            <Badge
                              variant="secondary"
                              className="mt-1.5 text-xs"
                            >
                              {brand.industry}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {brand.description ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {brand.description}
                        </p>
                      ) : (
                        <p className="text-sm italic text-muted-foreground/60">
                          No description yet
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        View Profile &rarr;
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() =>
                    updateParams({ page: String(data.page - 1) })
                  }
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (data.totalPages <= 7) return true;
                      if (p === 1 || p === data.totalPages) return true;
                      return Math.abs(p - data.page) <= 1;
                    })
                    .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) {
                        acc.push("ellipsis");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "ellipsis" ? (
                        <span
                          key={`e-${idx}`}
                          className="px-2 text-muted-foreground"
                        >
                          &hellip;
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={
                            item === data.page ? "default" : "ghost"
                          }
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            updateParams({ page: String(item) })
                          }
                        >
                          {item}
                        </Button>
                      ),
                    )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() =>
                    updateParams({ page: String(data.page + 1) })
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
