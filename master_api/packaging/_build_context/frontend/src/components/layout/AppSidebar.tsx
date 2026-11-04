import {
  Camera,
  Search,
  History,
  User as UserIcon,
  Bell,
  Settings,
  Shield,
  LayoutDashboard,
  LogOut,
  Fingerprint,
  Play,
  ShieldAlert,
  IdCard,
  ScanFace
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Cameras", url: "/cameras", icon: Camera },
  { title: "Detection", url: "/detection", icon: Search },
  { title: "Weapon Detection", url: "/weapon-detection", icon: ShieldAlert },
  { title: "Assigned", url: "/assigned", icon: Shield },
  { title: "History", url: "/history", icon: History },
  { title: "Fingerprint Matching", url: "/fingerprint-matching", icon: Fingerprint },
  { title: "Face Matching", url: "/face-matching", icon: ScanFace },
  {
    title: "National ID",
    icon: IdCard,
    type: "collapsible",
    items: [
      { title: "Registered Citizens", url: "/admin/national-id/citizens" },
      { title: "New Registration", url: "/admin/national-id/register" },
    ],
    allowedRoles: ["Super Admin", "Admin"],
  },
];

const secondaryNavItems = [
  { title: "Notifications", url: "/notifications", icon: Bell, badge: 3 },
  { title: "Profile", url: "/profile", icon: UserIcon },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground">Public Safety System</h1>
          <p className="text-xs text-muted-foreground">surveillance system</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Main Menu
        </p>
        {mainNavItems
          .filter(item => {
            // Feature gating
            const feats = (user as any)?.organizationFeatures || {};
            if (item.title === "Detection" && feats.detections === "none") return false;
            if (item.title === "Weapon Detection" && feats.detections === "none") return false;
            if (item.title === "Fingerprint Matching" && feats.fingerprint === "none") return false;

            if (user?.role === "Operator") {
              return item.title === "Detection" || item.title === "Weapon Detection" || item.title === "Assigned";
            }
            return true;
          })
          .map((item) => {
            if (item.type === "collapsible") {
              const mainUrl = item.items?.[0]?.url || "#";
              const isAnySubActive = item.items?.some(sub => isActive(sub.url));

              return (
                <div key={item.title} className="space-y-1">
                  <NavLink
                    to={mainUrl}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mt-2",
                      isAnySubActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5",
                      isAnySubActive && "text-primary"
                    )} />
                    <span className="font-bold">{item.title}</span>
                  </NavLink>

                  <div className="pl-4 space-y-1 border-l border-sidebar-border ml-5 mt-1">
                    {item.items?.map((subItem) => (
                      <NavLink
                        key={subItem.url}
                        to={subItem.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                          isActive(subItem.url)
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <span>{subItem.title}</span>
                        {isActive(subItem.url) && (
                          <div className="ml-auto w-1 h-1 rounded-full bg-primary" />
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={item.url}
                to={item.url!}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(item.url!)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  isActive(item.url!) && "text-primary"
                )} />
                <span>{item.title}</span>
                {isActive(item.url!) && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </NavLink>
            );
          })}

        <div className="pt-6">
          <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Account
          </p>
          {secondaryNavItems
            .filter(item => {
              if (user?.role === "Operator") {
                return item.title === "Notifications" || item.title === "Profile";
              }
              return true;
            })
            .map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(item.url)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className={cn(
                    "w-5 h-5",
                    isActive(item.url) && "text-primary"
                  )} />
                  {item.badge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span>{item.title}</span>
              </NavLink>
            ))}

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-destructive/5 hover:text-destructive mt-1"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Admin Link */}
      {(user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Super Admin') && (
        <div className="px-3 pb-2 flex flex-col gap-1">
          <NavLink
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              location.pathname.startsWith("/admin")
                ? "bg-destructive/10 text-destructive"
                : "text-sidebar-foreground hover:bg-destructive/5 hover:text-destructive"
            )}
          >
            <Shield className="w-5 h-5" />
            <span>Super Admin</span>
          </NavLink>
          {(user?.role === 'SuperAdmin' || user?.role === 'Super Admin') && (
            <NavLink
              to="/simulation"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === "/simulation"
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-primary/5 hover:text-primary"
              )}
            >
              <Play className="w-5 h-5" />
              <span>Simulation</span>
            </NavLink>
          )}
        </div>
      )}

      {/* User Profile Quick Access */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/30">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.fullName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role || 'Surveillance Unit'}</p>
          </div>
          <div className="status-indicator status-online" />
        </div>
      </div>
    </aside>
  );
}
