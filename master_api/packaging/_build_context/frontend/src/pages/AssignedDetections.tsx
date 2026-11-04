import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDetections, useDetectionAction } from "@/hooks/use-detections";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { getMediaUrl } from "@/api/config";
import { Shield, MapPin, Camera as CameraIcon, Clock, AlertCircle, CheckCircle2, MoreHorizontal, Eye, Navigation } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AssignedDetections() {
  const { user } = useAuth();
  const { data: detections, isLoading } = useDetections();
  const [selectedDetection, setSelectedDetection] = useState<any>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"in_progress" | "resolved" | "failed">("in_progress");

  const [notes, setNotes] = useState("");
  const [proofs, setProofs] = useState<File[]>([]);
  const { toast } = useToast();
  const detectionAction = useDetectionAction();

  const assignedCompanyId = user?.organizationId || (user as any)?.organization_id || (user as any)?.companyId;
  const assignedDetections = detections?.filter(d => 
    d.assignedCompanyId === assignedCompanyId
  ) || [];

  const handleActionClick = (detection: any, actType: "in_progress" | "resolved" | "failed") => {
    setSelectedDetection(detection);
    setActionType(actType);
    setNotes("");
    setProofs([]);
    setActionModalOpen(true);
  };

  const submitAction = async () => {
    if (!selectedDetection) return;

    try {
      await detectionAction.mutateAsync({
        id: selectedDetection.id,
        status: actionType,
        notes: notes,
        proofFiles: proofs
      });
      
      toast({
        title: "Action updated",
        description: `Detection has been marked as ${actionType.replace('_', ' ')}.`,
      });
      setActionModalOpen(false);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: e.message || "Could not update detection action.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "unassigned": return <Badge variant="secondary">Unassigned</Badge>;
      case "pending": return <Badge variant="destructive">Pending Action</Badge>;
      case "in_progress": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">In Progress</Badge>;
      case "resolved": return <Badge className="bg-green-600 hover:bg-green-700 text-white">Resolved</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline" className="capitalize">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <AppLayout title="Assigned Detections" subtitle="Manage incidents assigned automatically to your company">
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground animate-pulse">Loading assigned incidents...</p>
          </div>
        ) : assignedDetections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/30">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">All Clear!</h3>
            <p className="text-muted-foreground mt-1 max-w-xs">
              No pending or in-progress incidents are currently assigned to your team.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {assignedDetections.map(detection => {
              const mainScreenshot = detection.imageUrls?.[0] || detection.detectionEvents?.[0]?.snapshotUrl;
              const sourceCamera = detection.detectionEvents?.[0]?.cameraName || "Unknown Camera";
              
              return (
                <Card key={detection.id} className="group overflow-hidden border-border/40 bg-card/60 backdrop-blur-md hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border-t-4 border-t-primary/20">
                  {/* Card Header with Image */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {mainScreenshot ? (
                      <img 
                        src={getMediaUrl(mainScreenshot)} 
                        alt="Detection" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <CameraIcon className="w-12 h-12 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-md border-none px-3 py-1 text-xs font-bold uppercase tracking-wider">
                        {detection.category}
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-bold text-lg leading-tight truncate">
                        {detection.name}
                      </h3>
                      <div className="flex items-center gap-2 text-white/70 text-xs mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(detection.createdAt).toLocaleTimeString()} · {new Date(detection.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* Status Overview */}
                    <div className="flex items-center justify-between">
                      {getStatusBadge(detection.handlingStatus || "unassigned")}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Navigation className="w-3 h-3" />
                        <span>Nearby Response</span>
                      </div>
                    </div>

                    <Separator className="opacity-50" />

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                          <Navigation className="w-3 h-3" /> Map navigation
                        </div>
                        {detection.detectionEvents?.[0]?.lat && detection.detectionEvents?.[0]?.lng ? (
                          <a 
                            href={`https://www.google.com/maps?q=${detection.detectionEvents[0].lat},${detection.detectionEvents[0].lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Open Google Maps
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground italic mt-1">Coords unavailable</p>
                        )}
                      </div>
                      <div className="space-y-1 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                          <CameraIcon className="w-3 h-3" /> Source Camera
                        </div>
                        <p className="text-sm font-medium truncate">{sourceCamera}</p>
                      </div>
                    </div>

                    {/* Detailed Attributes */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2 px-3 bg-muted/30 rounded-lg border border-border/10">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Type</span>
                        <p className="text-xs font-bold capitalize">{detection.subcategory?.replace('_', ' ') || "Standard"}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Age Group</span>
                        <p className="text-xs font-bold">{detection.age || "N/A"}</p>
                      </div>
                      {detection.crimeType && (
                        <div className="space-y-0.5 col-span-2 border-t border-border/10 pt-1 mt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Crime Category</span>
                          <p className="text-xs font-bold text-destructive/80">{detection.crimeType}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                        <AlertCircle className="w-3 h-3" /> Description
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 italic leading-relaxed">
                        "{detection.description}"
                      </p>
                    </div>

                    {detection.resolvedDynamicData && detection.resolvedDynamicData.length > 0 && (
                      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/20">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                          Associated Information
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {detection.resolvedDynamicData.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">{item.label}:</span>
                              <span className="font-semibold text-foreground/80">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col gap-3">
                      {detection.handlingStatus === "pending" && (
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 py-6 text-base font-bold"
                          onClick={() => handleActionClick(detection, "in_progress")}
                        >
                          <Shield className="w-5 h-5 mr-2" /> Start Response
                        </Button>
                      )}
                      {detection.handlingStatus === "in_progress" && (
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 font-bold"
                            onClick={() => handleActionClick(detection, "resolved")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="font-bold shadow-lg shadow-destructive/20"
                            onClick={() => handleActionClick(detection, "failed")}
                          >
                            <AlertCircle className="w-4 h-4 mr-2" /> Fail
                          </Button>
                        </div>
                      )}
                      {(detection.handlingStatus === "resolved" || detection.handlingStatus === "failed") && (
                        <div className="bg-secondary/30 p-4 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center gap-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Incident Finalized</p>
                          <p className="text-[10px] text-muted-foreground/60">This request has been completed and archived for history.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      }

      {/* Action Modal */}
        <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "in_progress" ? "Accept Detection" : 
                 actionType === "resolved" ? "Resolve Detection" : "Fail Detection"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
                <Textarea 
                  placeholder="Enter details about your action..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {(actionType === "resolved" || actionType === "failed") && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Proof Images (Optional)</label>
                  <Input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        setProofs(Array.from(e.target.files));
                      }
                    }}
                  />
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <Button variant="outline" className="mr-2" onClick={() => setActionModalOpen(false)}>Cancel</Button>
                <Button 
                  onClick={submitAction}
                  disabled={detectionAction.isPending}
                >
                  {detectionAction.isPending ? "Submitting..." : "Submit Action"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
