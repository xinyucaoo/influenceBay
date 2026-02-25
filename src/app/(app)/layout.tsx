import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const hasSessionWithRole = session?.user?.role != null;

  if (!hasSessionWithRole) {
    return <>{children}</>;
  }

  const role = session.user.role as "INFLUENCER" | "BRAND";

  return (
    <SidebarProvider disableKeyboardShortcut>
      <AppSidebar role={role} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
