import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { CriticalAlertBanner } from "@/components/notifications/CriticalAlertBanner";
import { useNotifications } from "@/hooks/useNotifications";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  useNotifications();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="pl-64">
        <CriticalAlertBanner />
        <AppHeader title={title} subtitle={subtitle} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
