import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { OfficerTrackingMap } from "@/components/officers/OfficerTrackingMap";
import { OfficerListPanel } from "@/components/officers/OfficerListPanel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { mockGet } from "@/api/client";
import { API_BASE_URL } from "@/api/config";
import { useSocket } from "@/contexts/SocketProvider";
import { useAuthContext } from "@/contexts/AuthContext";

export interface Officer {
  user_id: string;
  full_name: string;
  email: string;
  lat: number | null;
  lng: number | null;
  heading?: number | null;
  speed?: number | null;
  is_online: boolean;
  last_seen: string | null;
  status: "active" | "idle" | "offline" | "stale";
  updated_at?: string | null;
}

interface LiveOfficersResponse {
  officers: Officer[];
  summary: { total: number; online: number; offline: number; stale: number };
}

function computeSummary(officers: Officer[]) {
  return {
    total:   officers.length,
    online:  officers.filter((o) => o.status === "active" || o.status === "idle").length,
    offline: officers.filter((o) => o.status === "offline").length,
    stale:   officers.filter((o) => o.status === "stale").length,
  };
}

const STALE_MINUTES = 5;

export default function OfficerTracking() {
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const { user } = useAuthContext();

  // Single source of truth keyed by user_id — O(1) updates from WebSocket
  const officersMapRef = useRef<Map<string, Officer>>(new Map());
  const [officers, setOfficers] = useState<Officer[]>([]);

  const { isConnected, subscribe } = useSocket();

  const flushOfficers = useCallback(() => {
    setOfficers(Array.from(officersMapRef.current.values()));
  }, []);

  // ── Initial HTTP fetch (seeds the map) ────────────────────────────────────
  const { isLoading, data: liveData, error } = useQuery<LiveOfficersResponse>({
    queryKey: ["liveOfficers"],
    queryFn: async () => {
      const url = `${API_BASE_URL}/officers/live`;
      console.log("[OfficerTracking] Fetching from:", url);
      const res = await mockGet<LiveOfficersResponse>(url);
      console.log("[OfficerTracking] Response:", res);
      return res.data;
    },
    refetchInterval: 60_000, // safety-net poll; WS handles real-time
    staleTime: 0,
    retry: 1,
  });

  // Seed / merge whenever the HTTP response arrives (works in RQ v4 and v5)
  useEffect(() => {
    if (!liveData) return;
    console.log("[OfficerTracking] Received live data:", liveData);
    console.log("[OfficerTracking] Officers count:", liveData.officers?.length || 0);
    liveData.officers.forEach((o) => {
      const existing = officersMapRef.current.get(o.user_id);
      // Only overwrite if fetched data is newer than what WS already gave us
      const fetchedNewer =
        !existing ||
        !existing.last_seen ||
        (o.last_seen && o.last_seen >= existing.last_seen);
      if (fetchedNewer) {
        officersMapRef.current.set(o.user_id, o);
      }
    });
    flushOfficers();
  }, [liveData, flushOfficers]);

  // ── Client-side stale detection (runs every 30 s) ─────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const threshold = Date.now() - STALE_MINUTES * 60_000;
      let changed = false;
      officersMapRef.current.forEach((o, id) => {
        if (!o.is_online) return;
        const lastMs = o.last_seen ? new Date(o.last_seen).getTime() : 0;
        if (lastMs < threshold && o.status !== "stale") {
          officersMapRef.current.set(id, { ...o, status: "stale" });
          changed = true;
        }
      });
      if (changed) flushOfficers();
    }, 30_000);
    return () => clearInterval(interval);
  }, [flushOfficers]);

  // ── WebSocket real-time updates ───────────────────────────────────────────
  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "officer_location_updated") {
        officersMapRef.current.set(msg.userId, {
          user_id:   msg.userId,
          full_name: msg.fullName,
          email:     msg.email,
          lat:       msg.lat,
          lng:       msg.lng,
          heading:   msg.heading  ?? null,
          speed:     msg.speed    ?? null,
          is_online: true,
          last_seen: msg.lastSeen,
          status:    msg.status,
          updated_at: msg.lastSeen,
        });
        flushOfficers();
      }

      if (msg.type === "officer_status_changed") {
        const existing = officersMapRef.current.get(msg.userId);
        officersMapRef.current.set(msg.userId, {
          // Keep everything we already know; only overwrite what the event provides
          user_id:   msg.userId,
          full_name: msg.fullName  ?? existing?.full_name ?? "",
          email:     msg.email     ?? existing?.email     ?? "",
          // Preserve last known location so offline officers stay on the map
          lat:       msg.lat       ?? existing?.lat       ?? null,
          lng:       msg.lng       ?? existing?.lng       ?? null,
          heading:   existing?.heading ?? null,
          speed:     null,
          is_online: msg.isOnline,
          last_seen: msg.lastSeen  ?? existing?.last_seen ?? null,
          status:    msg.status,
          updated_at: msg.lastSeen ?? existing?.updated_at ?? null,
        });
        flushOfficers();
      }
    });
  }, [subscribe, flushOfficers]);

  const summary = computeSummary(officers);

  // Show error state if API call failed
  if (error) {
    return (
      <AdminLayout
        title="Live Officer Tracking"
        subtitle="Monitor real-time locations and status of all field officers"
      >
        <Card className="p-8 text-center">
          <div className="text-destructive mb-2">⚠️ Error Loading Officers</div>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          {!user?.organizationId && (
            <p className="text-xs text-muted-foreground mt-2">
              Note: Super Admin users must be assigned to a specific organization to view officers.
            </p>
          )}
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Live Officer Tracking"
      subtitle="Monitor real-time locations and status of all field officers"
    >
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Officers", value: summary.total,   icon: Users,      color: "text-primary",      bg: "bg-primary/10"      },
            { label: "Online",         value: summary.online,  icon: UserCheck,  color: "text-green-500",    bg: "bg-green-500/10"    },
            { label: "Offline",        value: summary.offline, icon: UserX,      color: "text-destructive",  bg: "bg-destructive/10"  },
            { label: "Stale",          value: summary.stale,   icon: Clock,      color: "text-yellow-500",   bg: "bg-yellow-500/10"   },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Connection badge */}
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${isConnected ? "bg-green-300 animate-pulse" : "bg-red-300"}`} />
            {isConnected ? "Live Updates Active" : "Reconnecting…"}
          </Badge>
          {!isConnected && (
            <span className="text-xs text-muted-foreground">Polling every 60 s as fallback</span>
          )}
        </div>

        {/* Map + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <OfficerListPanel
              officers={officers}
              selectedOfficerId={selectedOfficerId}
              onSelectOfficer={setSelectedOfficerId}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-380px)] min-h-[500px] overflow-hidden">
              <OfficerTrackingMap
                officers={officers}
                selectedOfficerId={selectedOfficerId}
                onOfficerClick={setSelectedOfficerId}
              />
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
