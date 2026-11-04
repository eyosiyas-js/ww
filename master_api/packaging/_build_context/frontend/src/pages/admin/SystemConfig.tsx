import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSystemSettings, useUpdateSystemSetting } from "@/hooks/use-admin";
import { Settings, Save, MapPin, Radio, Loader2, Info, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SystemConfig() {
  const { data: settings = [], isLoading } = useSystemSettings();
  const updateSetting = useUpdateSystemSetting();
  
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (settings.length > 0) {
      const initial: Record<string, any> = {};
      settings.forEach(s => {
        initial[s.key] = s.value;
      });
      setLocalSettings(initial);
    }
  }, [settings]);

  const handleSave = async (key: string) => {
    try {
      await updateSetting.mutateAsync({
        key,
        value: localSettings[key]
      });
      toast.success(`${key} updated successfully`);
    } catch (error) {
      toast.error(`Failed to update ${key}`);
    }
  };

  const handleChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <AdminLayout title="System Configuration" subtitle="Loading network parameters...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="System Configuration" 
      subtitle="Manage global assignment parameters and network thresholds"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Officer Dispatch Range</CardTitle>
                  <CardDescription>Configure how far the system searches for nearby officers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="assignment_radius_traffic" className="text-sm font-medium flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary" /> Traffic Police Radius (KM)
                  </Label>
                  <div className="flex gap-3">
                    <Input 
                      id="assignment_radius_traffic"
                      type="number"
                      step="0.1"
                      placeholder="10.0"
                      className="flex-1"
                      value={localSettings["assignment_radius_traffic"] || ""}
                      onChange={(e) => handleChange("assignment_radius_traffic", parseFloat(e.target.value))}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleSave("assignment_radius_traffic")}
                      disabled={updateSetting.isPending}
                      className="gap-2"
                    >
                      {updateSetting.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Applies to detections submitted directly from Traffic Department cameras.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="assignment_radius_standard" className="text-sm font-medium flex items-center gap-2">
                    <Radio className="w-4 h-4 text-warning" /> Standard Device Radius (KM)
                  </Label>
                  <div className="flex gap-3">
                    <Input 
                      id="assignment_radius_standard"
                      type="number"
                      step="0.1"
                      placeholder="5.0"
                      className="flex-1"
                      value={localSettings["assignment_radius_standard"] || ""}
                      onChange={(e) => handleChange("assignment_radius_standard", parseFloat(e.target.value))}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleSave("assignment_radius_standard")}
                      disabled={updateSetting.isPending}
                      variant="outline"
                      className="gap-2"
                    >
                      {updateSetting.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Applies to detections on non-traffic cameras that are linked to a traffic company.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-destructive/5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Detection Parameters</CardTitle>
                  <CardDescription>Visual alert thresholds and persistence</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="camera_alert_timeout_minutes" className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" /> Camera Alert Timeout (Minutes)
                  </Label>
                  <div className="flex gap-3">
                    <Input 
                      id="camera_alert_timeout_minutes"
                      type="number"
                      step="1"
                      placeholder="5"
                      className="flex-1"
                      value={localSettings["camera_alert_timeout_minutes"] || ""}
                      onChange={(e) => handleChange("camera_alert_timeout_minutes", parseInt(e.target.value))}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleSave("camera_alert_timeout_minutes")}
                      disabled={updateSetting.isPending}
                      className="gap-2"
                    >
                      {updateSetting.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    How long a camera icon stays in the "Alert" state on the map after the last detection.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="glass-card border-l-4 border-l-primary h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Configuration Note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <p>
                Updates to dispatch ranges take effect <strong>immediately</strong> for all new detections. 
                Ongoing assignments are not affected by radius changes.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Best Practices:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Use larger radii (10km-20km) for rural/highway zones.</li>
                  <li>Use smaller radii (2km-5km) for dense urban areas to ensure faster response.</li>
                  <li>Consider officer staleness (currently 5 minutes) when setting wide ranges.</li>
                  <li>Set alert timeouts carefully; too short might cause operators to miss alerts, too long can clutter the map with stale incidents.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
