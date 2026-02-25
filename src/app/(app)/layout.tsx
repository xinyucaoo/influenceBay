import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth error in layout:", e);
    return <>{children}</>;
  }

  const role = session?.user?.role;
  const hasSessionWithRole =
    role === "INFLUENCER" || role === "BRAND";

  if (!hasSessionWithRole) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider disableKeyboardShortcut>
      <AppSidebar role={role} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
