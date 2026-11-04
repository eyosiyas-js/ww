import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CameraMap } from "@/components/cameras/CameraMap";
import { CameraList } from "@/components/cameras/CameraList";
import { LiveFeedModal } from "@/components/cameras/LiveFeedModal";
import { StatsCard } from "@/components/ui/stats-card";
import { Camera } from "@/data/mockData";
import { useCameras } from "@/hooks/use-cameras";
import { Camera as CameraIcon, WifiOff, AlertTriangle, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/contexts/AuthContext";

export default function CamerasPage() {
  const { user } = useAuthContext();
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const { data: cameras = [] } = useCameras();

  const defaultCenter: [number, number] | undefined = user?.organizationLat && user?.organizationLng 
    ? [user.organizationLat, user.organizationLng] 
    : undefined;

  const handleCameraClick = (camera: Camera) => {
    setSelectedCamera(camera);
    setShowLiveFeed(true);
  };

  const onlineCameras = cameras.filter(c => c.status === "online").length;
  const offlineCameras = cameras.filter(c => c.status === "offline").length;
  const flaggedCameras = cameras.filter(c => c.isFlagged).length;

  return (
    <AppLayout title="Camera Network" subtitle="Live surveillance monitoring">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Cameras" value={cameras.length} icon={CameraIcon} />
        <StatsCard title="Online" value={onlineCameras} change={cameras.length > 0 ? `${Math.round((onlineCameras / cameras.length) * 100)}% uptime` : "0%"} changeType="positive" icon={Activity} iconColor="text-success" />
        <StatsCard title="Offline" value={offlineCameras} icon={WifiOff} iconColor="text-destructive" />
        <StatsCard title="Active Alerts" value={flaggedCameras} change="Requires attention" changeType="negative" icon={AlertTriangle} iconColor="text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="h-full">
            <CameraMap cameras={cameras} onCameraClick={handleCameraClick} selectedCameraId={selectedCamera?.id} defaultCenter={defaultCenter} />
          </div>
        </div>
        <div className="glass-card p-4">
          <Tabs defaultValue="all" className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="all">All ({cameras.length})</TabsTrigger>
              <TabsTrigger value="alerts" className="text-destructive">Alerts ({flaggedCameras})</TabsTrigger>
              <TabsTrigger value="offline">Offline ({offlineCameras})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="flex-1 mt-0">
              <CameraList cameras={cameras} selectedCameraId={selectedCamera?.id} onCameraSelect={handleCameraClick} />
            </TabsContent>
            <TabsContent value="alerts" className="flex-1 mt-0">
              <CameraList cameras={cameras.filter(c => c.isFlagged)} selectedCameraId={selectedCamera?.id} onCameraSelect={handleCameraClick} />
            </TabsContent>
            <TabsContent value="offline" className="flex-1 mt-0">
              <CameraList cameras={cameras.filter(c => c.status === "offline")} selectedCameraId={selectedCamera?.id} onCameraSelect={handleCameraClick} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <LiveFeedModal camera={selectedCamera} open={showLiveFeed} onOpenChange={setShowLiveFeed} />
    </AppLayout>
  );
}
