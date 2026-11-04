import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getCameras } from "@/api/services/cameraService";
import { getDetections, updateDetection } from "@/api/services/detectionService";
import { useSimulateWeaponDetection } from "@/hooks/use-weapon-detections";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, User, Car, Target, AlertTriangle } from "lucide-react";

const WEAPON_TYPES = [
  { id: "handgun", name: "Handgun" },
  { id: "rifle", name: "Rifle / Assault Rifle" },
  { id: "knife", name: "Knife / Edged Weapon" },
  { id: "explosive", name: "Explosive Device" },
];

export default function SimulationPage() {
  const { user } = useAuth();
  const { mutateAsync: simulateWeapon } = useSimulateWeaponDetection();
  
  const [cameras, setCameras] = useState<any[]>([]);
  const [detections, setDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // General Simulation State
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedDetection, setSelectedDetection] = useState<string>('');
  const [selectedStandardImage, setSelectedStandardImage] = useState<File | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  // Weapon Simulation State
  const [selectedWeaponType, setSelectedWeaponType] = useState<string>(WEAPON_TYPES[0].id);
  const [selectedWeaponCamera, setSelectedWeaponCamera] = useState<string>('');
  const [selectedWeaponImage, setSelectedWeaponImage] = useState<File | null>(null);
  const [isWeaponTriggering, setIsWeaponTriggering] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [camerasData, detectionsData] = await Promise.all([
          getCameras(),
          getDetections()
        ]);
        
        setCameras(camerasData || []);
        if (camerasData && camerasData.length > 0) {
          setSelectedCamera(camerasData[0].id);
          setSelectedWeaponCamera(camerasData[0].id);
        }
        
        setDetections(detectionsData || []);
        if (detectionsData && detectionsData.length > 0) {
          setSelectedDetection(detectionsData[0].id);
        }
      } catch (error) {
        console.error("Failed to load data for simulation", error);
        toast.error('Failed to load required data');
      } finally {
        setLoading(false);
      }
    }
    
    if (user?.role === 'SuperAdmin' || user?.role === 'Super Admin' || user?.role === 'Admin') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user || (user.role !== 'SuperAdmin' && user.role !== 'Super Admin' && user.role !== 'Admin')) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              The Mock Detection Engine is restricted to Super Admin users only.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleTrigger = async () => {
    if (!selectedCamera) {
      toast.error('Please select a camera');
      return;
    }
    if (!selectedDetection) {
      toast.error('Please select a detection request');
      return;
    }

    setIsTriggering(true);
    try {
      const detectionData = await updateDetection({
        id: selectedDetection,
        cameraId: selectedCamera,
        imageFiles: selectedStandardImage ? [selectedStandardImage] : []
      });
      
      if (detectionData && detectionData.id) {
        toast.success('Detection simulation triggered successfully');
        if (detectionData.assignedOfficers && detectionData.assignedOfficers.length > 0) {
          console.log('[SIMULATION] Officers assigned:', detectionData.assignedOfficers);
        } else if (detectionData.assignedCompanyName) {
          console.log('[SIMULATION] Assigned to company:', detectionData.assignedCompanyName);
        } else {
          const reason = (detectionData as any).dispatchMessage || 'No specific reason found in API response';
          console.log(`[SIMULATION] Warning: No officers or company assigned.\nReason: ${reason}`);
        }
        setSelectedStandardImage(null);
      } else {
        toast.error('Failed to trigger simulation');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error triggering simulation');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleWeaponTrigger = async () => {
    if (!selectedWeaponCamera) {
      toast.error('Please select a camera');
      return;
    }
    if (!selectedWeaponImage) {
      toast.error('Please provide a simulation image proof');
      return;
    }

    setIsWeaponTriggering(true);
    try {
      await simulateWeapon({
        weaponType: selectedWeaponType,
        confidence: 0.85 + (Math.random() * 0.1), // Random high confidence
        cameraId: selectedWeaponCamera,
        imageFile: selectedWeaponImage
      });
      toast.success('Weapon detection alert simulated successfully');
      setSelectedWeaponImage(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to simulate weapon detection');
    } finally {
      setIsWeaponTriggering(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mock Detection Engine</h1>
        <p className="text-muted-foreground">Test system response by triggering simulated detection events.</p>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="standard" className="gap-2">
            <Target className="w-4 h-4" /> Personnel & Vehicles
          </TabsTrigger>
          <TabsTrigger value="weapon" className="gap-2">
            <ShieldAlert className="w-4 h-4" /> Weapon Detection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Target Simulation
              </CardTitle>
              <CardDescription>
                Simulate a match for an existing personnel or vehicle detection request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Target Request</Label>
                <Select 
                  value={selectedDetection} 
                  onValueChange={setSelectedDetection}
                  disabled={loading || detections.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "Loading requests..." : "Select a request"} />
                  </SelectTrigger>
                  <SelectContent>
                    {detections.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-2">
                          {d.category === 'person' ? <User className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                          {d.name} ({d.category})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Detecting Camera</Label>
                <Select 
                  value={selectedCamera} 
                  onValueChange={setSelectedCamera}
                  disabled={loading || cameras.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "Loading cameras..." : "Select a camera"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.location})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Simulated Snapshot Proof</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedStandardImage(file);
                  }}
                  className="cursor-pointer file:text-primary hover:file:bg-primary/10"
                />
              </div>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex gap-3">
                <Target className="w-5 h-5 shrink-0 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">
                  This will link a successful detection event to the selected request and trigger notifications.
                </p>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleTrigger}
                disabled={isTriggering || !selectedCamera || !selectedDetection}
              >
                {isTriggering ? 'Processing...' : 'Generate Target Alert'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weapon">
          <Card className="border-red-500/20 shadow-lg shadow-red-500/5">
            <CardHeader className="bg-red-500/5">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-5 h-5" /> Threat Simulation
              </CardTitle>
              <CardDescription>
                Simulate an immediate weapon detection threat. This creates a new read-only alert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label>Weapon Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {WEAPON_TYPES.map((type) => (
                    <Button
                      key={type.id}
                      variant={selectedWeaponType === type.id ? "default" : "outline"}
                      className={`justify-start gap-2 h-12 ${selectedWeaponType === type.id ? "bg-red-600 hover:bg-red-700" : ""}`}
                      onClick={() => setSelectedWeaponType(type.id)}
                    >
                      <Target className="w-4 h-4 opacity-50" />
                      {type.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Detecting Camera</Label>
                <Select 
                  value={selectedWeaponCamera} 
                  onValueChange={setSelectedWeaponCamera}
                  disabled={loading || cameras.length === 0}
                >
                  <SelectTrigger className="border-red-500/30 focus:ring-red-500/20">
                    <SelectValue placeholder="Select a camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.location})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Simulated AI Snapshot</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedWeaponImage(file);
                  }}
                  className="border-red-500/30 file:text-red-500 hover:file:bg-red-500/10 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 text-amber-800 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-medium">
                  CAUTION: This will trigger real-time panic alerts and broadcast notifications to all organization operators.
                </p>
              </div>

              <Button 
                className="w-full bg-red-600 hover:bg-red-700" 
                size="lg" 
                onClick={handleWeaponTrigger}
                disabled={isWeaponTriggering || !selectedWeaponCamera}
              >
                {isWeaponTriggering ? 'Simulating Threat...' : 'Trigger Weapon Alert'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
