import { useState } from "react";
import { Officer } from "@/pages/admin/OfficerTracking";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Clock, Navigation2, TrendingUp, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface OfficerListPanelProps {
  officers: Officer[];
  selectedOfficerId: string | null;
  onSelectOfficer: (officerId: string) => void;
  isLoading?: boolean;
}

const STATUS_ORDER: Record<Officer["status"], number> = {
  active: 0,
  idle: 1,
  stale: 2,
  offline: 3,
};

function StatusBadge({ status }: { status: Officer["status"] }) {
  const cfg = {
    active:  { label: "● Active",  cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    idle:    { label: "● Idle",    cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    stale:   { label: "⏱ Stale",  cls: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
    offline: { label: "○ Offline", cls: "bg-muted text-muted-foreground border-border" },
  }[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function OfficerListPanel({
  officers,
  selectedOfficerId,
  onSelectOfficer,
  isLoading,
}: OfficerListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Counts (always from full list, not filtered)
  const total   = officers.length;
  const online  = officers.filter((o) => o.status === "active" || o.status === "idle").length;
  const idle    = officers.filter((o) => o.status === "idle").length;
  const offline = officers.filter((o) => o.status === "offline").length;
  const stale   = officers.filter((o) => o.status === "stale").length;

  // Filter
  const filtered = officers.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || o.full_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && (o.status === "active" || o.status === "idle")) ||
      o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Sort: by status priority, then by last_seen recency
  const sorted = [...filtered].sort((a, b) => {
    const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (sd !== 0) return sd;
    const at = a.last_seen ? new Date(a.last_seen).getTime() : 0;
    const bt = b.last_seen ? new Date(b.last_seen).getTime() : 0;
    return bt - at;
  });

  if (isLoading) {
    return (
      <Card className="h-[calc(100vh-380px)] min-h-[500px] p-4 space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-380px)] min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-3">
        {/* Title + counts */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Officers</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{total} total</span>
          </div>
        </div>

        {/* Mini stat row */}
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            { label: "Online",  value: online,  color: "text-green-500" },
            { label: "Idle",    value: idle,    color: "text-blue-500" },
            { label: "Stale",   value: stale,   color: "text-yellow-500" },
            { label: "Offline", value: offline, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-muted/40 rounded-md py-1">
              <p className={`text-base font-bold leading-none ${color}`}>{value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Officers ({total})</SelectItem>
            <SelectItem value="online">Online ({online})</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="stale">Stale ({stale})</SelectItem>
            <SelectItem value="offline">Offline ({offline})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {/* True empty state: no officers registered at all */}
          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No officers registered yet</p>
              <p className="text-xs mt-1 opacity-70">Officers will appear here once they log in and share their location.</p>
            </div>
          )}

          {/* Filter returned nothing but officers exist */}
          {total > 0 && sorted.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No officers match this filter.</p>
              <button
                className="text-xs text-primary mt-1 underline"
                onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
              >
                Clear filters
              </button>
            </div>
          )}

          {sorted.map((officer) => {
            const isSelected = selectedOfficerId === officer.user_id;
            const hasLocation = officer.lat != null && officer.lng != null;

            return (
              <button
                key={officer.user_id}
                onClick={() => hasLocation && onSelectOfficer(officer.user_id)}
                className={`w-full text-left p-3 rounded-lg border transition-all
                  ${isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"}
                  ${!hasLocation ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                {/* Name + badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate leading-tight">{officer.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{officer.email}</p>
                  </div>
                  <StatusBadge status={officer.status} />
                </div>

                {/* Meta */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>
                      {officer.last_seen
                        ? formatDistanceToNow(new Date(officer.last_seen), { addSuffix: true })
                        : "Never seen"}
                    </span>
                  </div>

                  {officer.speed != null && officer.speed > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3 flex-shrink-0" />
                      <span>{(officer.speed * 3.6).toFixed(1)} km/h</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {hasLocation
                      ? <span className="truncate">{officer.lat!.toFixed(4)}, {officer.lng!.toFixed(4)}</span>
                      : <span className="italic">No location yet</span>}
                  </div>
                </div>

                {/* Focus button */}
                {hasLocation && !isSelected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 h-6 text-[10px] gap-1"
                    onClick={(e) => { e.stopPropagation(); onSelectOfficer(officer.user_id); }}
                  >
                    <Navigation2 className="w-3 h-3" />
                    Focus on map
                  </Button>
                )}

                {!hasLocation && (
                  <p className="text-[10px] text-muted-foreground italic mt-1.5">
                    Awaiting first location update
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
