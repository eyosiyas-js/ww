import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CameraMap } from "@/components/cameras/CameraMap";
import { LiveFeedModal } from "@/components/cameras/LiveFeedModal";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "@/data/mockData";
import { useCameras } from "@/hooks/use-cameras";
import { useDetections } from "@/hooks/use-detections";
import { useNotifications } from "@/hooks/use-notifications";
import { 
  Camera as CameraIcon, 
  Search, 
  Bell,
  AlertTriangle,
  Activity,
  TrendingUp,
  Eye,
  ChevronRight,
  Clock
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { user } = useAuth();
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [showLiveFeed, setShowLiveFeed] = useState(false);

  // Redirection for Operator role
  if (user?.role === "Operator") {
    return <Navigate to="/detection" replace />;
  }

  const { data: cameras = [] } = useCameras();
  const { data: detections = [] } = useDetections();
  const { data: notifications = [] } = useNotifications();

  const handleCameraClick = (camera: Camera) => {
    setSelectedCamera(camera);
    setShowLiveFeed(true);
  };

  const onlineCameras = cameras.filter(c => c.status === "online").length;
  const flaggedCameras = cameras.filter(c => c.isFlagged);
  const activeDetections = detections.filter(d => d.status === "monitoring" || d.status === "detected").length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <AppLayout title="Dashboard" subtitle="Overview of surveillance system">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatsCard
            title="Active Cameras"
            value={`${onlineCameras}/${cameras.length}`}
            change={cameras.length > 0 ? `${Math.round((onlineCameras / cameras.length) * 100)}% online` : "0% online"}
            changeType="positive"
            icon={CameraIcon}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatsCard title="Active Detections" value={activeDetections} change="Currently monitoring" changeType="neutral" icon={Search} iconColor="text-primary" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatsCard title="Unread Alerts" value={unreadNotifications} change={unreadNotifications > 0 ? "Requires attention" : "All clear"} changeType={unreadNotifications > 0 ? "negative" : "positive"} icon={Bell} iconColor="text-warning" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatsCard title="Alerts" value={flaggedCameras.length} change={unreadNotifications > 0 ? `${unreadNotifications} unread` : "All read"} changeType={flaggedCameras.length > 0 ? "negative" : "positive"} icon={AlertTriangle} iconColor="text-destructive" />
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card className="glass-card h-[400px] overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Live Camera Network</CardTitle>
                  <CardDescription>Click on a camera to view live feed</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/cameras" className="gap-2">View All<ChevronRight className="w-4 h-4" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-80px)]">
              <CameraMap 
                cameras={cameras} 
                onCameraClick={handleCameraClick} 
                defaultCenter={user?.organizationLat && user?.organizationLng ? [user.organizationLat, user.organizationLng] : undefined}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts Sidebar */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card h-[400px] flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-destructive" />
                  Active Alerts
                  {flaggedCameras.length > 0 && <Badge variant="destructive">{flaggedCameras.length}</Badge>}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild><Link to="/notifications">View All</Link></Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {flaggedCameras.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3"><Activity className="w-6 h-6 text-success" /></div>
                  <p className="text-muted-foreground">No active alerts</p>
                  <p className="text-xs text-muted-foreground/60">All systems operational</p>
                </div>
              ) : (
                flaggedCameras.map((camera) => (
                  <button key={camera.id} onClick={() => handleCameraClick(camera)} className="w-full p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors text-left">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-destructive/20"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{camera.name}</p>
                        <p className="text-xs text-muted-foreground">{camera.location}</p>
                        {camera.lastDetection && <p className="text-xs text-destructive mt-1">Detected {camera.lastDetection}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" />Recent Detections</CardTitle>
                <Button variant="ghost" size="sm" asChild><Link to="/detection">View All</Link></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {detections.slice(0, 3).map((detection) => (
                <div key={detection.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${detection.status === "detected" ? "bg-destructive/20" : "bg-primary/20"}`}>
                      <Search className={`w-4 h-4 ${detection.status === "detected" ? "text-destructive" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{detection.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{detection.category}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`capitalize ${
                      detection.status === "detected" ? "border-destructive/50 text-destructive" : 
                      detection.status === "monitoring" ? "border-primary/50 text-primary" : 
                      detection.status === "in_progress" ? "border-blue-500/50 text-blue-600" :
                      detection.status === "resolved" ? "border-green-500/50 text-green-600" : 
                      detection.status === "failed" ? "border-destructive/50 text-destructive" : ""
                    }`}
                  >
                    {detection.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-warning" />Recent Notifications</CardTitle>
                <Button variant="ghost" size="sm" asChild><Link to="/notifications">View All</Link></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.filter(n => !n.read).slice(0, 3).map((notif) => (
                <div key={notif.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${notif.type === "alert" ? "bg-destructive/20" : notif.type === "warning" ? "bg-warning/20" : "bg-primary/20"}`}>
                      <Bell className={`w-4 h-4 ${notif.type === "alert" ? "text-destructive" : notif.type === "warning" ? "text-warning" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{notif.message}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`capitalize ${notif.type === "alert" ? "border-destructive/50 text-destructive" : notif.type === "warning" ? "border-warning/50 text-warning" : ""}`}>
                    {notif.type}
                  </Badge>
                </div>
              ))}
              {notifications.filter(n => !n.read).length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">No unread notifications</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <LiveFeedModal camera={selectedCamera} open={showLiveFeed} onOpenChange={setShowLiveFeed} />
    </AppLayout>
  );
}
