import { Camera } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Camera as CameraIcon, WifiOff, Wrench, AlertTriangle, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CameraListProps {
  cameras: Camera[];
  selectedCameraId?: string;
  onCameraSelect: (camera: Camera) => void;
}

export function CameraList({ cameras, selectedCameraId, onCameraSelect }: CameraListProps) {
  const groupedCameras = cameras.reduce((acc, camera) => {
    if (!acc[camera.location]) {
      acc[camera.location] = [];
    }
    acc[camera.location].push(camera);
    return acc;
  }, {} as Record<string, Camera[]>);

  const getStatusIcon = (status: Camera["status"], isFlagged: boolean) => {
    if (isFlagged) return <AlertTriangle className="w-4 h-4 text-destructive" />;
    switch (status) {
      case "online": return <CameraIcon className="w-4 h-4 text-primary" />;
      case "offline": return <WifiOff className="w-4 h-4 text-destructive" />;
      case "maintenance": return <Wrench className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: Camera["status"]) => {
    switch (status) {
      case "online":
        return <Badge variant="outline" className="text-success border-success/50 bg-success/10">Online</Badge>;
      case "offline":
        return <Badge variant="outline" className="text-destructive border-destructive/50 bg-destructive/10">Offline</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="text-warning border-warning/50 bg-warning/10">Maintenance</Badge>;
    }
  };

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-240px)]">
      {Object.entries(groupedCameras).map(([location, locationCameras]) => (
        <div key={location} className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">{location}</h3>
            <span className="text-xs text-muted-foreground">({locationCameras.length})</span>
          </div>
          <div className="space-y-1">
            {locationCameras.map((camera) => (
              <button
                key={camera.id}
                onClick={() => onCameraSelect(camera)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200",
                  selectedCameraId === camera.id
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-card/50 border border-transparent hover:bg-card hover:border-border",
                  camera.isFlagged && "border-destructive/50 bg-destructive/5"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-lg",
                  camera.isFlagged ? "bg-destructive/20" : "bg-muted"
                )}>
                  {getStatusIcon(camera.status, camera.isFlagged)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{camera.name}</span>
                    {camera.isFlagged && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded bg-destructive text-destructive-foreground">
                        ALERT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStatusBadge(camera.status)}
                    {camera.lastDetection && (
                      <span className="text-xs text-muted-foreground">• {camera.lastDetection}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
