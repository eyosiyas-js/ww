import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    IdCard,
    User,
    MapPin,
    Phone,
    Mail,
    Briefcase,
    ShieldCheck,
    ArrowRight,
    ArrowLeft,
    Save,
    UserPlus,
    HeartPulse,
    Upload,
    XCircle,
    CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS } from "@/api/config";
import { authStorage } from "@/lib/auth";
import { getCameras } from "@/api/services/cameraService";

const ETHIOPIAN_REGIONS = [
    "Addis Ababa", "Oromia", "Amhara", "Tigray", "SNNP", "Somali",
    "Benishangul-Gumuz", "Gambela", "Harari", "Afar", "Dire Dawa"
];

export default function NationalIdRegistration() {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cameras, setCameras] = useState<any[]>([]);

    useEffect(() => {
        getCameras().then(setCameras).catch(err => console.error("Failed to load cameras", err));
    }, []);

    const [formData, setFormData] = useState({
        national_id_number: "",
        full_name: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        gender: "Male",
        date_of_birth: "",
        nationality: "Ethiopian",
        address: "",
        region: "",
        city: "",
        phone_number: "",
        email: "",
        occupation: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        emergency_contact_relationship: "",
        is_verified: true,
        profile_photo_b64: "", // New field for biometric extraction
        additional_info: {
            authorized_cameras: [] as string[]
        }
    });

    const toggleCameraAuth = (cameraId: string) => {
        const authorized = formData.additional_info?.authorized_cameras || [];
        const isAuth = authorized.includes(cameraId);
        const updated = isAuth
            ? authorized.filter((id: string) => id !== cameraId)
            : [...authorized, cameraId];
        setFormData(prev => ({
            ...prev,
            additional_info: {
                ...prev.additional_info,
                authorized_cameras: updated
            }
        }));
    };

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const b64 = reader.result as string;
                setPhotoPreview(b64);
                setFormData(prev => ({ ...prev, profile_photo_b64: b64 }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdate = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Auto-update full name when names change
        if (["first_name", "middle_name", "last_name"].includes(field)) {
            const parts = { ...formData, [field]: value };
            const full = [parts.first_name, parts.middle_name, parts.last_name].filter(Boolean).join(" ");
            setFormData(prev => ({ ...prev, [field]: value, full_name: full }));
        }
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 5));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = authStorage.getToken();
            const response = await fetch(API_ENDPOINTS.nationalId.profiles, {
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
                description: `Profile for ${formData.full_name} has been created with ID ${formData.national_id_number}.`,
            });

            // Reset form
            setStep(1);
            setPhotoPreview(null);
            setFormData({
                national_id_number: "",
                full_name: "",
                first_name: "",
                middle_name: "",
                last_name: "",
                gender: "Male",
                date_of_birth: "",
                nationality: "Ethiopian",
                address: "",
                region: "",
                city: "",
                phone_number: "",
                email: "",
                occupation: "",
                emergency_contact_name: "",
                emergency_contact_phone: "",
                emergency_contact_relationship: "",
                is_verified: true,
                profile_photo_b64: "",
                additional_info: {
                    authorized_cameras: [] as string[]
                }
            });
        } catch (error: any) {
            toast({
                title: "Registration Failed",
                description: error.message || "There was an error connecting to the National ID service.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AdminLayout title="National ID Registration" subtitle="Register citizens into the National ID Security Database">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Progress Tracker */}
                <div className="flex items-center justify-between mb-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center flex-1 last:flex-none">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300",
                                    step >= i ? "bg-primary text-primary-foreground shadow-lg scale-110" : "bg-muted text-muted-foreground"
                                )}
                            >
                                {i}
                            </div>
                            {i < 5 && (
                                <div className={cn("h-1 flex-1 mx-2 rounded", step > i ? "bg-primary" : "bg-muted")} />
                            )}
                        </div>
                    ))}
                </div>

                <Card className="glass-card overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                {step === 1 && <User className="w-5 h-5" />}
                                {step === 2 && <MapPin className="w-5 h-5" />}
                                {step === 3 && <Briefcase className="w-5 h-5" />}
                                {step === 4 && <IdCard className="w-5 h-5" />}
                                {step === 5 && <ShieldCheck className="w-5 h-5" />}
                            </div>
                            <div>
                                <CardTitle>
                                    {step === 1 && "Personal Information"}
                                    {step === 2 && "Contact & Location"}
                                    {step === 3 && "Employment & Emergency"}
                                    {step === 4 && "Biometric Photo"}
                                    {step === 5 && "Official ID & Verification"}
                                </CardTitle>
                                <CardDescription>
                                    {step === 1 && "Enter the full legal name and basic details of the citizen."}
                                    {step === 2 && "Physical address and communication channels."}
                                    {step === 3 && "Job details and next-of-kin information."}
                                    {step === 4 && "Upload or capture a photo for biometric processing (Buffalo L)."}
                                    {step === 5 && "Assign National ID number and set verification status."}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">

                        {/* Step 1: Personal Info */}
                        {step === 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input
                                        placeholder="Enter first name"
                                        value={formData.first_name}
                                        onChange={(e) => handleUpdate("first_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Middle Name</Label>
                                    <Input
                                        placeholder="Enter middle name"
                                        value={formData.middle_name}
                                        onChange={(e) => handleUpdate("middle_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input
                                        placeholder="Enter last name"
                                        value={formData.last_name}
                                        onChange={(e) => handleUpdate("last_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select value={formData.gender} onValueChange={(v) => handleUpdate("gender", v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date of Birth</Label>
                                    <Input
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={(e) => handleUpdate("date_of_birth", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nationality</Label>
                                    <Input
                                        value={formData.nationality}
                                        onChange={(e) => handleUpdate("nationality", e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Contact & Location */}
                        {step === 2 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="+251 ..."
                                            className="pl-9"
                                            value={formData.phone_number}
                                            onChange={(e) => handleUpdate("phone_number", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            placeholder="citizen@example.et"
                                            className="pl-9"
                                            value={formData.email}
                                            onChange={(e) => handleUpdate("email", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Region</Label>
                                    <Select value={formData.region} onValueChange={(v) => handleUpdate("region", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Region" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ETHIOPIAN_REGIONS.map(r => (
                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input
                                        placeholder="Addis Ababa, Adama, etc."
                                        value={formData.city}
                                        onChange={(e) => handleUpdate("city", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Physical Address / Kebele / Woreda</Label>
                                    <Textarea
                                        placeholder="Enter detailed residence address..."
                                        className="resize-none"
                                        value={formData.address}
                                        onChange={(e) => handleUpdate("address", e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 3: Employment & Emergency */}
                        {step === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Occupation</Label>
                                        <Input
                                            placeholder="Current job title"
                                            value={formData.occupation}
                                            onChange={(e) => handleUpdate("occupation", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border/50">
                                    <div className="flex items-center gap-2 text-primary font-bold mb-6">
                                        <HeartPulse className="w-5 h-5" />
                                        Emergency Contact Information
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Contact Full Name</Label>
                                            <Input
                                                placeholder="Name of relative or friend"
                                                value={formData.emergency_contact_name}
                                                onChange={(e) => handleUpdate("emergency_contact_name", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Contact Phone</Label>
                                            <Input
                                                placeholder="+251 ..."
                                                value={formData.emergency_contact_phone}
                                                onChange={(e) => handleUpdate("emergency_contact_phone", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Relationship</Label>
                                            <Select
                                                value={formData.emergency_contact_relationship}
                                                onValueChange={(v) => handleUpdate("emergency_contact_relationship", v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select relationship" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Spouse">Spouse</SelectItem>
                                                    <SelectItem value="Parent">Parent</SelectItem>
                                                    <SelectItem value="Sibling">Sibling</SelectItem>
                                                    <SelectItem value="Child">Child</SelectItem>
                                                    <SelectItem value="Friend">Friend</SelectItem>
                                                    <SelectItem value="Neighbor">Neighbor</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Biometric Photo */}
                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-10 bg-muted/20 transition-all hover:bg-muted/30">
                                    {photoPreview ? (
                                        <div className="relative group">
                                            <img
                                                src={photoPreview}
                                                alt="Preview"
                                                className="w-64 h-64 object-cover rounded-xl shadow-2xl border-4 border-primary/20"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-3 -right-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => {
                                                    setPhotoPreview(null);
                                                    handleUpdate("profile_photo_b64", "");
                                                }}
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-4">
                                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                                                <UserPlus className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold">Biometric Enrollment</h4>
                                                <p className="text-sm text-muted-foreground">Upload a clear front-facing photo for facial recognition processing.</p>
                                            </div>
                                            <div className="flex gap-4 justify-center pt-2">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    id="photo-upload"
                                                    onChange={handlePhotoChange}
                                                />
                                                <Button asChild>
                                                    <label htmlFor="photo-upload" className="cursor-pointer gap-2">
                                                        <Upload className="w-4 h-4" /> Upload Photo
                                                    </label>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center text-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                                        <span className="text-xs font-medium">Frontal View</span>
                                    </div>
                                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center text-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                                        <span className="text-xs font-medium">Good Lighting</span>
                                    </div>
                                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center text-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                                        <span className="text-xs font-medium">Neutral Expression</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: ID & Verification */}
                        {step === 5 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                                        <IdCard className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Final Step: Issue National ID</h3>
                                    <p className="text-muted-foreground text-sm max-w-md">
                                        Please provide the unique National ID number from the government registry.
                                        Enabling verification will allow this citizen to be recognized by CIMS surveillance.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-primary font-bold">National ID Number (Required)</Label>
                                        <Input
                                            placeholder="e.g. ET0012345678"
                                            className="text-lg font-mono tracking-wider border-primary/40 focus:border-primary"
                                            value={formData.national_id_number}
                                            onChange={(e) => handleUpdate("national_id_number", e.target.value.toUpperCase())}
                                        />
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex flex-col">
                                                <Label className="mb-0.5">Biometric Verification</Label>
                                                <span className="text-xs text-muted-foreground">Enabled for security matching</span>
                                            </div>
                                            <Switch
                                                checked={formData.is_verified}
                                                onCheckedChange={(v) => handleUpdate("is_verified", v)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Summary View */}
                                <div className="p-4 rounded-lg border border-warning/20 bg-warning/5 space-y-2">
                                    <h4 className="text-xs font-bold text-warning uppercase">Registration Summary</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        <span className="text-muted-foreground">Citizen:</span>
                                        <span className="font-medium">{formData.full_name || "Not entered"}</span>
                                        <span className="text-muted-foreground">ID Number:</span>
                                        <span className="font-mono">{formData.national_id_number || "Not assigned"}</span>
                                        <span className="text-muted-foreground">Location:</span>
                                        <span>{formData.city}, {formData.region}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </CardContent>
                    <div className="p-6 bg-muted/30 border-t border-border/50 flex justify-between items-center">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={step === 1 || isSubmitting}
                            className="gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Button>

                        {step < 5 ? (
                            <Button onClick={nextStep} className="gap-2">
                                Continue <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !formData.national_id_number}
                                className="gap-2 bg-success hover:bg-success/90"
                            >
                                {isSubmitting ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" /> Register Citizen
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Global Action */}
                <div className="flex justify-center">
                    <Button variant="ghost" className="text-muted-foreground gap-2" onClick={() => setStep(1)}>
                        <UserPlus className="w-4 h-4" /> Start New Registration
                    </Button>
                </div>
            </div>
        </AdminLayout>
    );
}
