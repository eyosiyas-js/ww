import React, { useState, Suspense } from "react";
const DetectionMovementMap = React.lazy(() => import("@/components/detections/DetectionMovementMap"));
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Car, Package, Upload, Search, Clock, AlertCircle, Eye, Edit3, Trash2, Save, X, Gavel, Shield, PlayCircle, CheckCircle2, XCircle, ChevronDown, RefreshCw, Phone, MapPin, CreditCard, Hash, ShieldAlert, ShieldCheck } from "lucide-react";
import { DetectionRequest } from "@/data/mockData";
import { useDetections, useCreateDetection, useUpdateDetection, useDeleteDetection } from "@/hooks/use-detections";
import { useActiveFormTemplate } from "@/hooks/use-admin";
import { toast } from "@/hooks/use-toast";
import { getMediaUrl } from "@/api/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDetectionNationalIdMatches, useAutoMatchDetectionToNationalId, useNationalIdProfileByIdNumber } from "@/hooks/use-national-id";
import { useDetectionVehicleMatches, useVehicleByPlate, useAutoMatchDetectionToVehicle } from "@/hooks/use-vehicle-registration";

const CRIME_TYPES = [
  "Theft", "Robbery", "Assault", "Murder", "Kidnapping",
  "Fraud", "Drug Trafficking", "Vandalism", "Cybercrime",
  "Arson", "Burglary", "Extortion", "Forgery", "Smuggling",
  "Terrorism", "Other"
];

const categoryIcons = { person: User, vehicle: Car };
const statusColors = {
  pending: "bg-muted text-muted-foreground",
  monitoring: "bg-primary/20 text-primary",
  detected: "bg-destructive/20 text-destructive",
  in_progress: "bg-blue-500/20 text-blue-600",
  resolved: "bg-green-500/20 text-green-600",
  failed: "bg-destructive/20 text-destructive",
};

/** Maps internal subcategory code to a human-friendly label based on detection category. */
function getSubcategoryLabel(category: string, subcategory: string): string {
  if (category === "vehicle") {
    switch (subcategory) {
      case "missing": return "Missing Car";
      case "criminal": return "Crime Vehicle";
      default: return subcategory.replace("_", " ");
    }
  }
  // person or default
  switch (subcategory) {
    case "missing": return "Missing Person";
    case "criminal": return "Criminal";
    default: return subcategory.replace("_", " ");
  }
}

export default function DetectionPage() {
  const [selectedCategory, setSelectedCategory] = useState<"person" | "vehicle">("person");
  const [formData, setFormData] = useState({
    name: "", // Alias / description 
    description: "",
    age: "",
    location: "",
    subcategory: "" as "missing" | "criminal" | "",
    crimeType: "",
    plateNumber: "",
    code: "",
    region: "",
    eligibleForAssignment: true,
  });
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // ── Lookup state for person (National ID) and vehicle (plate) ──
  const [nationalIdInput, setNationalIdInput] = useState("");
  const [nationalIdLookupId, setNationalIdLookupId] = useState(""); // triggers query
  const [plateInput, setPlateInput] = useState("");
  const [plateLookupId, setPlateLookupId] = useState(""); // triggers query
  const [lookupFilled, setLookupFilled] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState<DetectionRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Full-info modals for National ID / Vehicle Registration
  const [fullInfoPerson, setFullInfoPerson] = useState<any | null>(null);
  const [fullInfoVehicle, setFullInfoVehicle] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    age: "",
    location: "",
    subcategory: "" as "missing" | "criminal" | "",
    crimeType: "",
    status: "",
    plateNumber: "",
    code: "",
    region: "",
    eligibleForAssignment: true
  });

  const navigate = useNavigate();
  const { user } = useAuthContext();
  const features = (user as any)?.organizationFeatures || {};
  const detectionsFeature = features.detections || "full";
  const isTrafficPolice = user?.companyType === "traffic_police";

  useEffect(() => {
    if (detectionsFeature === "none") {
      toast({ title: "Access Denied", description: "Your organization does not have access to Detections.", variant: "destructive" });
      navigate("/");
    }
  }, [detectionsFeature, navigate]);

  useEffect(() => {
    if (isTrafficPolice && selectedCategory !== "vehicle") {
      setSelectedCategory("vehicle");
    }
  }, [isTrafficPolice, selectedCategory]);

  const { data: detections = [] } = useDetections();
  const createDetection = useCreateDetection();
  const updateDetection = useUpdateDetection();
  const deleteDetection = useDeleteDetection();
  const { data: activeTemplate } = useActiveFormTemplate(selectedCategory);

  // ── National ID & Vehicle auto-match hooks (for post-submit matching) ──
  const autoMatchNationalId = useAutoMatchDetectionToNationalId();
  const autoMatchVehicle = useAutoMatchDetectionToVehicle();

  // ── Form quick-lookup hooks (declared first so useEffects below can reference them) ──
  const { data: lookedUpNationalId, isLoading: nationalIdLookupLoading } = useNationalIdProfileByIdNumber(
    nationalIdLookupId,
    !!nationalIdLookupId
  );
  const { data: lookedUpVehicle, isLoading: plateLookupLoading } = useVehicleByPlate(
    plateLookupId,
    !!plateLookupId
  );

  // ── Detection-dialog lookup hooks ──
  const { data: nationalIdMatches = [], isLoading: nationalIdLoading } = useDetectionNationalIdMatches(
    selectedDetection?.id ?? "",
    !!selectedDetection && selectedDetection.category === "person"
  );
  const { data: vehicleMatches = [], isLoading: vehicleMatchLoading } = useDetectionVehicleMatches(
    selectedDetection?.id ?? "",
    !!selectedDetection && selectedDetection.category === "vehicle"
  );
  const { data: vehicleByPlate, isLoading: plateLoading } = useVehicleByPlate(
    selectedDetection?.category === "vehicle" ? (selectedDetection?.plateNumber ?? "") : "",
    !!selectedDetection && selectedDetection.category === "vehicle" && !!selectedDetection.plateNumber
  );

  // ── Auto-fill effects: triggered when form-lookup data arrives ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lookedUpNationalId && !lookupFilled) {
      const dob = lookedUpNationalId.date_of_birth;
      let age = "";
      if (dob) {
        const years = new Date().getFullYear() - new Date(dob).getFullYear();
        age = String(years);
      }
      setFormData(prev => ({
        ...prev,
        name: lookedUpNationalId.full_name || prev.name,
        age,
        location: lookedUpNationalId.address || lookedUpNationalId.city || prev.location,
        description: prev.description || [
          lookedUpNationalId.occupation ? `Occupation: ${lookedUpNationalId.occupation}` : "",
          lookedUpNationalId.nationality ? `Nationality: ${lookedUpNationalId.nationality}` : "",
          lookedUpNationalId.phone_number ? `Phone: ${lookedUpNationalId.phone_number}` : "",
        ].filter(Boolean).join(" | "),
      }));
      setLookupFilled(true);
      toast({ title: "✅ National ID Found", description: `Auto-filled info for ${lookedUpNationalId.full_name}` });
    }
  }, [lookedUpNationalId]);

  useEffect(() => {
    if (lookedUpVehicle && !lookupFilled) {
      setFormData(prev => ({
        ...prev,
        name: `${lookedUpVehicle.vehicle_color || ""} ${lookedUpVehicle.vehicle_make || ""} ${lookedUpVehicle.vehicle_model || ""}`.trim() || prev.name,
        description: prev.description || [
          lookedUpVehicle.vehicle_year ? `Year: ${lookedUpVehicle.vehicle_year}` : "",
          lookedUpVehicle.vehicle_type ? `Type: ${lookedUpVehicle.vehicle_type}` : "",
          lookedUpVehicle.fuel_type ? `Fuel: ${lookedUpVehicle.fuel_type}` : "",
          lookedUpVehicle.owner_name ? `Owner: ${lookedUpVehicle.owner_name}` : "",
          lookedUpVehicle.owner_phone ? `Phone: ${lookedUpVehicle.owner_phone}` : "",
        ].filter(Boolean).join(" | "),
        plateNumber: plateLookupId || prev.plateNumber,
      }));
      setLookupFilled(true);
      toast({ title: "✅ Vehicle Found", description: `Auto-filled info for plate ${lookedUpVehicle.plate_number}` });
    }
  }, [lookedUpVehicle]);

  useEffect(() => {
    if (selectedDetection) {
      const updated = detections.find(d => d.id === selectedDetection.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedDetection)) {
        setSelectedDetection(updated);
      }
    }
  }, [detections, selectedDetection]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File Too Large", description: `${file.name} is over 10MB.`, variant: "destructive" });
        return;
      }
      validFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setImageFiles(prev => [...prev, ...validFiles]);
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCardClick = (detection: DetectionRequest) => {
    setSelectedDetection(detection);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditClick = () => {
    if (selectedDetection) {
      setEditFormData({
        name: selectedDetection.name,
        description: selectedDetection.description,
        age: selectedDetection.age || "",
        location: selectedDetection.location || "",
        subcategory: selectedDetection.subcategory || "",
        crimeType: selectedDetection.crimeType || "",
        status: selectedDetection.status,
        plateNumber: selectedDetection.plateNumber || "",
        code: selectedDetection.code || "",
        region: selectedDetection.region || "",
        eligibleForAssignment: selectedDetection.eligibleForAssignment ?? true
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleStatusUpdate = (id: string, newStatus: string) => {
    const statusLabel = newStatus.replace("_", " ");
    if (window.confirm(`Are you sure you want to change the status to "${statusLabel}"?`)) {
      updateDetection.mutate({ id, status: newStatus }, {
        onSuccess: () => {
          toast({ title: "Status Updated", description: `Detection status changed to ${statusLabel}.` });
        }
      });
    }
  };

  const handleUpdate = () => {
    if (selectedDetection) {
      updateDetection.mutate(
        {
          id: selectedDetection.id,
          ...editFormData,
          subcategory: editFormData.subcategory || undefined,
          crimeType: editFormData.subcategory === "criminal" ? editFormData.crimeType : undefined,
          plateNumber: editFormData.plateNumber,
          code: editFormData.code,
          region: editFormData.region,
          eligibleForAssignment: editFormData.eligibleForAssignment,
          imageFiles: imageFiles
        },
        {
          onSuccess: (updated) => {
            toast({ title: "Detection Updated", description: "The detection request has been updated successfully." });
            setSelectedDetection(updated);
            setIsEditing(false);
            setImageFiles([]);
            setImagePreviews([]);
          }
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this detection request? This action cannot be undone.")) {
      deleteDetection.mutate(id, {
        onSuccess: () => {
          toast({ title: "Detection Deleted", description: "The detection request has been removed." });
          setIsModalOpen(false);
          setSelectedDetection(null);
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createDetection.mutate(
      {
        category: selectedCategory,
        name: formData.name,
        description: formData.description,
        age: selectedCategory === "person" ? formData.age : undefined,
        location: selectedCategory === "person" ? formData.location : undefined,
        subcategory:
          (selectedCategory === "person" || selectedCategory === "vehicle") && formData.subcategory
            ? (formData.subcategory as "missing" | "criminal")
            : undefined,
        crimeType:
          selectedCategory === "person" && formData.subcategory === "criminal" && formData.crimeType
            ? formData.crimeType
            : undefined,
        plateNumber: selectedCategory === "vehicle" ? formData.plateNumber : undefined,
        code: selectedCategory === "vehicle" ? formData.code : undefined,
        region: selectedCategory === "vehicle" ? formData.region : undefined,
        eligibleForAssignment: formData.eligibleForAssignment,
        imageFiles: selectedCategory === "vehicle" ? [] : imageFiles,
        formTemplateId: activeTemplate?.id,
        dynamicData: activeTemplate ? dynamicFormData : undefined,
      },
      {
        onSuccess: async (createdDetection) => {

          /* ======================================================
             TEMPORARY: Forward submission to external backend
             Server: http://172.27.3.47:5000
             Remove or comment this block later
          ====================================================== */

          try {
            if (formData.subcategory === "criminal") {

              const form = new FormData();
              form.append("name", formData.name);
              form.append("father_name", "");
              form.append("gender", "");
              form.append("dob", "");
              form.append("crimes", formData.description);
              form.append("profile_idx", "0");

              imageFiles.forEach((file) => {
                form.append("files", file);
              });

              await fetch("http://172.27.3.47:5000/api/criminal/register/criminal", {
                method: "POST",
                body: form,
              });
            }

            if (formData.subcategory === "missing") {

              const form = new FormData();
              form.append("name", formData.name);
              form.append("father_name", "");
              form.append("gender", "");
              form.append("dob", "");
              form.append("crimes", formData.description);
              form.append("profile_idx", "0");

              imageFiles.forEach((file) => {
                form.append("files", file);
              });

              await fetch("http://172.27.3.47:5000/api/criminal/register/missing", {
                method: "POST",
                body: form,
              });
            }

          } catch (err) {
            console.warn("Temporary external submission failed:", err);
          }

          /* ====================================================== */

          /* Auto-match against National ID / Vehicle Registration DB */
          if (createdDetection?.id) {
            if (selectedCategory === "person") {
              autoMatchNationalId.mutate(createdDetection.id);
            } else if (selectedCategory === "vehicle") {
              autoMatchVehicle.mutate(createdDetection.id);
            }
          }

          toast({
            title: "Detection Request Submitted",
            description: `Monitoring for ${selectedCategory}: ${formData.name}${imageFiles.length > 0 ? ` with ${imageFiles.length} images` : ""
              }`,
          });

          setFormData({
            name: "",
            description: "",
            age: "",
            location: "",
            subcategory: "",
            crimeType: "",
            plateNumber: "",
            code: "",
            region: "",
            eligibleForAssignment: true,
          });
          setDynamicFormData({});
          setImageFiles([]);
          setImagePreviews([]);
        },
      }
    );
  };


  const getStatusIcon = (status: DetectionRequest["status"]) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "monitoring": return <Eye className="w-4 h-4" />;
      case "detected": return <AlertCircle className="w-4 h-4" />;
      case "in_progress": return <PlayCircle className="w-4 h-4" />;
      case "resolved": return <Shield className="w-4 h-4" />;
      case "failed": return <XCircle className="w-4 h-4" />;
    }
  };

  return (
    <AppLayout title="Detection Management" subtitle="Submit and monitor detection requests">
      <div className={`grid grid-cols-1 ${detectionsFeature === "full" ? "lg:grid-cols-2" : ""} gap-6`}>
        {/* Submission Form */}
        {detectionsFeature === "full" && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-primary" />New Detection Request</CardTitle>
              <CardDescription>Submit a person, vehicle, or object for the detection system to monitor</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["person", "vehicle"] as const).map((category) => {
                      const isDisabled = isTrafficPolice && category === "person";
                      const Icon = categoryIcons[category];
                      return (
                        <button key={category} type="button" onClick={() => !isDisabled && setSelectedCategory(category)}
                          disabled={isDisabled}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 ${selectedCategory === category ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"} ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                          <Icon className={`w-6 h-6 ${selectedCategory === category ? "text-primary flex-shrink-0" : "text-muted-foreground flex-shrink-0"}`} />
                          <div className="flex flex-col flex-1 min-w-0 w-full items-center">
                            <span className={`text-sm font-medium capitalize truncate w-full flex-1 max-w-[80%] ${selectedCategory === category ? "text-foreground" : "text-muted-foreground"}`}>{category}</span>
                            {isDisabled && <span className="text-[10px] text-destructive font-bold truncate max-w-full">Restricted</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* ── PERSON: National ID Quick Lookup ── */}
                {selectedCategory === "person" && (
                  <div className="space-y-2 p-3 rounded-xl border border-blue-500/30 bg-blue-500/5">
                    <Label className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Quick Lookup by National ID (Optional)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter National ID number..."
                        value={nationalIdInput}
                        onChange={(e) => { setNationalIdInput(e.target.value); setLookupFilled(false); }}
                        className="font-mono text-sm flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!nationalIdInput.trim() || nationalIdLookupLoading}
                        onClick={() => { setNationalIdLookupId(nationalIdInput.trim()); setLookupFilled(false); }}
                        className="shrink-0 gap-1"
                      >
                        {nationalIdLookupLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        {nationalIdLookupLoading ? "Looking..." : "Lookup"}
                      </Button>
                    </div>
                    {lookedUpNationalId && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                        {lookedUpNationalId.profile_photo_url && (
                          <img src={getMediaUrl(lookedUpNationalId.profile_photo_url)} alt="" className="w-8 h-8 rounded-full object-cover border border-blue-400" />
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-sm text-blue-700 dark:text-blue-300">{lookedUpNationalId.full_name}</p>
                          <p className="text-muted-foreground">{lookedUpNationalId.national_id_number} · {lookedUpNationalId.gender} · {lookedUpNationalId.date_of_birth}</p>
                          {lookedUpNationalId.phone_number && <p className="text-muted-foreground">📞 {lookedUpNationalId.phone_number}</p>}
                        </div>
                        <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-[10px]">Found</Badge>
                      </div>
                    )}
                    {nationalIdLookupId && !nationalIdLookupLoading && !lookedUpNationalId && (
                      <p className="text-xs text-destructive">⚠ No record found for ID: {nationalIdLookupId}</p>
                    )}
                  </div>
                )}

                {/* ── VEHICLE: Plate Quick Lookup ── */}
                {selectedCategory === "vehicle" && (
                  <div className="space-y-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <Label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5" /> Quick Lookup by Plate Number (Optional)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., AA-123456"
                        value={plateInput}
                        onChange={(e) => { setPlateInput(e.target.value.toUpperCase()); setLookupFilled(false); }}
                        className="font-mono text-sm uppercase flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!plateInput.trim() || plateLookupLoading}
                        onClick={() => { setPlateLookupId(plateInput.trim()); setLookupFilled(false); }}
                        className="shrink-0 gap-1"
                      >
                        {plateLookupLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        {plateLookupLoading ? "Looking..." : "Lookup"}
                      </Button>
                    </div>
                    {lookedUpVehicle && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                            {lookedUpVehicle.vehicle_make} {lookedUpVehicle.vehicle_model} ({lookedUpVehicle.vehicle_year})
                          </p>
                          <div className="flex gap-1">
                            {lookedUpVehicle.is_stolen && <Badge className="bg-destructive/15 text-destructive text-[10px]">STOLEN</Badge>}
                            {lookedUpVehicle.is_wanted && <Badge className="bg-amber-500/15 text-amber-700 text-[10px]">WANTED</Badge>}
                            {!lookedUpVehicle.is_stolen && !lookedUpVehicle.is_wanted && <Badge className="bg-green-500/15 text-green-700 text-[10px]">CLEAR</Badge>}
                          </div>
                        </div>
                        <p className="font-mono text-emerald-600 tracking-widest">{lookedUpVehicle.plate_number} · {lookedUpVehicle.vehicle_color}</p>
                        {lookedUpVehicle.owner_name && <p className="text-muted-foreground">👤 {lookedUpVehicle.owner_name} · {lookedUpVehicle.owner_phone}</p>}
                      </div>
                    )}
                    {plateLookupId && !plateLookupLoading && !lookedUpVehicle && (
                      <p className="text-xs text-destructive">⚠ No vehicle registered with plate: {plateLookupId}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">{selectedCategory === "person" ? "Name / Alias" : "Vehicle Name / Brand"}</Label>
                  <Input id="name" placeholder={selectedCategory === "person" ? "Enter name or alias..." : "e.g., Black Toyota Corolla"} value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
                </div>

                {selectedCategory === "person" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subcategory">Subcategory</Label>
                        <Select
                          value={formData.subcategory}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value as any, crimeType: value !== "criminal" ? "" : prev.crimeType }))}
                        >
                          <SelectTrigger id="subcategory">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="missing">Missing Person</SelectItem>
                            <SelectItem value="criminal">Criminal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="age">Age (Approx.)</Label>
                        <Input id="age" placeholder="e.g., 35" value={formData.age} onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="location">Last Known Location</Label>
                        <Input id="location" placeholder="e.g., 5th Avenue, near Central Park" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} />
                      </div>
                    </div>

                    {/* Crime Type Dropdown — visible when subcategory is "criminal" */}
                    {formData.subcategory === "criminal" && (
                      <div className="space-y-2 p-4 border-2 border-amber-500/30 bg-amber-500/5 rounded-lg">
                        <Label htmlFor="crimeType" className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                          <Gavel className="w-4 h-4" />
                          Crime Type
                        </Label>
                        <Select
                          value={formData.crimeType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, crimeType: value }))}
                        >
                          <SelectTrigger id="crimeType" className="border-amber-500/30 focus:ring-amber-500/30">
                            <SelectValue placeholder="Select crime type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CRIME_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {selectedCategory === "vehicle" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="plateNumber">Plate Number</Label>
                        <Input id="plateNumber" placeholder="e.g., 123456" value={formData.plateNumber} onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="code">Code</Label>
                        <Input id="code" placeholder="e.g., 2" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Select
                          value={formData.region}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}
                          required
                        >
                          <SelectTrigger id="region">
                            <SelectValue placeholder="Select region..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AA">Addis Ababa (AA)</SelectItem>
                            <SelectItem value="OR">Oromia (OR)</SelectItem>
                            <SelectItem value="AM">Amhara (AM)</SelectItem>
                            <SelectItem value="SD">Sidama (SD)</SelectItem>
                            <SelectItem value="HR">Harari (HR)</SelectItem>
                            <SelectItem value="TR">Tigray (TR)</SelectItem>
                            <SelectItem value="SN">SNNPR (SN)</SelectItem>
                            <SelectItem value="DR">Dire Dawa (DR)</SelectItem>
                            <SelectItem value="BG">Benishangul (BG)</SelectItem>
                            <SelectItem value="GG">Gambela (GG)</SelectItem>
                            <SelectItem value="AF">Afar (AF)</SelectItem>
                            <SelectItem value="SM">Somali (SM)</SelectItem>
                            <SelectItem value="SP">South West (SP)</SelectItem>
                            <SelectItem value="ET">Ethiopia (ET)</SelectItem>
                            <SelectItem value="AU">Africa Union (AU)</SelectItem>
                            <SelectItem value="UN">United Nation (UN)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_subcategory">Subcategory</Label>
                        <Select
                          value={formData.subcategory}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value as any }))}
                        >
                          <SelectTrigger id="vehicle_subcategory">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="missing">Stolen / Missing</SelectItem>
                            <SelectItem value="criminal">Wanted for Crime</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_location">Last Known Location</Label>
                        <Input id="vehicle_location" placeholder="e.g., Bole Road" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description</Label>
                  <Textarea id="description" placeholder="Provide detailed description including physical characteristics, clothing, distinguishing features..." rows={4} value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} required />
                </div>

                <div className="flex flex-row items-center gap-3 p-4 border border-border rounded-lg bg-card/50 hover:bg-card transition-colors">
                  <Checkbox
                    id="eligibleForAssignment"
                    checked={formData.eligibleForAssignment}
                    onCheckedChange={(checked) => {
                      const isChecked = !!checked;
                      setFormData(prev => ({ ...prev, eligibleForAssignment: isChecked }));
                    }}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="eligibleForAssignment" className="text-sm font-semibold cursor-pointer">Eligible for External Assignment</Label>
                    <p className="text-xs text-muted-foreground">
                      If checked, this detection will be automatically assigned to the nearest available security company. Otherwise, it will remain internal.
                    </p>
                  </div>
                </div>

                {/* Dynamic Form Template Fields */}
                {activeTemplate && activeTemplate.fields && activeTemplate.fields.length > 0 && (
                  <div className="space-y-4 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <Label className="text-sm font-semibold text-primary">{activeTemplate.name}</Label>
                      <span className="text-xs text-muted-foreground">— Additional fields</span>
                    </div>
                    {activeTemplate.fields.map((field: any) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label htmlFor={`dyn-${field.id}`} className="text-sm">
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            id={`dyn-${field.id}`}
                            placeholder={field.placeholder}
                            value={dynamicFormData[field.id] || ""}
                            onChange={(e) => setDynamicFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                            rows={3}
                            required={field.required}
                          />
                        ) : field.type === "select" ? (
                          <Select
                            value={dynamicFormData[field.id] || ""}
                            onValueChange={(val) => setDynamicFormData(prev => ({ ...prev, [field.id]: val }))}
                          >
                            <SelectTrigger id={`dyn-${field.id}`}>
                              <SelectValue placeholder={field.placeholder || `Select ${field.label}...`} />
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options || []).map((opt: string) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={`dyn-${field.id}`}
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            placeholder={field.placeholder}
                            value={dynamicFormData[field.id] || ""}
                            onChange={(e) => setDynamicFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                            required={field.required}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {selectedCategory !== "vehicle" && (
                  <div className="space-y-2">
                    <Label>Reference Images (Multiple Selection Possible)</Label>
                    {imagePreviews.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 border-2 border-primary/20 rounded-lg">
                        {imagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative group aspect-square border-2 border-primary/30 rounded-md overflow-hidden bg-muted">
                            <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                              className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white p-1 truncate text-center">
                              {imageFiles[idx]?.name || "Image"}
                            </p>
                          </div>
                        ))}
                        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-primary/30 rounded-md cursor-pointer hover:bg-primary/5 transition-colors">
                          <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                          <Upload className="w-6 h-6 text-primary/60" />
                          <span className="text-[10px] font-medium mt-1">Add More</span>
                        </label>
                      </div>
                    ) : (
                      <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <input type="file" multiple accept="image/png,image/jpeg,image/jpg" onChange={handleImageChange} className="hidden" />
                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Select multiple images or drag to upload</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG up to 10MB each</p>
                      </label>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={createDetection.isPending}>
                  <Search className="w-4 h-4 mr-2" />{createDetection.isPending ? "Submitting..." : "Submit Detection Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Active Detections List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" />Active Detection Requests</CardTitle>
            <CardDescription>Monitor status of submitted detection requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="monitoring">Active</TabsTrigger>
                <TabsTrigger value="detected">Alerts</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-3">
                {detections.map((detection) => <DetectionCard key={detection.id} detection={detection} onClick={() => handleCardClick(detection)} />)}
              </TabsContent>
              <TabsContent value="monitoring" className="space-y-3">
                {detections.filter(d => d.status === "monitoring" || d.status === "pending").map((detection) => <DetectionCard key={detection.id} detection={detection} onClick={() => handleCardClick(detection)} />)}
              </TabsContent>
              <TabsContent value="detected" className="space-y-3">
                {detections.filter(d => d.status === "detected").map((detection) => <DetectionCard key={detection.id} detection={detection} onClick={() => handleCardClick(detection)} />)}
              </TabsContent>
              <TabsContent value="history" className="space-y-3">
                {detections.filter(d => d.status === "resolved" || d.status === "failed").map((detection) => <DetectionCard key={detection.id} detection={detection} onClick={() => handleCardClick(detection)} />)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2">
                {selectedDetection && categoryIcons[selectedDetection.category] && (
                  <div className={`p-2 rounded-lg ${selectedDetection.status === "detected" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}>
                    {React.createElement(categoryIcons[selectedDetection.category], { className: "w-5 h-5" })}
                  </div>
                )}
                {isEditing ? `Editing: ${selectedDetection?.name}` : "Detection Details"}
              </DialogTitle>
              {!isEditing && detectionsFeature === "full" && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleEditClick} className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => selectedDetection && handleDelete(selectedDetection.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription>
              {isEditing ? "Update the information for this detection request." : "Detailed information about the submitted detection request."}
            </DialogDescription>
          </DialogHeader>

          {selectedDetection && (
            <div className="space-y-6 py-4">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name / Description</Label>
                    <Input id="edit-name" value={editFormData.name} onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Status</Label>
                      <Select value={editFormData.status} onValueChange={(val) => setEditFormData(prev => ({ ...prev, status: val }))}>
                        <SelectTrigger id="edit-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="monitoring">Monitoring</SelectItem>
                          <SelectItem value="detected">Detected</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedDetection.category === "person" && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-subcategory">Subcategory</Label>
                        <Select value={editFormData.subcategory} onValueChange={(val) => setEditFormData(prev => ({ ...prev, subcategory: val as any }))}>
                          <SelectTrigger id="edit-subcategory">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="missing">Missing Person</SelectItem>
                            <SelectItem value="criminal">Criminal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {selectedDetection.category === "person" && editFormData.subcategory === "criminal" && (
                    <div className="space-y-2 p-3 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                      <Label htmlFor="edit-crimeType" className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                        <Gavel className="w-4 h-4" /> Crime Type
                      </Label>
                      <Select value={editFormData.crimeType} onValueChange={(val) => setEditFormData(prev => ({ ...prev, crimeType: val }))}>
                        <SelectTrigger id="edit-crimeType" className="border-amber-500/30">
                          <SelectValue placeholder="Select crime type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CRIME_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}



                  {selectedDetection.category === "vehicle" && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-plateNumber">Plate Number</Label>
                          <Input id="edit-plateNumber" value={editFormData.plateNumber} onChange={(e) => setEditFormData(prev => ({ ...prev, plateNumber: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-code">Code</Label>
                          <Input id="edit-code" value={editFormData.code} onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-region">Region</Label>
                          <Input id="edit-region" value={editFormData.region} onChange={(e) => setEditFormData(prev => ({ ...prev, region: e.target.value }))} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-vehicle_subcategory">Subcategory</Label>
                          <Select value={editFormData.subcategory} onValueChange={(val) => setEditFormData(prev => ({ ...prev, subcategory: val as any }))}>
                            <SelectTrigger id="edit-vehicle_subcategory">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="missing">Stolen / Missing</SelectItem>
                              <SelectItem value="criminal">Wanted for Crime</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-vehicle_location">Location</Label>
                          <Input id="edit-vehicle_location" value={editFormData.location} onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))} />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Detailed Description</Label>
                    <Textarea id="edit-description" rows={4} value={editFormData.description} onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))} />
                  </div>

                  <div className="flex flex-row items-center gap-3 p-4 border border-border rounded-lg bg-card/50">
                    <Checkbox
                      id="edit-eligibleForAssignment"
                      checked={editFormData.eligibleForAssignment}
                      onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, eligibleForAssignment: !!checked }))}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="edit-eligibleForAssignment" className="text-sm font-semibold cursor-pointer">Eligible for External Assignment</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow external security companies to handle this detection.
                      </p>
                    </div>
                  </div>

                  {selectedDetection.category !== "vehicle" && (
                    <div className="space-y-2">
                      <Label>Update / Add Reference Images</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative aspect-square border-2 border-primary/20 rounded-md overflow-hidden bg-muted">
                            <img src={preview} alt={`Edit Preview ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive text-white"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50">
                          <input type="file" multiple onChange={handleImageChange} className="hidden" />
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1" onClick={handleUpdate} disabled={updateDetection.isPending}>
                      <Save className="w-4 h-4 mr-2" /> {updateDetection.isPending ? "Updating..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Name / Description</p>
                      <p className="text-base font-semibold">{selectedDetection.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors[selectedDetection.status]}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(selectedDetection.status)}
                            <span className="capitalize">{selectedDetection.status.replace("_", " ")}</span>
                          </span>
                        </Badge>
                        {detectionsFeature === "full" && (
                          <div className="flex items-center gap-1 border-l pl-2 ml-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" title="Change Status">
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(selectedDetection.id, "in_progress")}
                                  className="flex items-center gap-2 cursor-pointer text-blue-600"
                                >
                                  <PlayCircle className="w-4 h-4" />
                                  <span>In Progress</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(selectedDetection.id, "resolved")}
                                  className="flex items-center gap-2 cursor-pointer text-green-600"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Resolved</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(selectedDetection.id, "failed")}
                                  className="flex items-center gap-2 cursor-pointer text-red-600"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Failed</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(selectedDetection.id, "monitoring")}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>Monitoring</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <p className="text-base capitalize">{selectedDetection.category}</p>
                    </div>
                    {selectedDetection.subcategory && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Subcategory</p>
                        <Badge variant="secondary" className="capitalize">
                          {getSubcategoryLabel(selectedDetection.category, selectedDetection.subcategory)}
                        </Badge>
                      </div>
                    )}
                    {selectedDetection.crimeType && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                          <Gavel className="w-3.5 h-3.5 text-amber-500" /> Crime Type
                        </p>
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25">
                          {selectedDetection.crimeType}
                        </Badge>
                      </div>
                    )}
                    {selectedDetection.category === "person" && selectedDetection.age && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Approx. Age</p>
                        <p className="text-base">{selectedDetection.age}</p>
                      </div>
                    )}
                    {selectedDetection.category === "vehicle" && selectedDetection.plateNumber && (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Plate Number</p>
                          <p className="text-base font-semibold text-blue-600">{selectedDetection.plateNumber}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Code</p>
                          <Badge variant="outline" className="font-mono text-base">{selectedDetection.code}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Region</p>
                          <p className="text-base">{selectedDetection.region}</p>
                        </div>
                      </>
                    )}
                    {selectedDetection.location && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Last Known Location</p>
                        <p className="text-base">{selectedDetection.location}</p>
                      </div>
                    )}
                  </div>

                  {selectedDetection.handlingStatus && selectedDetection.handlingStatus !== 'unassigned' && (
                    <div className="space-y-3 p-4 border border-blue-500/20 bg-blue-500/5 rounded-lg mt-4">
                      <p className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Assignment & Resolution Details
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5 col-span-2">
                          <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
                          {(selectedDetection as any).assignmentType === 'user' ? (
                            (selectedDetection as any).assignedOfficers && (selectedDetection as any).assignedOfficers.length > 0 ? (
                              <div className="space-y-2 mt-1">
                                {(selectedDetection as any).assignedOfficers.map((officer: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-blue-50 border border-blue-200">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-semibold text-blue-900">{officer.officerName}</span>
                                      <span className="text-xs text-muted-foreground">{officer.officerEmail}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {officer.distanceKm != null && (
                                        <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-700 bg-blue-50">
                                          📍 {officer.distanceKm} km
                                        </Badge>
                                      )}
                                      <Badge
                                        variant={officer.status === 'closed_resolved' ? 'default' : officer.status === 'assigned' ? 'secondary' : officer.status === 'closed_failed' ? 'destructive' : 'outline'}
                                        className="text-[10px] capitalize"
                                      >
                                        {officer.status}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm font-semibold text-yellow-600">Pending Officer Match (Geo-dispatching...)</p>
                            )
                          ) : (
                            <p className="text-sm font-semibold text-blue-800">{selectedDetection.assignedCompanyName || "Local Response Team"}</p>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-muted-foreground">Handling Status</p>
                          <Badge variant={selectedDetection.handlingStatus === 'resolved' ? 'default' : selectedDetection.handlingStatus === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
                            {selectedDetection.handlingStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        {selectedDetection.handlingNotes && (
                          <div className="space-y-0.5 col-span-2">
                            <p className="text-xs font-medium text-muted-foreground">Handling Notes</p>
                            <p className="text-sm">{selectedDetection.handlingNotes}</p>
                          </div>
                        )}
                      </div>
                      {selectedDetection.handlingProofUrls && selectedDetection.handlingProofUrls.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Proof Images</p>
                          <div className="flex gap-2">
                            {selectedDetection.handlingProofUrls.map((url, idx) => (
                              <div
                                key={idx}
                                className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center w-16 h-16 cursor-pointer"
                                onClick={() => setExpandedImage(getMediaUrl(url))}
                              >
                                <img src={getMediaUrl(url)} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover transition-transform hover:scale-110" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Detailed Description</p>
                    <div className="p-3 bg-muted/50 rounded-lg text-sm border">
                      {selectedDetection.description}
                    </div>
                  </div>

                  {/* ── NATIONAL ID MATCH PANEL (Person detections) ── */}
                  {selectedDetection.category === "person" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <CreditCard className="w-4 h-4" />
                          National ID Database Match
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={autoMatchNationalId.isPending || nationalIdLoading}
                          onClick={() => autoMatchNationalId.mutate(selectedDetection.id)}
                        >
                          <RefreshCw className={`w-3 h-3 ${autoMatchNationalId.isPending ? "animate-spin" : ""}`} />
                          {autoMatchNationalId.isPending ? "Searching..." : "Re-Search"}
                        </Button>
                      </div>

                      {nationalIdLoading ? (
                        <div className="p-4 rounded-lg border bg-muted/30 animate-pulse text-sm text-muted-foreground text-center">Searching National ID database...</div>
                      ) : nationalIdMatches.length > 0 ? (
                        <div className="space-y-3">
                          {nationalIdMatches.map((match) => {
                            const p = match.national_id_profile;
                            if (!p) return null;
                            return (
                              <div key={match.id} className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {p.profile_photo_url ? (
                                      <img src={getMediaUrl(p.profile_photo_url)} alt={p.full_name} className="w-12 h-12 rounded-full object-cover border-2 border-blue-400" />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <User className="w-6 h-6 text-blue-500" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-bold text-sm">{p.full_name}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{p.national_id_number}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge className={`text-xs ${match.confidence_score === "High" ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" :
                                      match.confidence_score === "Medium" ? "bg-amber-500/15 text-amber-700 border-amber-500/30" :
                                        "bg-muted text-muted-foreground"
                                      }`}>{match.confidence_score} Match</Badge>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                      onClick={() => setFullInfoPerson(p)}
                                    >
                                      <Eye className="w-3 h-3" /> See Full Info
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {p.date_of_birth && <div><span className="text-muted-foreground">DOB: </span><span>{p.date_of_birth}</span></div>}
                                  {p.gender && <div><span className="text-muted-foreground">Gender: </span><span className="capitalize">{p.gender}</span></div>}
                                  {p.phone_number && (
                                    <div className="flex items-center gap-1 col-span-2">
                                      <Phone className="w-3 h-3 text-muted-foreground" />
                                      <span>{p.phone_number}</span>
                                    </div>
                                  )}
                                  {p.address && (
                                    <div className="flex items-center gap-1 col-span-2">
                                      <MapPin className="w-3 h-3 text-muted-foreground" />
                                      <span>{p.address}</span>
                                    </div>
                                  )}
                                  {p.occupation && <div><span className="text-muted-foreground">Occupation: </span><span>{p.occupation}</span></div>}
                                  {p.status && (
                                    <div>
                                      <span className="text-muted-foreground">ID Status: </span>
                                      <span className={`font-semibold ${p.status === "active" ? "text-green-600" : "text-destructive"
                                        } capitalize`}>{p.status}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
                          <User className="w-8 h-8 mx-auto text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No National ID match found yet.</p>
                          <p className="text-xs text-muted-foreground/60">Click "Re-Search" to query the database.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── VEHICLE REGISTRATION MATCH PANEL (Vehicle detections) ── */}
                  {selectedDetection.category === "vehicle" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <Car className="w-4 h-4" />
                          Vehicle Registration Lookup
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={autoMatchVehicle.isPending || vehicleMatchLoading || plateLoading}
                          onClick={() => autoMatchVehicle.mutate(selectedDetection.id)}
                        >
                          <RefreshCw className={`w-3 h-3 ${autoMatchVehicle.isPending ? "animate-spin" : ""}`} />
                          {autoMatchVehicle.isPending ? "Searching..." : "Re-Search"}
                        </Button>
                      </div>

                      {(vehicleMatchLoading || plateLoading) ? (
                        <div className="p-4 rounded-lg border bg-muted/30 animate-pulse text-sm text-muted-foreground text-center">Searching vehicle registration database...</div>
                      ) : vehicleByPlate ? (
                        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Car className="w-6 h-6 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">{vehicleByPlate.vehicle_make} {vehicleByPlate.vehicle_model}</p>
                                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 tracking-widest">{vehicleByPlate.plate_number}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {vehicleByPlate.is_stolen && (
                                <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1">
                                  <ShieldAlert className="w-3 h-3" /> STOLEN
                                </Badge>
                              )}
                              {vehicleByPlate.is_wanted && (
                                <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px] gap-1">
                                  <ShieldAlert className="w-3 h-3" /> WANTED
                                </Badge>
                              )}
                              {!vehicleByPlate.is_stolen && !vehicleByPlate.is_wanted && (
                                <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-[10px] gap-1">
                                  <ShieldCheck className="w-3 h-3" /> CLEAR
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-emerald-500/20 pt-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Owner Information</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {vehicleByPlate.owner_name && (
                                <div className="col-span-2 flex items-center gap-1">
                                  <User className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-semibold">{vehicleByPlate.owner_name}</span>
                                </div>
                              )}
                              {vehicleByPlate.owner_national_id && (
                                <div className="flex items-center gap-1">
                                  <CreditCard className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-mono">{vehicleByPlate.owner_national_id}</span>
                                </div>
                              )}
                              {vehicleByPlate.owner_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  <span>{vehicleByPlate.owner_phone}</span>
                                </div>
                              )}
                              {vehicleByPlate.owner_address && (
                                <div className="flex items-center gap-1 col-span-2">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span>{vehicleByPlate.owner_address}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-emerald-500/20 pt-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Vehicle Details</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-muted-foreground">Year: </span>{vehicleByPlate.vehicle_year}</div>
                              <div><span className="text-muted-foreground">Color: </span>{vehicleByPlate.vehicle_color}</div>
                              <div><span className="text-muted-foreground">Type: </span>{vehicleByPlate.vehicle_type}</div>
                              <div><span className="text-muted-foreground">Fuel: </span>{vehicleByPlate.fuel_type}</div>
                              {vehicleByPlate.vin_number && (
                                <div className="col-span-2 flex items-center gap-1">
                                  <Hash className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-mono text-[10px]">VIN: {vehicleByPlate.vin_number}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Reg. Status: </span>
                                <span className={`font-semibold capitalize ${vehicleByPlate.registration_status === "active" ? "text-green-600" : "text-destructive"
                                  }`}>{vehicleByPlate.registration_status}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fines: </span>
                                <span className={vehicleByPlate.outstanding_fines !== "0" ? "text-destructive font-bold" : "text-green-600"}>
                                  ETB {vehicleByPlate.outstanding_fines}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* See Full Info button for Vehicle */}
                          <div className="border-t border-emerald-500/20 pt-3">
                            <Button
                              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => setFullInfoVehicle(vehicleByPlate)}
                            >
                              <Eye className="w-4 h-4" /> See Full Vehicle Info
                            </Button>
                          </div>
                        </div>
                      ) : vehicleMatches.length > 0 ? (
                        <div className="space-y-2">
                          {vehicleMatches.map((match: any) => (
                            <div key={match.id} className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs">
                              <p className="font-semibold">{match.vehicle_registration?.plate_number} — {match.vehicle_registration?.owner_name}</p>
                              <p className="text-muted-foreground">{match.confidence_score} confidence</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
                          <Car className="w-8 h-8 mx-auto text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No vehicle registration found for plate <span className="font-mono font-bold">{selectedDetection.plateNumber}</span>.</p>
                          <p className="text-xs text-muted-foreground/60">Make sure the plate is registered in the Vehicle Registration database.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolved Dynamic Form Data */}
                  {selectedDetection.resolvedDynamicData && selectedDetection.resolvedDynamicData.length > 0 && (
                    <div className="space-y-3 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                      <p className="text-sm font-semibold text-primary flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Additional Information
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedDetection.resolvedDynamicData.map((item, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                            <p className="text-sm">{String(item.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Movement Tracking Map */}
                  {selectedDetection.detectionEvents && selectedDetection.detectionEvents.length > 0 && selectedDetection.detectionEvents.some(e => e.lat && e.lng) && (
                    <Suspense fallback={<div className="h-[280px] w-full bg-muted animate-pulse rounded-xl" />}>
                      <DetectionMovementMap events={selectedDetection.detectionEvents} />
                    </Suspense>
                  )}

                  {selectedDetection.detectionEvents && selectedDetection.detectionEvents.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" /> Detection History
                      </p>
                      <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                        {selectedDetection.detectionEvents.map((event, idx) => (
                          <div key={event.id || idx} className="relative pl-10">
                            <div className="absolute left-0 top-1 w-[35px] h-[35px] rounded-full border-4 border-background bg-primary/20 flex items-center justify-center z-10">
                              <Eye className="w-4 h-4 text-primary" />
                            </div>
                            <div className="bg-muted/30 rounded-lg p-4 border space-y-3">
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <p className="font-semibold text-sm">{event.cameraName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(event.timestamp).toLocaleString()}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase">Proof Available</Badge>
                              </div>
                              {(event.snapshotUrls && event.snapshotUrls.length > 0) ? (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {event.snapshotUrls.map((url: string, imgIdx: number) => (
                                    <div
                                      key={imgIdx}
                                      className="rounded-md overflow-hidden border bg-black/5 w-24 h-24 flex-shrink-0 flex items-center justify-center cursor-pointer"
                                      onClick={() => setExpandedImage(getMediaUrl(url))}
                                    >
                                      <img
                                        src={getMediaUrl(url)}
                                        alt={`Detection ${imgIdx + 1} at ${event.cameraName}`}
                                        className="w-full h-full object-cover transition-transform hover:scale-105"
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : event.snapshotUrl ? (
                                <div
                                  className="rounded-md overflow-hidden border bg-black/5 w-32 h-32 flex items-center justify-center cursor-pointer"
                                  onClick={() => setExpandedImage(getMediaUrl(event.snapshotUrl))}
                                >
                                  <img
                                    src={getMediaUrl(event.snapshotUrl)}
                                    alt={`Detection at ${event.cameraName}`}
                                    className="w-full h-full object-cover transition-transform hover:scale-105"
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {((selectedDetection.imageUrls && selectedDetection.imageUrls.length > 0) || selectedDetection.id === "det-001" || selectedDetection.id === "det-004") && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Reference Images ({selectedDetection.imageUrls?.length || 1})</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {(selectedDetection.imageUrls && selectedDetection.imageUrls.length > 0) ? (
                          selectedDetection.imageUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center p-1 w-24 h-24 cursor-pointer"
                              onClick={() => setExpandedImage(getMediaUrl(url))}
                            >
                              <img
                                src={getMediaUrl(url)}
                                alt={`Reference ${idx + 1}`}
                                className="w-full h-full object-cover rounded-md shadow-sm transition-transform hover:scale-105"
                              />
                            </div>
                          ))
                        ) : (
                          <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center p-4 sm:col-span-2">
                            <img
                              src={`https://images.unsplash.com/photo-${selectedDetection.category === "person" ? "1507003211169-0a1dd7228f2d" : "1533473359331-0135ef1b58bf"}?auto=format&fit=crop&q=80&w=800`}
                              alt="Reference"
                              className="max-h-80 object-contain rounded-md shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t text-xs text-muted-foreground flex justify-between">
                    <span>Created: {new Date(selectedDetection.createdAt).toLocaleString()}</span>
                    <span>Last Updated: {new Date(selectedDetection.updatedAt).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!expandedImage} onOpenChange={(open) => !open && setExpandedImage(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex justify-center items-center [&>button]:text-white [&>button]:bg-black/50 [&>button]:p-2 [&>button]:rounded-full hover:[&>button]:bg-black/70">
          <img src={expandedImage || ""} alt="Expanded view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </DialogContent>
      </Dialog>

      {/* ──────────────── FULL PERSON INFO MODAL ──────────────── */}
      <Dialog open={!!fullInfoPerson} onOpenChange={(o) => !o && setFullInfoPerson(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <CreditCard className="w-5 h-5" /> National ID — Full Profile
            </DialogTitle>
            <DialogDescription>Complete information from the National ID database</DialogDescription>
          </DialogHeader>
          {fullInfoPerson && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                {fullInfoPerson.profile_photo_url ? (
                  <img src={getMediaUrl(fullInfoPerson.profile_photo_url)} alt={fullInfoPerson.full_name} className="w-20 h-20 rounded-full object-cover border-4 border-blue-400 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border-4 border-blue-300">
                    <User className="w-10 h-10 text-blue-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{fullInfoPerson.full_name}</h3>
                  <p className="text-sm font-mono text-blue-600">{fullInfoPerson.national_id_number}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge className={fullInfoPerson.status === "active" ? "bg-green-500/15 text-green-700 border-green-500/30" : "bg-destructive/15 text-destructive"}>
                      {fullInfoPerson.status}
                    </Badge>
                    {fullInfoPerson.is_verified && <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30">✓ Verified</Badge>}
                    {fullInfoPerson.nationality && <Badge variant="outline">{fullInfoPerson.nationality}</Badge>}
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Personal Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[{ label: "First Name", val: fullInfoPerson.first_name }, { label: "Middle Name", val: fullInfoPerson.middle_name }, { label: "Last Name", val: fullInfoPerson.last_name }, { label: "Gender", val: fullInfoPerson.gender }, { label: "Date of Birth", val: fullInfoPerson.date_of_birth }, { label: "Occupation", val: fullInfoPerson.occupation }].map(({ label, val }) => val ? (
                    <div key={label} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium capitalize">{val}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Contact & Address */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Contact & Address</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {fullInfoPerson.phone_number && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{fullInfoPerson.phone_number}</span>
                    </div>
                  )}
                  {fullInfoPerson.email && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground text-xs w-4">@</span>
                      <span>{fullInfoPerson.email}</span>
                    </div>
                  )}
                  {fullInfoPerson.address && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{fullInfoPerson.address}{fullInfoPerson.city ? `, ${fullInfoPerson.city}` : ""}{fullInfoPerson.region ? `, ${fullInfoPerson.region}` : ""}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Details */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">ID Registration Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[{ label: "Issuing Authority", val: fullInfoPerson.issuing_authority }, { label: "Registration Date", val: fullInfoPerson.registration_date }, { label: "Expiry Date", val: fullInfoPerson.expiry_date }, { label: "Verification Date", val: fullInfoPerson.verification_date }].map(({ label, val }) => val ? (
                    <div key={label} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{val}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Emergency Contact */}
              {(fullInfoPerson.emergency_contact_name || fullInfoPerson.emergency_contact_phone) && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Emergency Contact</p>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm space-y-1">
                    {fullInfoPerson.emergency_contact_name && <p className="font-semibold">{fullInfoPerson.emergency_contact_name} {fullInfoPerson.emergency_contact_relationship ? `(${fullInfoPerson.emergency_contact_relationship})` : ""}</p>}
                    {fullInfoPerson.emergency_contact_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3 h-3" />{fullInfoPerson.emergency_contact_phone}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ──────────────── FULL VEHICLE INFO MODAL ──────────────── */}
      <Dialog open={!!fullInfoVehicle} onOpenChange={(o) => !o && setFullInfoVehicle(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Car className="w-5 h-5" /> Vehicle Registration — Full Record
            </DialogTitle>
            <DialogDescription>Complete vehicle & owner details from the registration database</DialogDescription>
          </DialogHeader>
          {fullInfoVehicle && (
            <div className="space-y-6">
              {/* Header */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border-4 border-emerald-300">
                  <Car className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{fullInfoVehicle.vehicle_make} {fullInfoVehicle.vehicle_model}</h3>
                  <p className="text-lg font-mono text-emerald-600 tracking-[0.2em]">{fullInfoVehicle.plate_number}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {fullInfoVehicle.is_stolen && <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><ShieldAlert className="w-3 h-3" /> STOLEN</Badge>}
                    {fullInfoVehicle.is_wanted && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1"><ShieldAlert className="w-3 h-3" /> WANTED</Badge>}
                    {fullInfoVehicle.has_violations && <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30">Has Violations</Badge>}
                    {!fullInfoVehicle.is_stolen && !fullInfoVehicle.is_wanted && <Badge className="bg-green-500/15 text-green-700 border-green-500/30 gap-1"><ShieldCheck className="w-3 h-3" /> CLEAR</Badge>}
                  </div>
                </div>
              </div>

              {/* Vehicle Specs */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Vehicle Specifications</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[{ label: "Year", val: fullInfoVehicle.vehicle_year }, { label: "Color", val: fullInfoVehicle.vehicle_color }, { label: "Type", val: fullInfoVehicle.vehicle_type }, { label: "Fuel", val: fullInfoVehicle.fuel_type }, { label: "Transmission", val: fullInfoVehicle.transmission_type }, { label: "Engine Capacity", val: fullInfoVehicle.engine_capacity }, { label: "Seating Capacity", val: fullInfoVehicle.seating_capacity }].map(({ label, val }) => val ? (
                    <div key={label} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium capitalize">{String(val)}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Technical IDs */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Technical Identifiers</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {fullInfoVehicle.vin_number && <div className="flex gap-2 p-2 rounded-lg bg-muted/30"><Hash className="w-4 h-4 text-muted-foreground shrink-0" /><span className="font-mono text-xs">VIN: {fullInfoVehicle.vin_number}</span></div>}
                  {fullInfoVehicle.engine_number && <div className="flex gap-2 p-2 rounded-lg bg-muted/30"><Hash className="w-4 h-4 text-muted-foreground shrink-0" /><span className="font-mono text-xs">Engine: {fullInfoVehicle.engine_number}</span></div>}
                  {fullInfoVehicle.chassis_number && <div className="flex gap-2 p-2 rounded-lg bg-muted/30"><Hash className="w-4 h-4 text-muted-foreground shrink-0" /><span className="font-mono text-xs">Chassis: {fullInfoVehicle.chassis_number}</span></div>}
                </div>
              </div>

              {/* Owner */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Owner Information</p>
                <div className="p-3 rounded-xl bg-muted/20 border space-y-2 text-sm">
                  {fullInfoVehicle.owner_name && <p className="font-bold text-base">{fullInfoVehicle.owner_name}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    {fullInfoVehicle.owner_national_id && <div className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-muted-foreground" /><span className="font-mono text-xs">{fullInfoVehicle.owner_national_id}</span></div>}
                    {fullInfoVehicle.owner_phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" /><span>{fullInfoVehicle.owner_phone}</span></div>}
                    {fullInfoVehicle.owner_email && <div className="flex items-center gap-1 col-span-2"><span className="text-muted-foreground text-xs">@</span><span>{fullInfoVehicle.owner_email}</span></div>}
                    {fullInfoVehicle.owner_address && <div className="flex items-center gap-1 col-span-2"><MapPin className="w-3 h-3 text-muted-foreground" /><span>{fullInfoVehicle.owner_address}</span></div>}
                  </div>
                </div>
              </div>

              {/* Registration & Insurance */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Registration & Insurance</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[{ label: "Region Code", val: fullInfoVehicle.region_code }, { label: "Issuing Authority", val: fullInfoVehicle.issuing_authority }, { label: "Reg. Date", val: fullInfoVehicle.registration_date }, { label: "Expiry Date", val: fullInfoVehicle.expiry_date }, { label: "Insurance Company", val: fullInfoVehicle.insurance_company }, { label: "Policy Number", val: fullInfoVehicle.insurance_policy_number }, { label: "Insurance Expiry", val: fullInfoVehicle.insurance_expiry_date }, { label: "Insurance Status", val: fullInfoVehicle.insurance_status }].map(({ label, val }) => val ? (
                    <div key={label} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium capitalize">{val}</p>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Fines & Violations */}
              {(fullInfoVehicle.outstanding_fines !== "0" || fullInfoVehicle.violation_count > 0) && (
                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1">
                  <p className="text-xs font-bold uppercase text-destructive">Fines & Violations</p>
                  <p className="text-sm">Outstanding Fines: <span className="font-bold text-destructive">ETB {fullInfoVehicle.outstanding_fines}</span></p>
                  {fullInfoVehicle.violation_count > 0 && <p className="text-sm">Violations on Record: <span className="font-bold">{fullInfoVehicle.violation_count}</span></p>}
                  {fullInfoVehicle.notes && <p className="text-xs text-muted-foreground mt-1">{fullInfoVehicle.notes}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function DetectionCard({ detection, onClick }: { detection: DetectionRequest, onClick?: () => void }) {
  const category = (detection.category || "unknown").toLowerCase();
  const Icon = categoryIcons[category as keyof typeof categoryIcons] || AlertCircle;
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all duration-200 hover:border-primary/50 cursor-pointer hover:shadow-md ${detection.status === "detected" ? "border-destructive/30 bg-destructive/5" :
        detection.status === "resolved" ? "border-green-500/30 bg-green-500/5" :
          detection.status === "failed" ? "border-destructive/30 bg-destructive/5" :
            "border-border bg-card/50"
        }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${detection.status === "detected" ? "bg-destructive/20" :
          detection.status === "in_progress" ? "bg-blue-500/20" :
            detection.status === "resolved" ? "bg-green-500/20" :
              detection.status === "failed" ? "bg-destructive/20" :
                "bg-muted"
          }`}>
          <Icon className={`w-5 h-5 ${detection.status === "detected" ? "text-destructive" :
            detection.status === "in_progress" ? "text-blue-600" :
              detection.status === "resolved" ? "text-green-600" :
                detection.status === "failed" ? "text-destructive" :
                  "text-muted-foreground"
            }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{detection.name}</span>
            <Badge variant="outline" className={statusColors[detection.status]}>{detection.status}</Badge>
            {detection.subcategory && (
              <Badge variant="secondary" className="capitalize">{getSubcategoryLabel(detection.category, detection.subcategory)}</Badge>
            )}
            {detection.crimeType && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5">
                <Gavel className="w-3 h-3 mr-0.5" />{detection.crimeType}
              </Badge>
            )}
            {detection.detectedCameraIds && detection.detectedCameraIds.length > 0 && (
              <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />{detection.detectedCameraIds.length} camera(s)</Badge>
            )}
          </div>
          {(detection.age || detection.location) && (
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              {detection.age && <span>Age: {detection.age}</span>}
              {detection.location && <span>Location: {detection.location}</span>}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{detection.description}</p>
          <p className="text-xs text-muted-foreground/60 mt-2">Updated: {new Date(detection.updatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
