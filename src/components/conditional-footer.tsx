"use client";

import { useSession } from "next-auth/react";
import { Footer } from "@/components/footer";

export function ConditionalFooter() {
  const { data: session } = useSession();
  const showFooter = !session?.user?.role;

  if (!showFooter) return null;
  return <Footer />;
}
