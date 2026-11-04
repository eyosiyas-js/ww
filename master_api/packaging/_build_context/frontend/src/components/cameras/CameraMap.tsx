import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Camera } from "@/data/mockData";
import { Camera as CameraIcon, AlertTriangle, WifiOff, Wrench, Moon, Sun } from "lucide-react";
import { renderToString } from "react-dom/server";

interface CameraMapProps {
  cameras: Camera[];
  onCameraClick: (camera: Camera) => void;
  selectedCameraId?: string;
  defaultCenter?: [number, number];
}

const createCameraIcon = (camera: Camera) => {
  const statusClass = camera.isFlagged 
    ? "bg-destructive/20 border-destructive" 
    : camera.status === "online" 
      ? "bg-primary/20 border-primary" 
      : camera.status === "offline"
        ? "bg-muted/50 border-muted-foreground"
        : "bg-warning/20 border-warning";

  const iconColor = camera.isFlagged 
    ? "text-destructive" 
    : camera.status === "online" 
      ? "text-primary" 
      : camera.status === "offline"
        ? "text-muted-foreground"
        : "text-warning";

  const pulseClass = camera.isFlagged ? "alert-pulse" : "";

  const Icon = camera.status === "offline" 
    ? WifiOff 
    : camera.status === "maintenance" 
      ? Wrench 
      : camera.isFlagged 
        ? AlertTriangle 
        : CameraIcon;

  const iconHtml = renderToString(
    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-all duration-200 ${statusClass} ${pulseClass}`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: "camera-div-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export function CameraMap({ cameras, onCameraClick, selectedCameraId, defaultCenter }: CameraMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on provided default or Addis Ababa
    const center = defaultCenter || [9.0192, 38.7468];
    const map = L.map(mapRef.current, {
      center: center as L.LatLngExpression,
      zoom: 13,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle map tile layer toggle (light/dark mode)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const url = isLightMode 
      ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    tileLayerRef.current = L.tileLayer(url, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);
  }, [isLightMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add camera markers
    cameras.forEach((camera) => {
      const marker = L.marker([camera.lat, camera.lng], {
        icon: createCameraIcon(camera),
      });

      marker.on("click", () => onCameraClick(camera));

      // Popup content
      const popupContent = `
        <div class="p-2 min-w-[180px]">
          <div class="font-semibold text-sm mb-1">${camera.name}</div>
          <div class="text-xs text-muted-foreground mb-2">${camera.location}</div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${
              camera.status === "online" ? "bg-success" : 
              camera.status === "offline" ? "bg-destructive" : "bg-warning"
            }"></span>
            <span class="text-xs capitalize">${camera.status}</span>
          </div>
          ${camera.isFlagged ? `
            <div class="mt-2 text-xs text-destructive font-medium">
              ⚠️ Detection Alert ${camera.lastDetection ? `• ${camera.lastDetection}` : ""}
            </div>
          ` : ""}
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: "camera-popup",
      });

      marker.addTo(map);
      markersRef.current.set(camera.id, marker);
    });
  }, [cameras, onCameraClick]);

  // Highlight selected camera
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedCameraId) return;

    const marker = markersRef.current.get(selectedCameraId);
    if (marker) {
      const camera = cameras.find(c => c.id === selectedCameraId);
      if (camera) {
        map.setView([camera.lat, camera.lng], 15, { animate: true });
        marker.openPopup();
      }
    }
  }, [selectedCameraId, cameras]);

  return (
    <div className="relative h-full w-full group">
      <div ref={mapRef} className="map-container h-full w-full" />
      <div className="absolute top-4 right-4 z-[400] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={() => setIsLightMode(!isLightMode)}
          className="bg-background/80 backdrop-blur-md border border-border/50 text-foreground flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm hover:bg-background transition-colors"
        >
          {isLightMode ? (
            <><Moon className="w-3.5 h-3.5" /> Dark Map</>
          ) : (
            <><Sun className="w-3.5 h-3.5" /> Light Map</>
          )}
        </button>
      </div>
    </div>
  );
}
