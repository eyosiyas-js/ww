import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="pl-64">
        <AppHeader title={title} subtitle={subtitle} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
