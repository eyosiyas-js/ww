import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWeaponDetections } from "@/hooks/use-weapon-detections";
import { ShieldAlert, Clock, Camera, MapPin, AlertTriangle, Eye, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getMediaUrl } from "@/api/config";

export default function WeaponDetectionPage() {
  const { data: weaponDetections, isLoading } = useWeaponDetections();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const getSeverityStyle = (confidence: number) => {
    const severity = confidence > 0.8 ? "high" : confidence > 0.5 ? "medium" : "low";
    switch (severity) {
      case "high": return { color: "bg-red-500/10 text-red-600 border-red-500/20", label: "High" };
      case "medium": return { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Medium" };
      case "low": return { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Low" };
      default: return { color: "bg-muted text-muted-foreground", label: "" };
    }
  };

  return (
    <AppLayout title="Weapon Detection" subtitle="Real-time alerts for weapon detection events">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader className="pb-2 text-red-600">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Total Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weaponDetections?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader className="pb-2 text-amber-600">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> High Severity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {weaponDetections?.filter(d => d.confidence > 0.8).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2 text-primary">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" /> Last Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold truncate">
                {weaponDetections && weaponDetections.length > 0 
                  ? format(new Date(weaponDetections[0].createdAt), "MMM d, HH:mm:ss")
                  : "No alerts yet"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Detection History
            </CardTitle>
            <CardDescription>Live feed of weapon detections from connected cameras</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">Loading alerts...</p>
              </div>
            ) : !weaponDetections || weaponDetections.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-lg bg-muted/30">
                <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No Weapon Detections Found</h3>
                <p className="text-sm text-muted-foreground/60">System is actively monitoring all cameras.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {weaponDetections.map((detection) => (
                  <Card key={detection.id} className="overflow-hidden border-2 transition-all hover:shadow-lg hover:border-primary/30 group">
                    <div className="relative aspect-video bg-black overflow-hidden group-hover:cursor-pointer" onClick={() => detection.imageUrl && setSelectedImage(detection.imageUrl)}>
                      {detection.imageUrl ? (
                        <img 
                          src={getMediaUrl(detection.imageUrl)} 
                          alt={detection.weaponType} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/40 bg-muted/20">
                          <Camera className="w-10 h-10 mb-2" />
                          <span className="text-xs">No Snapshot Available</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className={`${getSeverityStyle(detection.confidence).color} capitalize`}>
                          {getSeverityStyle(detection.confidence).label}
                        </Badge>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Click to enlarge
                        </p>
                      </div>
                    </div>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-bold capitalize">{detection.weaponType.replace('_', ' ')}</CardTitle>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {Math.round(detection.confidence * 100)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Camera className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{detection.cameraName || 'Unknown Camera'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{detection.location || 'Unknown Location'}</span>
                        </div>
                        {detection.assignedCompanyName && (
                          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Target: {detection.assignedCompanyName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{format(new Date(detection.createdAt), "MMM d, HH:mm:ss")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          {selectedImage && (
            <div className="relative group">
              <img src={getMediaUrl(selectedImage)} alt="Weapon Detection Preview" className="w-full h-auto max-h-[85vh] object-contain" />
              <div className="absolute bottom-4 left-4 right-4 p-4 bg-black/50 backdrop-blur-md rounded-lg text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Live Alert Proof</p>
                <div className="flex justify-between items-end">
                   <div>
                     <h3 className="font-bold text-lg">Weapon Detected</h3>
                     <p className="text-sm opacity-80">Security protocol initiated. Tracking source.</p>
                   </div>
                   <Badge variant="destructive" className="animate-pulse">Active Event</Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
