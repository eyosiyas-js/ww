import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Officer } from "@/pages/admin/OfficerTracking";
import { renderToString } from "react-dom/server";
import { UserCheck, UserX, User, Clock, Moon, Sun } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OfficerTrackingMapProps {
  officers: Officer[];
  selectedOfficerId: string | null;
  onOfficerClick: (officerId: string) => void;
}

// ─── Icon factory ────────────────────────────────────────────────────────────

function buildIconHtml(status: Officer["status"]) {
  const cfg = {
    active:  { ring: "#22c55e", bg: "rgba(34,197,94,0.15)",  pulse: true  },
    idle:    { ring: "#3b82f6", bg: "rgba(59,130,246,0.15)", pulse: false },
    stale:   { ring: "#eab308", bg: "rgba(234,179,8,0.15)",  pulse: false },
    offline: { ring: "#6b7280", bg: "rgba(107,114,128,0.12)",pulse: false },
  }[status];

  const IconComp = status === "active" || status === "idle" ? UserCheck
                 : status === "stale"   ? Clock
                 : UserX;

  const iconColor = cfg.ring;
  const pulseAttr = cfg.pulse ? ' data-pulse="1"' : "";

  return renderToString(
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: `2.5px solid ${cfg.ring}`,
        background: cfg.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 2px 8px ${cfg.ring}55`,
        cursor: "pointer",
      }}
      {...(cfg.pulse ? { "data-pulse": "1" } : {})}
    >
      <IconComp style={{ width: 20, height: 20, color: iconColor }} />
    </div>
  );
}

function makeIcon(status: Officer["status"]) {
  return L.divIcon({
    html: buildIconHtml(status),
    className: status === "active" ? "officer-icon officer-icon--pulse" : "officer-icon",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });
}

// ─── Popup content ────────────────────────────────────────────────────────────

function buildPopup(officer: Officer): string {
  const lastSeenText = officer.last_seen
    ? formatDistanceToNow(new Date(officer.last_seen), { addSuffix: true })
    : "Never";

  const statusLabel: Record<Officer["status"], string> = {
    active:  '<span style="color:#22c55e;font-weight:600">● Active</span>',
    idle:    '<span style="color:#3b82f6;font-weight:600">● Idle</span>',
    stale:   '<span style="color:#eab308;font-weight:600">⏱ Stale</span>',
    offline: '<span style="color:#9ca3af;font-weight:600">○ Offline</span>',
  };

  const speedLine = officer.speed != null && officer.speed > 0
    ? `<div style="display:flex;justify-content:space-between;margin-top:4px">
         <span style="color:#9ca3af;font-size:11px">Speed</span>
         <span style="font-size:11px;font-weight:500">${(officer.speed * 3.6).toFixed(1)} km/h</span>
       </div>`
    : "";

  const coordLine = officer.lat != null
    ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af">
         📍 ${officer.lat.toFixed(5)}, ${officer.lng!.toFixed(5)}
       </div>`
    : `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af">
         📍 Location unknown
       </div>`;

  return `
    <div style="min-width:200px;padding:4px 2px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${officer.full_name}</div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:10px">${officer.email}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#9ca3af;font-size:11px">Status</span>
        <span style="font-size:11px">${statusLabel[officer.status]}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="color:#9ca3af;font-size:11px">Last seen</span>
        <span style="font-size:11px;font-weight:500">${lastSeenText}</span>
      </div>
      ${speedLine}
      ${coordLine}
    </div>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OfficerTrackingMap({ officers, selectedOfficerId, onOfficerClick }: OfficerTrackingMapProps) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInst       = useRef<L.Map | null>(null);
  const clusterGroup  = useRef<L.MarkerClusterGroup | null>(null);
  const tileLayer     = useRef<L.TileLayer | null>(null);
  const markersRef    = useRef<Map<string, L.Marker>>(new Map());
  const prevOfficers  = useRef<Map<string, Officer>>(new Map());
  const [lightMode, setLightMode] = useState(false);
  const didFitRef     = useRef(false);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    const map = L.map(mapRef.current, {
      center: [9.0192, 38.7468],
      zoom: 12,
      maxZoom: 20,
      minZoom: 2,
      zoomControl: true,
    });
    mapInst.current = map;

    const cg = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 17,
    }) as L.MarkerClusterGroup;
    clusterGroup.current = cg;
    map.addLayer(cg);

    // Inject CSS once
    if (!document.getElementById("officer-map-styles")) {
      const s = document.createElement("style");
      s.id = "officer-map-styles";
      s.textContent = `
        .officer-icon { background:transparent!important; border:none!important; }
        @keyframes officer-pulse {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.15); opacity:.85; }
        }
        .officer-icon--pulse > div { animation: officer-pulse 2s ease-in-out infinite; }
      `;
      document.head.appendChild(s);
    }

    return () => {
      map.remove();
      mapInst.current = null;
    };
  }, []);

  // ── Tile layer (light / dark toggle) ──────────────────────────────────────
  useEffect(() => {
    const map = mapInst.current;
    if (!map) return;
    if (tileLayer.current) map.removeLayer(tileLayer.current);

    const url = lightMode
      ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY || ''}`
      : `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY || ''}`;

    tileLayer.current = L.tileLayer(url, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
      minZoom: 2,
    }).addTo(map);

    map.setMaxZoom(20);
  }, [lightMode]);

  // ── Incremental marker sync (no full rebuild) ──────────────────────────────
  useEffect(() => {
    const map = mapInst.current;
    const cg  = clusterGroup.current;
    if (!map || !cg) return;

    const incoming = new Map(officers.map((o) => [o.user_id, o]));

    // Remove markers for officers no longer in the list
    prevOfficers.current.forEach((_, id) => {
      if (!incoming.has(id)) {
        const m = markersRef.current.get(id);
        if (m) { cg.removeLayer(m); markersRef.current.delete(id); }
      }
    });

    // Add or update
    incoming.forEach((officer) => {
      // Officers with no known location can't be placed on the map
      if (officer.lat == null || officer.lng == null) return;

      const existing = markersRef.current.get(officer.user_id);
      const prev     = prevOfficers.current.get(officer.user_id);

      if (!existing) {
        // New marker
        const marker = L.marker([officer.lat, officer.lng], { icon: makeIcon(officer.status) });
        marker.on("click", () => onOfficerClick(officer.user_id));
        marker.bindPopup(buildPopup(officer), { maxWidth: 280 });
        cg.addLayer(marker);
        markersRef.current.set(officer.user_id, marker);
      } else {
        // Update position smoothly if moved
        const posChanged = !prev || prev.lat !== officer.lat || prev.lng !== officer.lng;
        if (posChanged) {
          existing.setLatLng([officer.lat, officer.lng]);
        }

        // Update icon if status changed
        const statusChanged = !prev || prev.status !== officer.status;
        if (statusChanged) {
          existing.setIcon(makeIcon(officer.status));
        }

        // Refresh popup content
        existing.setPopupContent(buildPopup(officer));
      }
    });

    prevOfficers.current = incoming;

    // Auto-fit once on first load when we have officers with coords
    if (!didFitRef.current) {
      const withCoords = officers.filter((o) => o.lat != null && o.lng != null);
      if (withCoords.length > 0) {
        const bounds = L.latLngBounds(withCoords.map((o) => [o.lat!, o.lng!]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        didFitRef.current = true;
      }
    }
  }, [officers, onOfficerClick]);

  // ── Focus selected officer ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInst.current;
    if (!map || !selectedOfficerId) return;

    const officer = officers.find((o) => o.user_id === selectedOfficerId);
    if (!officer || officer.lat == null || officer.lng == null) return;

    map.setView([officer.lat, officer.lng], Math.max(map.getZoom(), 15), { animate: true });

    const marker = markersRef.current.get(selectedOfficerId);
    if (marker) {
      // Ensure marker is visible outside cluster before opening popup
      setTimeout(() => marker.openPopup(), 300);
    }
  }, [selectedOfficerId]); // intentionally omit officers to avoid re-running on every update

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full group">
      <div ref={mapRef} className="h-full w-full rounded-lg" />

      {/* Light / dark toggle */}
      <div className="absolute top-3 right-3 z-[400] opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setLightMode((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     bg-background/80 backdrop-blur border border-border/50 shadow-sm
                     hover:bg-background transition-colors"
        >
          {lightMode ? <><Moon className="w-3.5 h-3.5" /> Dark</> : <><Sun className="w-3.5 h-3.5" /> Light</>}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-background/90 backdrop-blur border border-border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold mb-2">Officer Status</p>
        {[
          { color: "#22c55e", label: "Active (moving)" },
          { color: "#3b82f6", label: "Idle (stationary)" },
          { color: "#eab308", label: "Stale (no update)" },
          { color: "#6b7280", label: "Offline" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 mt-1">
            <span style={{ background: color }} className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
