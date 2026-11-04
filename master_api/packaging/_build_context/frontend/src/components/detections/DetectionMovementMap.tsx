import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { renderToString } from "react-dom/server";
import { MapPin } from "lucide-react";

interface DetectionEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  lat?: number;
  lng?: number;
}

interface DetectionMovementMapProps {
  events: DetectionEvent[];
}

const createNumberedIcon = (num: number, isFirst: boolean, isLast: boolean) => {
  const bgColor = isFirst
    ? "bg-green-500 border-green-300"
    : isLast
    ? "bg-red-500 border-red-300"
    : "bg-blue-500 border-blue-300";

  const html = renderToString(
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-white text-xs font-bold shadow-lg ${bgColor}`}
    >
      {num}
    </div>
  );

  return L.divIcon({
    html,
    className: "movement-marker-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function DetectionMovementMap({ events }: DetectionMovementMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Filter events that have valid coordinates and deduplicate by camera in chronological order
  const validEvents = events
    .filter((e) => e.lat != null && e.lng != null && e.lat !== 0 && e.lng !== 0)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => {
    if (!mapRef.current || validEvents.length === 0) return;

    // Cleanup previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    // Dark tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    const latLngs: L.LatLngExpression[] = [];

    validEvents.forEach((event, idx) => {
      const latLng: L.LatLngExpression = [event.lat!, event.lng!];
      latLngs.push(latLng);

      const isFirst = idx === 0;
      const isLast = idx === validEvents.length - 1;

      const marker = L.marker(latLng, {
        icon: createNumberedIcon(idx + 1, isFirst, isLast),
      }).addTo(map);

      const label = isFirst ? "🟢 Start" : isLast ? "🔴 Latest" : `Point ${idx + 1}`;
      const time = new Date(event.timestamp).toLocaleString();

      marker.bindPopup(
        `<div class="p-2 min-w-[160px]">
          <div class="font-semibold text-sm mb-1">${label}</div>
          <div class="text-xs text-muted-foreground mb-1">${event.cameraName}</div>
          <div class="text-xs opacity-70">${time}</div>
        </div>`,
        { className: "movement-popup" }
      );
    });

    // Draw polyline path
    if (latLngs.length >= 2) {
      L.polyline(latLngs, {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.8,
        dashArray: "8, 6",
        lineCap: "round",
      }).addTo(map);

      // Animated directional arrows via decorator pattern (simple approach using small dots)
      // We'll add intermediate circle markers to show direction
      for (let i = 0; i < latLngs.length - 1; i++) {
        const start = latLngs[i] as [number, number];
        const end = latLngs[i + 1] as [number, number];
        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;

        L.circleMarker([midLat, midLng], {
          radius: 4,
          fillColor: "#60a5fa",
          color: "#3b82f6",
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(map);
      }
    }

    // Fit map bounds to show all markers
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [JSON.stringify(validEvents)]);

  if (validEvents.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" /> Movement Tracking
      </p>
      <div className="rounded-xl overflow-hidden border border-border/50 bg-card">
        <div ref={mapRef} className="h-[280px] w-full" />
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground border-t border-border/50">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Intermediate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Latest
          </span>
          <span className="ml-auto">{validEvents.length} detection point{validEvents.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
