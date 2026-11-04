import {
  BarChart3,
  Building2,
  Users,
  ShieldCheck,
  FileEdit,
  Cpu,
  Monitor,
  Shield,
  ChevronLeft,
  Search,
  Eye,
  FileText,
  Building,
  MapPin,
  LayoutDashboard,
  Car,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";

const superAdminItems = [
  { title: "Main Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Companies", url: "/admin/companies", icon: Building2 },
  { title: "Global Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Devices", url: "/admin/devices", icon: Monitor },

  { title: "National ID Reg", url: "/admin/national-id/register", icon: FileText },
  { title: "Vehicle Registration", url: "/admin/vehicle-registration", icon: Car },
  { title: "System Settings", url: "/admin/settings", icon: Cpu },
];

const companyAdminItems = [
  { title: "Main Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Companies", url: "/admin/companies", icon: Building2 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Roles & Permissions", url: "/admin/roles", icon: ShieldCheck },
  { title: "Form Templates", url: "/admin/forms", icon: FileEdit },
  { title: "Organization Devices", url: "/admin/devices", icon: Monitor },

  { title: "Company Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Officer Tracking", url: "/admin/officer-tracking", icon: MapPin },
  { title: "National ID Reg", url: "/admin/national-id/register", icon: FileText },
  { title: "Vehicle Registration", url: "/admin/vehicle-registration", icon: Car },
];

const analyticsSubItems = [
  { title: "Detections", url: "/admin/analytics/detections", icon: Search },
  { title: "Crime Types", url: "/admin/analytics/crime-types", icon: ShieldCheck },
  // { title: "Company Comparison", url: "/admin/analytics/company-comparison", icon: Building },
  { title: "Users", url: "/admin/analytics/users", icon: Users },
  // { title: "Cameras", url: "/admin/analytics/cameras", icon: Eye },
];

export function AdminSidebar() {
  const { user } = useAuthContext();
  const location = useLocation();

  const isSuperAdmin = user?.role === "Super Admin";
  const navItems = isSuperAdmin ? superAdminItems : companyAdminItems;

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const showAnalyticsSub = location.pathname.startsWith("/admin/analytics");

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 text-destructive">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">
            {isSuperAdmin ? "Super Admin" : "Company Admin"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isSuperAdmin ? "Public Safety System Network" : "Organization Center"}
          </p>
        </div>
      </div>

      {/* Back to app */}
      <div className="px-3 pt-3">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to App
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {isSuperAdmin ? "Network Admin" : "Local Management"}
        </p>
        {navItems.map((item) => (
          <div key={item.url}>
            <NavLink
              to={item.url}
              end={item.url === "/admin"}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive(item.url)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive(item.url) && "text-primary")} />
              <span>{item.title}</span>
              {isActive(item.url) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </NavLink>
            {item.url === "/admin/analytics" && showAnalyticsSub && (
              <div className="ml-6 mt-1 space-y-0.5 border-l border-border pl-3">
                {analyticsSubItems.map((sub) => (
                  <NavLink
                    key={sub.url}
                    to={sub.url}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors",
                      location.pathname === sub.url
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <sub.icon className="w-3.5 h-3.5" />
                    {sub.title}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Admin info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5">
          <div className="w-9 h-9 rounded-full bg-destructive/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.fullName || "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role || "Administrator"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
