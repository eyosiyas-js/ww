import { useMemo } from "react";
import { useDetections } from "@/hooks/use-detections";
import { useCameras } from "@/hooks/use-cameras";
import { useNotifications } from "@/hooks/use-notifications";
import { getMediaUrl } from "@/api/config";

export type SearchResultType = "detection" | "camera" | "notification";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
  href: string;
  imageUrl?: string;
  meta?: string; // e.g. timestamp, status
}

function normalize(str: string) {
  return str.toLowerCase().trim();
}

function matches(query: string, ...fields: (string | undefined | null)[]) {
  const q = normalize(query);
  return fields.some((f) => f && normalize(f).includes(q));
}

export function useGlobalSearch(query: string): {
  results: SearchResult[];
  isLoading: boolean;
  groups: { label: string; items: SearchResult[] }[];
} {
  const { data: detections = [], isLoading: detectionsLoading } = useDetections();
  const { data: cameras = [], isLoading: camerasLoading } = useCameras();
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications();

  const isLoading = detectionsLoading || camerasLoading || notificationsLoading;

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();
    if (q.length < 2) return [];

    const out: SearchResult[] = [];

    // ── Detections ──────────────────────────────────────────────────────────
    for (const d of detections) {
      if (
        matches(
          q,
          d.name,
          d.description,
          d.location,
          d.category,
          d.subcategory,
          d.crimeType,
          d.plateNumber,
          d.status,
          d.id
        )
      ) {
        const isVehicle = d.category === "vehicle";
        const subtitle = isVehicle
          ? [d.plateNumber, d.location].filter(Boolean).join(" · ") || d.description
          : [d.age ? `Age ~${d.age}` : null, d.location].filter(Boolean).join(" · ") || d.description;

        const badgeMap: Record<string, SearchResult["badgeVariant"]> = {
          detected: "destructive",
          pending: "secondary",
          monitoring: "outline",
          in_progress: "default",
          resolved: "default",
          failed: "destructive",
        };

        out.push({
          id: d.id,
          type: "detection",
          title: d.name,
          subtitle: subtitle || "No description",
          badge: d.status.replace("_", " "),
          badgeVariant: badgeMap[d.status] ?? "outline",
          href: "/detection",
          imageUrl: d.imageUrls?.[0] ? getMediaUrl(d.imageUrls[0]) : undefined,
          meta: d.category,
        });
      }
    }

    // ── Cameras ─────────────────────────────────────────────────────────────
    for (const c of cameras) {
      if (matches(q, c.name, c.location, c.status, c.id)) {
        const badgeMap: Record<string, SearchResult["badgeVariant"]> = {
          online: "default",
          offline: "destructive",
          maintenance: "secondary",
        };

        out.push({
          id: c.id,
          type: "camera",
          title: c.name,
          subtitle: c.location,
          badge: c.status,
          badgeVariant: badgeMap[c.status] ?? "outline",
          href: "/cameras",
          meta: c.isFlagged ? "flagged" : undefined,
        });
      }
    }

    // ── Notifications ────────────────────────────────────────────────────────
    for (const n of notifications) {
      if (matches(q, n.title, n.message, n.type)) {
        const badgeMap: Record<string, SearchResult["badgeVariant"]> = {
          alert: "destructive",
          warning: "secondary",
          info: "outline",
          success: "default",
        };

        out.push({
          id: n.id,
          type: "notification",
          title: n.title,
          subtitle: n.message,
          badge: n.type,
          badgeVariant: badgeMap[n.type] ?? "outline",
          href: n.actionUrl ?? "/notifications",
          meta: n.read ? undefined : "unread",
        });
      }
    }

    // Cap total at 20 to keep the dropdown manageable
    return out.slice(0, 20);
  }, [query, detections, cameras, notifications]);

  const groups = useMemo(() => {
    const detectionItems = results.filter((r) => r.type === "detection");
    const cameraItems = results.filter((r) => r.type === "camera");
    const notificationItems = results.filter((r) => r.type === "notification");

    return [
      detectionItems.length > 0 && { label: "Detections", items: detectionItems },
      cameraItems.length > 0 && { label: "Cameras", items: cameraItems },
      notificationItems.length > 0 && { label: "Notifications", items: notificationItems },
    ].filter(Boolean) as { label: string; items: SearchResult[] }[];
  }, [results]);

  return { results, isLoading, groups };
}
