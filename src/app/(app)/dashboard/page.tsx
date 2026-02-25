import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.role) {
    redirect("/onboarding");
  }

  if (session.user.role === "INFLUENCER") {
    redirect("/dashboard/influencer");
  }

  redirect("/dashboard/brand");
}
