import React, { useState, Suspense } from "react";

const LocationPicker = React.lazy(() => import("@/components/admin/LocationPicker"));
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  useAdminDevices, 
  useAdminCompanies, 
  useCreateCamera, 
  useUpdateCamera, 
  useDeleteCamera,
  useToggleCameraAccess,
  useCameraAccessOrgs
} from "@/hooks/use-admin";
import { 
  Search, 
  Filter, 
  Camera, 
  Radio, 
  Plane, 
  Cpu, 
  Plus, 
  Edit2, 
  ShieldAlert, 
  Trash2,
  Settings2,
  Globe,
  MapPin
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const deviceIcons: Record<string, typeof Camera> = { camera: Camera, sensor: Radio, drone: Plane };

export default function DeviceManagement() {
  const { user } = useAuthContext();
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [accessDeviceId, setAccessDeviceId] = useState<string | null>(null);
  const [formLat, setFormLat] = useState<number | undefined>(undefined);
  const [formLng, setFormLng] = useState<number | undefined>(undefined);
  const [showMap, setShowMap] = useState(false);

  const isSuperAdmin = user?.role === "Super Admin";

  const { data: devices = [], isLoading: devicesLoading } = useAdminDevices();
  const { data: companies = [] } = useAdminCompanies();
  
  const createMutation = useCreateCamera();
  const updateMutation = useUpdateCamera();
  const deleteMutation = useDeleteCamera();

  const filtered = devices.filter(d => {
    if (isSuperAdmin && filterCompany !== "all" && d.companyId !== filterCompany) return false;
    if (!isSuperAdmin && d.companyId !== user?.organizationId) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const online = devices.filter(d => d.status === "online").length;
  const offline = devices.filter(d => d.status === "offline").length;

  const handleCreateOrUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      location: formData.get("location") as string,
      streamUrl: formData.get("streamUrl") as string,
      status: formData.get("status") as string,
      organizationId: formData.get("organizationId") === "internal" ? undefined : formData.get("organizationId") as string | undefined,
      lat: formLat,
      lng: formLng,
    };

    try {
      if (editingDevice) {
        await updateMutation.mutateAsync({ id: editingDevice.id, updates: payload });
        toast.success("Device updated successfully");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Device created successfully");
      }
      setIsFormOpen(false);
      setEditingDevice(null);
      setFormLat(undefined);
      setFormLng(undefined);
      setShowMap(false);
    } catch (error) {
      toast.error("Failed to save device");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this device?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Device deleted");
      } catch (error) {
        toast.error("Failed to delete device");
      }
    }
  };

  return (
    <AdminLayout title="Device Management" subtitle="Manage global camera pool and organization access">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="glass-card p-4 transition-all hover:shadow-md border-l-4 border-l-success">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success"><Cpu className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-muted-foreground">Online Devices</p><p className="text-2xl font-bold">{online}</p></div>
          </div>
        </Card>
        <Card className="glass-card p-4 transition-all hover:shadow-md border-l-4 border-l-destructive">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive"><Cpu className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-muted-foreground">Offline Devices</p><p className="text-2xl font-bold">{offline}</p></div>
          </div>
        </Card>
        <Card className="glass-card p-4 transition-all hover:shadow-md border-l-4 border-l-primary">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Camera className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-muted-foreground">Total Fleet</p><p className="text-2xl font-bold">{devices.length}</p></div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or location..." 
              className="pl-9 bg-background/50" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-background/50"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isSuperAdmin && (
          <Button onClick={() => { setEditingDevice(null); setFormLat(undefined); setFormLng(undefined); setShowMap(false); setIsFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Global Camera
          </Button>
        )}
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[250px]">Device Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? (
                filtered.map(d => {
                  const Icon = deviceIcons[d.type] || Cpu;
                  return (
                    <TableRow key={d.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/5 text-primary"><Icon className="w-4 h-4" /></div>
                          <div>
                            <p className="text-sm font-semibold">{d.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{d.id.slice(0, 8)}...</p>
                            {d.linkedTrafficCompanyName && (
                              <Badge variant="outline" className="mt-1 text-[9px] border-primary/50 text-primary">Traffic: {d.linkedTrafficCompanyName}</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-xs font-semibold text-muted-foreground">{d.type}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          < Globe className="w-3.5 h-3.5 text-muted-foreground" />
                          {d.location || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={d.status === "online" ? "default" : d.status === "offline" ? "destructive" : "secondary"} 
                          className="capitalize text-[10px] px-2"
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.lastActivity ? new Date(d.lastActivity).toLocaleString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isSuperAdmin && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => { setAccessDeviceId(d.id); setIsAccessOpen(true); }}
                                title="Manage Access"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => { setEditingDevice(d); setFormLat(d.lat); setFormLng(d.lng); setShowMap(false); setIsFormOpen(true); }}
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(d.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {!isSuperAdmin && (
                            <Badge variant="outline" className="text-[10px]">View Only</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {devicesLoading ? "Loading devices..." : "No devices found matching your criteria"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Camera Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] glass-card max-h-[90vh] overflow-y-auto">
          <form key={editingDevice?.id || "new"} onSubmit={handleCreateOrUpdate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingDevice ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingDevice ? "Edit Camera" : "Register New Camera"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details to {editingDevice ? "update the" : "register a new"} global camera.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Friendly Name</Label>
                <Input id="name" name="name" defaultValue={editingDevice?.name} placeholder="e.g. Main Entrance North" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location / Address</Label>
                <Input id="location" name="location" defaultValue={editingDevice?.location} placeholder="e.g. Building A, Floor 2" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="streamUrl">Stream URL (RTSP/HTTP)</Label>
                <Input id="streamUrl" name="streamUrl" defaultValue={editingDevice?.streamUrl} placeholder="rtsp://admin:pass@192.168.1.50/live" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Initial Status</Label>
                <Select name="status" defaultValue={editingDevice?.status || "online"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="organizationId">Linked Company</Label>
                <Select name="organizationId" defaultValue={editingDevice?.organizationId || editingDevice?.companyId || "internal"}>
                  <SelectTrigger className="bg-background/50"><SelectValue placeholder="Internal / No External Link" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal / No External Link</SelectItem>
                    {companies.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Section */}
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">GPS Location</Label>
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px]">Latitude</Label>
                      <Input 
                        value={formLat?.toFixed(6) || ""} 
                        readOnly 
                        placeholder="0.000000" 
                        className="h-8 text-xs bg-background/50" 
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Longitude</Label>
                      <Input 
                        value={formLng?.toFixed(6) || ""} 
                        readOnly 
                        placeholder="0.000000" 
                        className="h-8 text-xs bg-background/50" 
                      />
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full gap-2 text-xs h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => setShowMap(prev => !prev)}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {showMap ? "Hide Map" : formLat ? "Change Location on Map" : "Select Location on Map"}
                  </Button>
                  {showMap && (
                    <div className="mt-2">
                      <Suspense fallback={<div className="h-[250px] w-full bg-muted animate-pulse rounded-xl" />}>
                        <LocationPicker 
                          initialLat={formLat} 
                          initialLng={formLng} 
                          onSelect={(lat, lng) => { setFormLat(lat); setFormLng(lng); }} 
                        />
                      </Suspense>
                      <p className="text-[10px] text-muted-foreground mt-2 italic">
                        Click anywhere on the map to set the camera's precise location.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingDevice ? "Update Device" : "Register Device"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Access Control Dialog */}
      {accessDeviceId && (
        <AccessControlDialog 
          isOpen={isAccessOpen} 
          onOpenChange={setIsAccessOpen} 
          cameraId={accessDeviceId} 
          companies={companies}
        />
      )}
    </AdminLayout>
  );
}

function AccessControlDialog({ isOpen, onOpenChange, cameraId, companies }: any) {
  const { data: accessOrgs = [], isLoading } = useCameraAccessOrgs(cameraId);
  const toggleMutation = useToggleCameraAccess();

  const handleToggle = async (organizationId: string, currentStatus: boolean) => {
    try {
      await toggleMutation.mutateAsync({
        cameraId,
        organizationId,
        hasAccess: !currentStatus
      });
      toast.success(`Access ${!currentStatus ? 'granted' : 'revoked'} successfully`);
    } catch (error) {
      toast.error("Failed to update access");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] glass-card p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Manage Access Control
          </DialogTitle>
          <DialogDescription>
            Grant or revoke company access to this camera device.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 mb-4 border border-border/50">
            <Camera className="w-8 h-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Device ID</p>
              <p className="text-sm font-mono truncate">{cameraId}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[350px] px-6">
          <div className="space-y-4 pb-6">
            {companies.length > 0 ? (
              companies.map((company: any) => {
                const hasAccess = accessOrgs.includes(company.id);
                return (
                  <div key={company.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/30 hover:bg-background/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{company.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{company.plan} Plan · {company.status}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={hasAccess ? "default" : "outline"} className="text-[9px] uppercase">
                        {hasAccess ? "Access" : "No Access"}
                      </Badge>
                      <Switch 
                        checked={hasAccess} 
                        onCheckedChange={() => handleToggle(company.id, hasAccess)}
                        disabled={toggleMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">No companies found</div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-muted/30 border-t border-border/50">
          <Button onClick={() => onOpenChange(false)} variant="secondary" className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
