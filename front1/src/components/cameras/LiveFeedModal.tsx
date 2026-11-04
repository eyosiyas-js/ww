import { Camera } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Camera as CameraIcon,
  MapPin,
  AlertTriangle,
  Download,
  Share2,
  Loader2,
  Wifi,
  WifiOff
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { startCameraStream } from "@/api/services/cameraService";

interface LiveFeedModalProps {
  camera: Camera | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LiveFeedModal({ camera, open, onOpenChange }: LiveFeedModalProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [frame, setFrame] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [alerts, setAlerts] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!open || !camera) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setFrame(null);
      setAlerts([]);
      return;
    }

    const connect = async () => {
      try {
        // Trigger stream start on backend
        await startCameraStream(camera.id);

        const defaultWs = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api`;
        const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || defaultWs;
        const wsUrl = `${wsBaseUrl}/cameras/ws/${camera.id}`;
        const ws = new WebSocket(wsUrl);
        ws.binaryType = "blob";
        wsRef.current = ws;

        ws.onopen = () => {
          setConnStatus("connected");
        };

        ws.onmessage = (event) => {
          if (event.data instanceof Blob) {
            const url = URL.createObjectURL(event.data);
            setFrame((prev) => {
              if (prev && prev.startsWith("blob:")) {
                URL.revokeObjectURL(prev);
              }
              return url;
            });
          } else if (typeof event.data === "string") {
            if (event.data === "ping") {
              ws.send("pong");
            } else {
              try {
                const data = JSON.parse(event.data);
                if (data.alerts) {
                  setAlerts(data.alerts);
                }
              } catch (err) {
                console.error("Invalid WS message:", err);
              }
            }
          }
        };

        ws.onclose = () => {
          setConnStatus("disconnected");
          // Reconnect logic could go here if needed
        };

        ws.onerror = () => {
          setConnStatus("error");
        };
      } catch (err) {
        console.error("Failed to start stream or connect WS:", err);
        setConnStatus("error");
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      setFrame((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
  }, [open, camera]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      await document.exitFullscreen().catch(err => {
        console.error(`Error attempting to disable fullscreen: ${err.message}`);
      });
    }
  };

  if (!camera) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <CameraIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">{camera.name}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {camera.location}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {connStatus === "connected" ? (
                  <Badge variant="outline" className="text-success border-success/30 bg-success/10 gap-1">
                    <Wifi className="w-3 h-3" />
                    Connected
                  </Badge>
                ) : connStatus === "connecting" ? (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Connecting
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 gap-1">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </Badge>
                )}
                <div className="live-indicator">LIVE</div>
              </div>
              {camera.isFlagged && (
                <Badge variant="destructive" className="gap-1 pulse-animation">
                  <AlertTriangle className="w-3 h-3" />
                  Detection Alert
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Video Feed */}
        <div ref={containerRef} className="relative aspect-video bg-black overflow-hidden group">
          {frame ? (
            <img
              src={frame}
              className="w-full h-full object-contain transition-opacity duration-300"
              alt="Live camera stream"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {connStatus === "error" ? (
                  <>
                    <WifiOff className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
                    <p className="text-destructive font-medium">Failed to connect to stream</p>
                    <p className="text-xs text-muted-foreground mt-1">Please check if the camera is online</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                    <p className="text-muted-foreground">Establishing connection...</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Connecting to {camera.name} feed
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Video overlay controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/80">
                  Camera ID: {camera.id}
                </span>
                {frame && (
                  <span className="text-[10px] text-white/50">
                    • {new Date().toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Alert overlay from WS alerts */}
          <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
            {alerts.map((alert, idx) => {
              const isCritical = /weapon|gun|knife|firearm/i.test(alert);
              return (
                <div
                  key={idx}
                  className={`${isCritical ? "bg-red-600/90" : "bg-amber-600/90"} text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">
                    {alert}
                  </span>
                </div>
              );
            })}

            {/* Legacy Flagged Alert if no WS alerts */}
            {camera.isFlagged && alerts.length === 0 && (
              <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Detection match found {camera.lastDetection ? `• ${camera.lastDetection}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export Clip
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

    </Dialog>
  );
}
