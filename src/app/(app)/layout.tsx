import { auth } from "@/lib/auth";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="font-medium">Menu</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
