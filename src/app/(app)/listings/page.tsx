"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Tag,
  CalendarDays,
  DollarSign,
  Gavel,
} from "lucide-react";
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

interface Niche {
  id: string;
  name: string;
  slug: string;
}

interface Campaign {
  id: string;
  title: string;
  brandProfile: {
    id: string;
    handle: string;
    companyName: string;
    logo: string | null;
    user: { name: string | null; avatarUrl: string | null };
  };
}

interface Listing {
  id: string;
  title: string;
  description: string;
  pricingType: string;
  fixedPrice: number | null;
  startingBid: number | null;
  auctionEndsAt: string | null;
  status: string;
  createdAt: string;
  campaign: Campaign | null;
  niches: Niche[];
}

interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

const LIMIT = 12;

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toLocaleString()}`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ListingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q") ?? "";
  const niche = searchParams.get("niche") ?? "";
  const pricingType = searchParams.get("pricingType") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
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
      router.push(`/listings?${params.toString()}`);
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
    if (pricingType) params.set("pricingType", pricingType);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    params.set("page", page.toString());
    params.set("limit", LIMIT.toString());

    fetch(`/api/listings?${params.toString()}`)
      .then((res) => res.json())
      .then((data: ListingsResponse) => {
        setListings(data.listings);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => {
        setListings([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [q, niche, pricingType, minPrice, maxPrice, page]);

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
                Sponsorship Listings
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {total > 0
                  ? `${total.toLocaleString()} listings`
                  : "Browse opportunities from creators"}
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
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
            value={pricingType || undefined}
            onValueChange={(val) =>
              updateParams({ pricingType: val === "all" ? "" : val })
            }
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="FIXED">Fixed Price</SelectItem>
              <SelectItem value="AUCTION">Auction</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => updateParams({ minPrice: e.target.value })}
            className="h-9 w-[100px]"
          />

          <Input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => updateParams({ maxPrice: e.target.value })}
            className="h-9 w-[100px]"
          />

          {(q || niche || pricingType || minPrice || maxPrice) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/listings")}
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
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Tag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">No listings found</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Try adjusting your search or filters to discover more opportunities.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => router.push("/listings")}
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
                listing{total !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const camp = listing.campaign as Campaign | null;
                const brand = camp?.brandProfile;
                const priceDisplay =
                  listing.pricingType === "FIXED"
                    ? formatPrice(listing.fixedPrice)
                    : `From ${formatPrice(listing.startingBid)}`;

                return (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="group"
                  >
                    <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-200">
                      <CardHeader className="flex flex-row items-start gap-4">
                        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-amber-100">
                          <AvatarImage
                            src={brand?.user?.avatarUrl ?? undefined}
                            alt={brand?.user?.name ?? undefined}
                          />
                          <AvatarFallback className="bg-amber-100 text-amber-700 text-sm font-semibold">
                            {getInitials(brand?.user?.name ?? brand?.companyName ?? null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base group-hover:text-amber-700 transition-colors line-clamp-2">
                            {listing.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {brand?.companyName ?? `@${brand?.handle}`}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {listing.description && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {listing.description}
                          </p>
                        )}

                        {listing.niches.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {listing.niches.slice(0, 3).map((n) => (
                              <Badge
                                key={n.slug}
                                variant="secondary"
                                className="text-xs"
                              >
                                {n.name}
                              </Badge>
                            ))}
                            {listing.niches.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{listing.niches.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t pt-4">
                          <div className="flex items-center gap-2">
                            {listing.pricingType === "FIXED" ? (
                              <DollarSign className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Gavel className="h-4 w-4 text-amber-600" />
                            )}
                            <span className="font-medium">{priceDisplay}</span>
                          </div>
                        </div>
                        {listing.pricingType === "AUCTION" &&
                          listing.auctionEndsAt && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Ends{" "}
                              {new Date(
                                listing.auctionEndsAt,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                          )}

                        <Button
                          variant="outline"
                          className="w-full group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-colors"
                          tabIndex={-1}
                        >
                          View Details
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

export default function ListingsPage() {
  return (
    <Suspense>
      <ListingsPageContent />
    </Suspense>
  );
}
