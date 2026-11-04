import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationPickerProps {
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function LocationPicker({ onSelect, initialLat, initialLng }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize the map once the container div is mounted
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center: L.LatLngExpression =
      initialLat != null && initialLng != null
        ? [initialLat, initialLng]
        : [9.0192, 38.7468]; // Default: Addis Ababa

    const map = L.map(mapRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Place initial marker if coordinates were provided
    if (initialLat != null && initialLng != null) {
      markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
    }

    // Click handler — place / move marker and report coordinates
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.marker(e.latlng).addTo(map);
      }

      onSelect(lat, lng);
    });

    mapInstanceRef.current = map;

    // Force a resize after a short delay so tiles render correctly inside dialogs
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mapRef}
      className="h-[400px] w-full rounded-xl overflow-hidden border border-border shadow-inner"
    />
  );
}
