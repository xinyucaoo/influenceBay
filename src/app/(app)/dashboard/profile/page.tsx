"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Platform = "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "TWITTER";

interface SocialAccount {
  platform: Platform;
  handle: string;
  followerCount: number;
  profileUrl: string;
}

interface Niche {
  id: string;
  name: string;
  slug: string;
}

interface InfluencerState {
  handle: string;
  bio: string;
  socialAccounts: SocialAccount[];
  selectedNicheIds: string[];
  pricing: {
    dedicatedVideo: string;
    integration: string;
    socialPost: string;
  };
  portfolioLinks: string[];
}

interface BrandState {
  handle: string;
  companyName: string;
  website: string;
  industry: string;
  description: string;
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "YOUTUBE", label: "YouTube" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "TWITTER", label: "Twitter / X" },
];

const defaultInfluencer: InfluencerState = {
  handle: "",
  bio: "",
  socialAccounts: [],
  selectedNicheIds: [],
  pricing: { dedicatedVideo: "", integration: "", socialPost: "" },
  portfolioLinks: [],
};

const defaultBrand: BrandState = {
  handle: "",
  companyName: "",
  website: "",
  industry: "",
  description: "",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role as "INFLUENCER" | "BRAND" | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(true);

  const [influencer, setInfluencer] =
    useState<InfluencerState>(defaultInfluencer);
  const [brand, setBrand] = useState<BrandState>(defaultBrand);
  const [niches, setNiches] = useState<Niche[]>([]);

  const fetchProfile = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    try {
      const endpoint =
        role === "INFLUENCER"
          ? "/api/profile/influencer"
          : "/api/profile/brand";
      const res = await fetch(endpoint);
      const data = await res.json();

      if (data && data.id) {
        setIsNew(false);
        if (role === "INFLUENCER") {
          setInfluencer({
            handle: data.handle ?? "",
            bio: data.bio ?? "",
            socialAccounts:
              data.socialAccounts?.map(
                (sa: SocialAccount & { id?: string }) => ({
                  platform: sa.platform,
                  handle: sa.handle,
                  followerCount: sa.followerCount,
                  profileUrl: sa.profileUrl ?? "",
                })
              ) ?? [],
            selectedNicheIds:
              data.niches?.map((n: { id: string }) => n.id) ?? [],
            pricing: {
              dedicatedVideo: String(data.pricing?.dedicatedVideo ?? ""),
              integration: String(data.pricing?.integration ?? ""),
              socialPost: String(data.pricing?.socialPost ?? ""),
            },
            portfolioLinks: data.portfolioLinks ?? [],
          });
        } else {
          setBrand({
            handle: data.handle ?? "",
            companyName: data.companyName ?? "",
            website: data.website ?? "",
            industry: data.industry ?? "",
            description: data.description ?? "",
          });
        }
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && role) {
      fetchProfile();
      if (role === "INFLUENCER") {
        fetch("/api/niches")
          .then((r) => r.json())
          .then((data: Niche[]) => setNiches(data))
          .catch(() => {});
      }
    }
  }, [status, role, router, fetchProfile]);

  // --- Social accounts helpers ---
  function addSocialAccount() {
    setInfluencer((prev) => ({
      ...prev,
      socialAccounts: [
        ...prev.socialAccounts,
        { platform: "INSTAGRAM", handle: "", followerCount: 0, profileUrl: "" },
      ],
    }));
  }

  function removeSocialAccount(index: number) {
    setInfluencer((prev) => ({
      ...prev,
      socialAccounts: prev.socialAccounts.filter((_, i) => i !== index),
    }));
  }

  function updateSocialAccount(
    index: number,
    field: keyof SocialAccount,
    value: string | number
  ) {
    setInfluencer((prev) => ({
      ...prev,
      socialAccounts: prev.socialAccounts.map((sa, i) =>
        i === index ? { ...sa, [field]: value } : sa
      ),
    }));
  }

  // --- Portfolio links helpers ---
  function addPortfolioLink() {
    setInfluencer((prev) => ({
      ...prev,
      portfolioLinks: [...prev.portfolioLinks, ""],
    }));
  }

  function removePortfolioLink(index: number) {
    setInfluencer((prev) => ({
      ...prev,
      portfolioLinks: prev.portfolioLinks.filter((_, i) => i !== index),
    }));
  }

  function updatePortfolioLink(index: number, value: string) {
    setInfluencer((prev) => ({
      ...prev,
      portfolioLinks: prev.portfolioLinks.map((l, i) =>
        i === index ? value : l
      ),
    }));
  }

  // --- Niche toggle ---
  function toggleNiche(id: string) {
    setInfluencer((prev) => ({
      ...prev,
      selectedNicheIds: prev.selectedNicheIds.includes(id)
        ? prev.selectedNicheIds.filter((n) => n !== id)
        : [...prev.selectedNicheIds, id],
    }));
  }

  // --- Submit ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const isInfluencer = role === "INFLUENCER";
      const endpoint = isInfluencer
        ? "/api/profile/influencer"
        : "/api/profile/brand";
      const method = isNew ? "POST" : "PUT";

      let body: Record<string, unknown>;

      if (isInfluencer) {
        body = {
          handle: influencer.handle,
          bio: influencer.bio || undefined,
          socialAccounts: influencer.socialAccounts.length
            ? influencer.socialAccounts
            : undefined,
          nicheIds: influencer.selectedNicheIds.length
            ? influencer.selectedNicheIds
            : undefined,
          pricing: {
            dedicatedVideo: influencer.pricing.dedicatedVideo
              ? Number(influencer.pricing.dedicatedVideo)
              : undefined,
            integration: influencer.pricing.integration
              ? Number(influencer.pricing.integration)
              : undefined,
            socialPost: influencer.pricing.socialPost
              ? Number(influencer.pricing.socialPost)
              : undefined,
          },
          portfolioLinks: influencer.portfolioLinks.filter(Boolean).length
            ? influencer.portfolioLinks.filter(Boolean)
            : undefined,
        };
      } else {
        body = {
          handle: brand.handle,
          companyName: brand.companyName,
          website: brand.website || undefined,
          industry: brand.industry || undefined,
          description: brand.description || undefined,
        };
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Something went wrong");
      }

      toast.success(isNew ? "Profile created!" : "Profile updated!");
      if (isNew) setIsNew(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  // --- Loading / redirect guard ---
  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user || !role) return null;

  // ============================================================
  //  INFLUENCER FORM
  // ============================================================
  if (role === "INFLUENCER") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isNew ? "Create Your Profile" : "Edit Your Profile"}
            </CardTitle>
            <CardDescription>
              Build your media kit so brands can discover you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Info</h3>
                <div className="space-y-2">
                  <Label htmlFor="handle">Handle</Label>
                  <Input
                    id="handle"
                    placeholder="your_handle"
                    value={influencer.handle}
                    onChange={(e) =>
                      setInfluencer((p) => ({ ...p, handle: e.target.value }))
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    3-30 characters, letters, numbers, underscores, hyphens only.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell brands about yourself..."
                    value={influencer.bio}
                    onChange={(e) =>
                      setInfluencer((p) => ({ ...p, bio: e.target.value }))
                    }
                    rows={4}
                  />
                </div>
              </section>

              {/* Social Accounts */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Social Accounts</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSocialAccount}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Account
                  </Button>
                </div>

                {influencer.socialAccounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No social accounts yet. Click &ldquo;Add Account&rdquo; to
                    get started.
                  </p>
                )}

                {influencer.socialAccounts.map((sa, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2"
                  >
                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select
                        value={sa.platform}
                        onValueChange={(val: string) =>
                          updateSocialAccount(idx, "platform", val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Handle</Label>
                      <Input
                        placeholder="@username"
                        value={sa.handle}
                        onChange={(e) =>
                          updateSocialAccount(idx, "handle", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Followers</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="10000"
                        value={sa.followerCount || ""}
                        onChange={(e) =>
                          updateSocialAccount(
                            idx,
                            "followerCount",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Profile URL</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://..."
                          value={sa.profileUrl}
                          onChange={(e) =>
                            updateSocialAccount(
                              idx,
                              "profileUrl",
                              e.target.value
                            )
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSocialAccount(idx)}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {/* Niches */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold">Niches</h3>
                <p className="text-sm text-muted-foreground">
                  Select the niches that best describe your content.
                </p>
                <div className="flex flex-wrap gap-2">
                  {niches.map((niche) => {
                    const selected = influencer.selectedNicheIds.includes(
                      niche.id
                    );
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
              </section>

              {/* Pricing */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing (USD)</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="dedicatedVideo">Dedicated Video</Label>
                    <Input
                      id="dedicatedVideo"
                      type="number"
                      min={0}
                      placeholder="500"
                      value={influencer.pricing.dedicatedVideo}
                      onChange={(e) =>
                        setInfluencer((p) => ({
                          ...p,
                          pricing: {
                            ...p.pricing,
                            dedicatedVideo: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="integration">Integration</Label>
                    <Input
                      id="integration"
                      type="number"
                      min={0}
                      placeholder="250"
                      value={influencer.pricing.integration}
                      onChange={(e) =>
                        setInfluencer((p) => ({
                          ...p,
                          pricing: {
                            ...p.pricing,
                            integration: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="socialPost">Social Post</Label>
                    <Input
                      id="socialPost"
                      type="number"
                      min={0}
                      placeholder="100"
                      value={influencer.pricing.socialPost}
                      onChange={(e) =>
                        setInfluencer((p) => ({
                          ...p,
                          pricing: {
                            ...p.pricing,
                            socialPost: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Portfolio Links */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Portfolio Links</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPortfolioLink}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Link
                  </Button>
                </div>

                {influencer.portfolioLinks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No portfolio links yet. Showcase your best work!
                  </p>
                )}

                {influencer.portfolioLinks.map((link, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="https://example.com/my-work"
                      value={link}
                      onChange={(e) => updatePortfolioLink(idx, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePortfolioLink(idx)}
                      className="shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </section>

              {/* Submit */}
              <Button type="submit" disabled={saving} className="w-full">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isNew ? "Create Profile" : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  //  BRAND FORM
  // ============================================================
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isNew ? "Create Your Brand Profile" : "Edit Your Brand Profile"}
          </CardTitle>
          <CardDescription>
            Set up your company profile so influencers know who you are.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="brand-handle">Handle</Label>
              <Input
                id="brand-handle"
                placeholder="your_brand"
                value={brand.handle}
                onChange={(e) =>
                  setBrand((p) => ({ ...p, handle: e.target.value }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                3-30 characters, letters, numbers, underscores, hyphens only.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Inc."
                value={brand.companyName}
                onChange={(e) =>
                  setBrand((p) => ({ ...p, companyName: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={brand.website}
                onChange={(e) =>
                  setBrand((p) => ({ ...p, website: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="Tech, Fashion, Food..."
                value={brand.industry}
                onChange={(e) =>
                  setBrand((p) => ({ ...p, industry: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell influencers about your brand..."
                value={brand.description}
                onChange={(e) =>
                  setBrand((p) => ({ ...p, description: e.target.value }))
                }
                rows={4}
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? "Create Profile" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
