import { Bell, Search, Camera, User, AlertTriangle, Info, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNotifications, useMarkAllNotificationsRead } from "@/hooks/use-notifications";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useGlobalSearch, SearchResult } from "@/hooks/use-global-search";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/api/config";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

// ── Result row ───────────────────────────────────────────────────────────────
function ResultRow({
  result,
  isActive,
  onSelect,
}: {
  result: SearchResult;
  isActive: boolean;
  onSelect: (r: SearchResult) => void;
}) {
  const iconMap = {
    detection: <User className="w-4 h-4 text-muted-foreground shrink-0" />,
    camera: <Camera className="w-4 h-4 text-muted-foreground shrink-0" />,
    notification: <Bell className="w-4 h-4 text-muted-foreground shrink-0" />,
  };

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // prevent input blur before click fires
        e.preventDefault();
        onSelect(result);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      )}
    >
      {/* Thumbnail or icon */}
      {result.imageUrl ? (
        <img
          src={result.imageUrl}
          alt=""
          className="w-8 h-8 rounded object-cover shrink-0 border border-border"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
          {iconMap[result.type]}
        </span>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{result.title}</span>
          {result.meta === "unread" && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
          {result.meta === "flagged" && (
            <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
      </div>

      {/* Badge */}
      {result.badge && (
        <Badge
          variant={result.badgeVariant ?? "outline"}
          className="text-[10px] capitalize shrink-0"
        >
          {result.badge}
        </Badge>
      )}
    </button>
  );
}

// ── Main header ──────────────────────────────────────────────────────────────
export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const { mutate: markAllAsRead } = useMarkAllNotificationsRead();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, isLoading, groups } = useGlobalSearch(query);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setQuery("");
      setOpen(false);
      navigate(result.href);
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && query.trim().length >= 2;
  const showEmpty = showDropdown && !isLoading && results.length === 0;
  const showResults = showDropdown && results.length > 0;

  // Flat index tracker across groups for keyboard nav
  let flatIndex = -1;

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* ── Search ── */}
        <div ref={containerRef} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search cameras, detections…"
            className="w-72 pl-9 pr-8 bg-muted/50 border-border focus:bg-background transition-all focus:w-80"
            aria-label="Global search"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            role="combobox"
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Keyboard hint when empty */}
          {!query && (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground pointer-events-none">
              ⌘K
            </kbd>
          )}

          {/* ── Dropdown ── */}
          {showDropdown && (
            <div
              role="listbox"
              className="absolute top-full mt-2 left-0 w-[420px] max-h-[480px] overflow-y-auto rounded-xl border border-border bg-popover shadow-xl z-50"
            >
              {/* Loading */}
              {isLoading && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching…
                </div>
              )}

              {/* No results */}
              {showEmpty && (
                <div className="px-4 py-8 text-center">
                  <Info className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No results for "{query}"</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try searching by name, location, plate number, or status.
                  </p>
                </div>
              )}

              {/* Results grouped */}
              {showResults &&
                groups.map((group, gi) => {
                  return (
                    <div key={group.label}>
                      {/* Group header */}
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border">
                        {group.label}
                        <span className="ml-1.5 font-normal normal-case tracking-normal">
                          ({group.items.length})
                        </span>
                      </div>

                      {group.items.map((result) => {
                        flatIndex++;
                        const idx = flatIndex;
                        return (
                          <ResultRow
                            key={result.id}
                            result={result}
                            isActive={activeIndex === idx}
                            onSelect={handleSelect}
                          />
                        );
                      })}

                      {gi < groups.length - 1 && <div className="border-b border-border" />}
                    </div>
                  );
                })}

              {/* Footer hint */}
              {showResults && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
                  <span>
                    <kbd className="rounded border border-border bg-background px-1 py-0.5">↑↓</kbd>{" "}
                    navigate &nbsp;
                    <kbd className="rounded border border-border bg-background px-1 py-0.5">↵</kbd>{" "}
                    open &nbsp;
                    <kbd className="rounded border border-border bg-background px-1 py-0.5">Esc</kbd>{" "}
                    close
                  </span>
                  <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Notifications ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px]"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => markAllAsRead()}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        notification.type === "alert"
                          ? "bg-destructive"
                          : notification.type === "warning"
                          ? "bg-yellow-500"
                          : notification.type === "success"
                          ? "bg-green-500"
                          : "bg-primary"
                      )}
                    />
                    <span className="font-medium text-sm">{notification.title}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatTimeAgo(notification.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4 line-clamp-1">
                    {notification.message}
                  </p>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary text-sm" asChild>
              <Link to="/notifications">View all notifications</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── Theme Toggle ── */}
        <ThemeToggle />

        {/* ── Live Status ── */}
        <div className="live-indicator">LIVE</div>
      </div>
    </header>
  );
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
