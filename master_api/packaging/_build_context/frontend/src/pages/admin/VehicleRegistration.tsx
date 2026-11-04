import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Car,
    User,
    MapPin,
    Phone,
    Mail,
    FileText,
    ShieldCheck,
    ArrowRight,
    ArrowLeft,
    Save,
    Calendar,
    Hash,
    Settings,
    Activity,
    Upload,
    XCircle,
    CheckCircle2,
    Palette,
    Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS } from "@/api/config";
import { authStorage } from "@/lib/auth";

const REGIONS = [
    "Addis Ababa", "Oromia", "Amhara", "Tigray", "SNNP", "Somali",
    "Benishangul-Gumuz", "Gambela", "Harari", "Afar", "Dire Dawa"
];

const VEHICLE_TYPES = [
    "Sedan", "SUV", "Truck", "Motorcycle", "Bus", "Van", "Pickup", "Coupe", "Hatchback", "Other"
];

const FUEL_TYPES = [
    "Petrol", "Diesel", "Electric", "Hybrid", "LPG", "Other"
];

const TRANSMISSION_TYPES = [
    "Automatic", "Manual", "Semi-Automatic"
];

export default function VehicleRegistration() {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        plate_number: "",
        vehicle_make: "",
        vehicle_model: "",
        vehicle_year: new Date().getFullYear(),
        vehicle_color: "",
        vehicle_type: "Sedan",
        vin_number: "",
        engine_number: "",
        chassis_number: "",
        registration_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        registration_status: "active",
        region_code: "",
        issuing_authority: "Transport Bureau",
        owner_name: "",
        owner_national_id: "",
        owner_address: "",
        owner_phone: "",
        owner_email: "",
        insurance_company: "",
        insurance_policy_number: "",
        insurance_expiry_date: "",
        insurance_status: "active",
        engine_capacity: "",
        fuel_type: "Petrol",
        transmission_type: "Automatic",
        seating_capacity: 5,
        is_stolen: false,
        is_wanted: false,
        has_violations: false,
        violation_count: 0,
        outstanding_fines: "0",
        notes: "",
        is_verified: true,
        vehicle_photo_url: ""
    });

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
                // In a real app, you'd upload this file first
                // setFormData(prev => ({ ...prev, vehicle_photo_url: resultUrl }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdate = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 5));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = authStorage.getToken();
            const response = await fetch(API_ENDPOINTS.vehicleRegistration.registrations, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Registration failed");
            }

            toast({
                title: "Registration Successful",
                description: `Vehicle with plate ${formData.plate_number} has been registered to ${formData.owner_name}.`,
            });

            // Reset form
            setStep(1);
            setPhotoPreview(null);
            // Reset to defaults...
        } catch (error: any) {
            toast({
                title: "Registration Failed",
                description: error.message || "There was an error connecting to the Vehicle Registration service.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Vehicle Registration" subtitle="Register vehicles into the National Traffic Database">
            <div className="max-w-4xl mx-auto space-y-8 pb-12">

                {/* Progress Tracker */}
                <div className="flex items-center justify-between mb-8 px-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center flex-1 last:flex-none">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 border-2",
                                    step >= i ? "bg-primary text-primary-foreground border-primary shadow-lg scale-110" : "bg-background text-muted-foreground border-muted"
                                )}
                            >
                                {i}
                            </div>
                            {i < 5 && (
                                <div className={cn("h-0.5 flex-1 mx-2 rounded", step > i ? "bg-primary" : "bg-muted")} />
                            )}
                        </div>
                    ))}
                </div>

                <Card className="glass-card border-border/40 shadow-2xl overflow-hidden bg-card/30 backdrop-blur-md">
                    <CardHeader className="bg-primary/5 border-b border-border/50 p-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary animate-pulse-subtle">
                                {step === 1 && <Car className="w-6 h-6" />}
                                {step === 2 && <Settings className="w-6 h-6" />}
                                {step === 3 && <User className="w-6 h-6" />}
                                {step === 4 && <ShieldCheck className="w-6 h-6" />}
                                {step === 5 && <CheckCircle2 className="w-6 h-6" />}
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight">
                                    {step === 1 && "Basic Vehicle Details"}
                                    {step === 2 && "Technical Specifications"}
                                    {step === 3 && "Ownership Information"}
                                    {step === 4 && "Legal & Insurance"}
                                    {step === 5 && "Review & Confirm"}
                                </CardTitle>
                                <CardDescription className="text-base">
                                    {step === 1 && "Plate number, make, model and manufacturing year."}
                                    {step === 2 && "VIN, engine number, fuel type and transmission."}
                                    {step === 3 && "Legal owner details and contact information."}
                                    {step === 4 && "Insurance status and security flags (Stolen/Wanted)."}
                                    {step === 5 && "Review all information before finalizing registration."}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">

                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Hash className="w-4 h-4 text-primary" /> Plate Number
                                        </Label>
                                        <Input
                                            placeholder="e.g. AA 2-12345"
                                            className="text-lg font-mono tracking-widest uppercase bg-muted/20 border-primary/20 focus:border-primary h-12"
                                            value={formData.plate_number}
                                            onChange={(e) => handleUpdate("plate_number", e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-primary" /> Vehicle Color
                                        </Label>
                                        <Input
                                            placeholder="e.g. Metallic Silver"
                                            className="h-12"
                                            value={formData.vehicle_color}
                                            onChange={(e) => handleUpdate("vehicle_color", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Car className="w-4 h-4 text-primary" /> Make
                                        </Label>
                                        <Input
                                            placeholder="e.g. Toyota"
                                            className="h-12"
                                            value={formData.vehicle_make}
                                            onChange={(e) => handleUpdate("vehicle_make", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-primary" /> Model
                                        </Label>
                                        <Input
                                            placeholder="e.g. Corolla"
                                            className="h-12"
                                            value={formData.vehicle_model}
                                            onChange={(e) => handleUpdate("vehicle_model", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary" /> Manufacturing Year
                                        </Label>
                                        <Input
                                            type="number"
                                            className="h-12"
                                            value={formData.vehicle_year}
                                            onChange={(e) => handleUpdate("vehicle_year", parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-primary" /> Vehicle Type
                                        </Label>
                                        <Select value={formData.vehicle_type} onValueChange={(v) => handleUpdate("vehicle_type", v)}>
                                            <SelectTrigger className="h-12">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VEHICLE_TYPES.map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Technical Specs */}
                        {step === 2 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">VIN Number</Label>
                                        <Input
                                            placeholder="17-digit Chassis Number"
                                            className="font-mono h-12"
                                            value={formData.vin_number}
                                            onChange={(e) => handleUpdate("vin_number", e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Engine Number</Label>
                                        <Input
                                            placeholder="Engine ID"
                                            className="font-mono h-12"
                                            value={formData.engine_number}
                                            onChange={(e) => handleUpdate("engine_number", e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Transmission</Label>
                                        <Select value={formData.transmission_type} onValueChange={(v) => handleUpdate("transmission_type", v)}>
                                            <SelectTrigger className="h-12">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRANSMISSION_TYPES.map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Fuel Type</Label>
                                        <Select value={formData.fuel_type} onValueChange={(v) => handleUpdate("fuel_type", v)}>
                                            <SelectTrigger className="h-12">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FUEL_TYPES.map(t => (
                                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Engine Capacity (e.g. 2.5L)</Label>
                                        <Input
                                            placeholder="2.0L / 1600cc"
                                            className="h-12"
                                            value={formData.engine_capacity}
                                            onChange={(e) => handleUpdate("engine_capacity", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Seating Capacity</Label>
                                        <Input
                                            type="number"
                                            className="h-12"
                                            value={formData.seating_capacity}
                                            onChange={(e) => handleUpdate("seating_capacity", parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Owner Information */}
                        {step === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3 md:col-span-2">
                                        <Label className="text-sm font-semibold">Owner Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Legal name of the primary owner"
                                                className="pl-9 h-12"
                                                value={formData.owner_name}
                                                onChange={(e) => handleUpdate("owner_name", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">National ID / Passport</Label>
                                        <Input
                                            placeholder="ID Number"
                                            className="h-12"
                                            value={formData.owner_national_id}
                                            onChange={(e) => handleUpdate("owner_national_id", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="+251 ..."
                                                className="pl-9 h-12"
                                                value={formData.owner_phone}
                                                onChange={(e) => handleUpdate("owner_phone", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3 md:col-span-2">
                                        <Label className="text-sm font-semibold">Residential Address</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <Textarea
                                                placeholder="Enter full physical address..."
                                                className="pl-9 min-h-[100px] bg-muted/10"
                                                value={formData.owner_address}
                                                onChange={(e) => handleUpdate("owner_address", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Legal & Insurance */}
                        {step === 4 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Insurance Company</Label>
                                        <Input
                                            placeholder="Provider Name"
                                            className="h-12"
                                            value={formData.insurance_company}
                                            onChange={(e) => handleUpdate("insurance_company", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Policy Number</Label>
                                        <Input
                                            placeholder="Policy ID"
                                            className="h-12"
                                            value={formData.insurance_policy_number}
                                            onChange={(e) => handleUpdate("insurance_policy_number", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Insurance Expiry</Label>
                                        <Input
                                            type="date"
                                            className="h-12"
                                            value={formData.insurance_expiry_date}
                                            onChange={(e) => handleUpdate("insurance_expiry_date", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Registration Expiry</Label>
                                        <Input
                                            type="date"
                                            className="h-12 font-bold text-primary"
                                            value={formData.expiry_date}
                                            onChange={(e) => handleUpdate("expiry_date", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border/50">
                                    <h4 className="text-sm font-bold text-destructive uppercase mb-6 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" /> Security Flags & Enforcement
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-destructive/5 border border-destructive/20 transition-all hover:shadow-md">
                                            <div className="flex flex-col">
                                                <Label className="text-base font-bold text-destructive">Stolen Vehicle</Label>
                                                <span className="text-xs text-muted-foreground">Flags for immediate intercept</span>
                                            </div>
                                            <Switch
                                                checked={formData.is_stolen}
                                                onCheckedChange={(v) => handleUpdate("is_stolen", v)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 transition-all hover:shadow-md">
                                            <div className="flex flex-col">
                                                <Label className="text-base font-bold text-amber-600">Police Wanted</Label>
                                                <span className="text-xs text-muted-foreground">Flag for law enforcement interest</span>
                                            </div>
                                            <Switch
                                                checked={formData.is_wanted}
                                                onCheckedChange={(v) => handleUpdate("is_wanted", v)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Review */}
                        {step === 5 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 text-center space-y-4">
                                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary">
                                        <Car className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">{formData.vehicle_make} {formData.vehicle_model}</h3>
                                        <p className="text-primary font-mono text-xl tracking-[0.2em] mt-1">{formData.plate_number}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-5 rounded-2xl border border-border bg-muted/10 space-y-3">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                            <FileText className="w-3 h-3" /> Technical Summary
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                                            <span className="text-muted-foreground">Type:</span> <span>{formData.vehicle_type}</span>
                                            <span className="text-muted-foreground">VIN:</span> <span className="font-mono text-xs">{formData.vin_number || "N/A"}</span>
                                            <span className="text-muted-foreground">Engine:</span> <span className="font-mono text-xs">{formData.engine_number || "N/A"}</span>
                                            <span className="text-muted-foreground">Transmission:</span> <span>{formData.transmission_type}</span>
                                        </div>
                                    </div>
                                    <div className="p-5 rounded-2xl border border-border bg-muted/10 space-y-3">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                            <User className="w-3 h-3" /> Owner Summary
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                                            <span className="text-muted-foreground">Name:</span> <span className="font-bold">{formData.owner_name || "N/A"}</span>
                                            <span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{formData.owner_national_id || "N/A"}</span>
                                            <span className="text-muted-foreground">Phone:</span> <span>{formData.owner_phone || "N/A"}</span>
                                            <span className="text-muted-foreground">Status:</span> <span className="text-emerald-600 font-bold uppercase text-[10px]">Active</span>
                                        </div>
                                    </div>
                                </div>

                                {(formData.is_stolen || formData.is_wanted) && (
                                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 text-destructive animate-bounce-subtle">
                                        <ShieldCheck className="w-5 h-5" />
                                        <span className="font-bold">CRITICAL: Vehicle flagged for security intercept</span>
                                    </div>
                                )}
                            </div>
                        )}

                    </CardContent>
                    <div className="p-8 bg-muted/50 border-t border-border/50 flex justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={prevStep}
                            disabled={step === 1 || isSubmitting}
                            className="gap-2 px-6"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Button>

                        <div className="flex gap-4">
                            {step < 5 ? (
                                <Button onClick={nextStep} className="gap-2 px-8 py-6 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all shadow-primary/20">
                                    Next Phase <ArrowRight className="w-5 h-5" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !formData.plate_number || !formData.owner_name}
                                    className="gap-2 px-10 py-6 rounded-2xl bg-primary hover:bg-primary/90 text-lg shadow-xl shadow-primary/30"
                                >
                                    {isSubmitting ? (
                                        <>Processing Database...</>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" /> Finalize Registration
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
