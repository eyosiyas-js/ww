import React, { useState, useRef, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Upload,
    Camera,
    Video,
    Search,
    User,
    CheckCircle2,
    XCircle,
    Loader2,
    RefreshCw,
    Download,
    Calendar,
    Phone,
    MapPin,
    Briefcase,
    IdCard,
    Globe,
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    SkipForward,
    ScanFace,
    Shield,
    AlertCircle,
    ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/api/config";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NationalIdResult {
    id: string;
    national_id_number: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    gender?: string;
    date_of_birth?: string;
    nationality?: string;
    region?: string;
    city?: string;
    address?: string;
    phone_number?: string;
    email?: string;
    occupation?: string;
    profile_photo_url?: string;
    status?: string;
    is_verified?: boolean;
    confidence?: number;
}

interface MatchResult {
    matched: boolean;
    confidence: number;
    profile?: NationalIdResult;
    error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

async function searchFaceInNationalId(imageDataUrl: string): Promise<MatchResult> {
    const token = localStorage.getItem("cims_access_token") ?? "";
    // Convert dataURL to base64 string (strip prefix)
    const base64 = imageDataUrl.replace(/^data:[^;]+;base64,/, "");

    const response = await fetch(`${API_BASE_URL}/national-id/face-search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_b64: base64 }),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

// ── ProfileCard ───────────────────────────────────────────────────────────────

function ProfileCard({
    profile,
    confidence,
    onClose,
}: {
    profile: NationalIdResult;
    confidence: number;
    onClose?: () => void;
}) {
    const [expandPhoto, setExpandPhoto] = useState(false);
    const photoUrl = profile.profile_photo_url
        ? profile.profile_photo_url.startsWith("http")
            ? profile.profile_photo_url
            : `${API_BASE_URL.replace("/api/v1", "")}/${profile.profile_photo_url}`
        : null;

    const confPct = Math.round(confidence * 100);
    const confColor =
        confPct >= 80 ? "text-green-500" : confPct >= 60 ? "text-yellow-500" : "text-red-500";

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                {/* Photo */}
                <div
                    className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary/30 bg-muted flex items-center justify-center cursor-pointer shrink-0 group"
                    onClick={() => photoUrl && setExpandPhoto(true)}
                >
                    {photoUrl ? (
                        <>
                            <img src={photoUrl} alt={profile.full_name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-5 h-5 text-white" />
                            </div>
                        </>
                    ) : (
                        <User className="w-12 h-12 text-muted-foreground" />
                    )}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold truncate">{profile.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                            <IdCard className="w-3 h-3 mr-1" />
                            {profile.national_id_number}
                        </Badge>
                        {profile.is_verified && (
                            <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                        )}
                        {profile.status && (
                            <Badge variant="secondary" className="text-xs capitalize">
                                {profile.status}
                            </Badge>
                        )}
                    </div>
                    <div className={cn("text-sm font-semibold mt-2", confColor)}>
                        Match Confidence: {confPct}%
                    </div>
                </div>
            </div>

            {/* Confidence bar */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Biometric Match Score</span>
                    <span className={cn("font-bold", confColor)}>{confPct}%</span>
                </div>
                <Progress
                    value={confPct}
                    className={cn(
                        "h-2.5 rounded-full",
                        confPct >= 80
                            ? "[&>div]:bg-green-500"
                            : confPct >= 60
                                ? "[&>div]:bg-yellow-500"
                                : "[&>div]:bg-red-500"
                    )}
                />
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { icon: Calendar, label: "Date of Birth", value: profile.date_of_birth || "—" },
                    { icon: User, label: "Gender", value: profile.gender || "—" },
                    { icon: Globe, label: "Nationality", value: profile.nationality || "Ethiopian" },
                    { icon: MapPin, label: "Region", value: profile.region || profile.city || "—" },
                    ...(profile.phone_number
                        ? [{ icon: Phone, label: "Phone", value: profile.phone_number }]
                        : []),
                    ...(profile.occupation
                        ? [{ icon: Briefcase, label: "Occupation", value: profile.occupation }]
                        : []),
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="p-3 rounded-xl bg-background/40 border border-border/50">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase mb-1">
                            <Icon className="w-3 h-3" /> {label}
                        </div>
                        <p className="font-semibold text-sm truncate">{value}</p>
                    </div>
                ))}
            </div>

            {profile.address && (
                <div className="p-3 rounded-xl bg-background/40 border border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase mb-1">
                        <MapPin className="w-3 h-3" /> Address
                    </div>
                    <p className="text-sm">{profile.address}</p>
                </div>
            )}

            {onClose && (
                <Button variant="outline" className="w-full" onClick={onClose}>
                    <RefreshCw className="w-4 h-4 mr-2" /> New Search
                </Button>
            )}

            {/* Expand photo dialog */}
            {photoUrl && (
                <Dialog open={expandPhoto} onOpenChange={setExpandPhoto}>
                    <DialogContent className="sm:max-w-lg p-2 bg-transparent border-none shadow-none flex justify-center items-center">
                        <img
                            src={photoUrl}
                            alt={profile.full_name}
                            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// ── Scanning overlay ──────────────────────────────────────────────────────────

function ScanOverlay({ progress }: { progress: number }) {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 rounded-xl">
            <div className="relative w-48 h-48">
                {/* Corner brackets */}
                {["top-0 left-0", "top-0 right-0 rotate-90", "bottom-0 right-0 rotate-180", "bottom-0 left-0 -rotate-90"].map((pos, i) => (
                    <div key={i} className={cn("absolute w-8 h-8 border-[3px] border-primary", pos === "top-0 left-0" ? "border-r-0 border-b-0 rounded-tl" : pos === "top-0 right-0 rotate-90" ? "border-r-0 border-b-0 rounded-tl rotate-90" : pos === "bottom-0 right-0 rotate-180" ? "border-r-0 border-b-0 rounded-tl rotate-180" : "border-r-0 border-b-0 rounded-tl -rotate-90", pos)} />
                ))}
                {/* Scan line */}
                <div
                    className="absolute left-2 right-2 h-0.5 bg-primary/80 shadow-[0_0_8px_2px_rgba(99,102,241,0.6)] transition-all duration-300"
                    style={{ top: `${(progress / 100) * 100}%` }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <ScanFace className="w-10 h-10 text-primary animate-pulse" />
                    <p className="text-primary text-xs font-bold tracking-widest uppercase">Scanning</p>
                </div>
            </div>
            <div className="mt-4 w-48 space-y-1">
                <Progress value={progress} className="h-1.5" />
                <p className="text-center text-xs text-muted-foreground">{progress}% — Searching database…</p>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FaceMatchingPage() {
    // Photo tab state
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Webcam tab state
    const [webcamActive, setWebcamActive] = useState(false);
    const [webcamCapture, setWebcamCapture] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);

    // Video tab state
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [videoFrames, setVideoFrames] = useState<string[]>([]);
    const [selectedFrame, setSelectedFrame] = useState<number>(0);
    const [isExtractingFrames, setIsExtractingFrames] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const videoPlayerRef = useRef<HTMLVideoElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Shared matching state
    const [isMatching, setIsMatching] = useState(false);
    const [matchProgress, setMatchProgress] = useState(0);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

    // ── Helpers ──
    const getActiveImage = (tab: string): string | null => {
        if (tab === "photo") return photoPreview;
        if (tab === "webcam") return webcamCapture;
        if (tab === "video") return videoFrames[selectedFrame] ?? null;
        return null;
    };

    const resetResult = () => {
        setMatchResult(null);
        setMatchProgress(0);
    };

    // ── Webcam ──
    const startWebcam = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcamStreamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setWebcamActive(true);
            setWebcamCapture(null);
            resetResult();
        } catch {
            toast.error("Could not access webcam. Please allow camera access.");
        }
    }, []);

    const stopWebcam = useCallback(() => {
        webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
        setWebcamActive(false);
    }, []);

    const captureWebcam = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const vid = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = vid.videoWidth;
        canvas.height = vid.videoHeight;
        canvas.getContext("2d")?.drawImage(vid, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setWebcamCapture(dataUrl);
        stopWebcam();
        resetResult();
    }, [stopWebcam]);

    useEffect(() => () => stopWebcam(), [stopWebcam]);

    // ── Photo upload ──
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setPhotoFile(f);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
            resetResult();
        };
        reader.readAsDataURL(f);
    };

    // ── Video upload + frame extraction ──
    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setVideoFile(f);
        const url = URL.createObjectURL(f);
        setVideoSrc(url);
        setVideoFrames([]);
        setSelectedFrame(0);
        resetResult();
    };

    const extractFrames = useCallback(async () => {
        if (!videoPlayerRef.current || !canvasRef.current || !videoSrc) return;
        setIsExtractingFrames(true);
        setVideoFrames([]);
        const vid = videoPlayerRef.current;
        const canvas = canvasRef.current;

        await new Promise<void>((res) => {
            vid.currentTime = 0;
            vid.onseeked = () => res();
            if (vid.readyState >= 1) vid.currentTime = 0;
        });

        const duration = vid.duration;
        const count = Math.min(12, Math.floor(duration));
        const interval = duration / count;
        const frames: string[] = [];

        for (let i = 0; i < count; i++) {
            const t = i * interval;
            await new Promise<void>((res) => {
                vid.currentTime = t;
                vid.onseeked = () => {
                    canvas.width = vid.videoWidth;
                    canvas.height = vid.videoHeight;
                    canvas.getContext("2d")?.drawImage(vid, 0, 0);
                    frames.push(canvas.toDataURL("image/jpeg", 0.8));
                    res();
                };
            });
        }

        setVideoFrames(frames);
        setSelectedFrame(0);
        setIsExtractingFrames(false);
        toast.success(`Extracted ${frames.length} frames. Select the best face frame to search.`);
    }, [videoSrc]);

    // ── Face match ──
    const runMatch = async (imageUrl: string) => {
        setIsMatching(true);
        setMatchProgress(0);
        setMatchResult(null);

        const timer = setInterval(() => {
            setMatchProgress((p) => (p < 85 ? p + 12 : p));
        }, 400);

        try {
            const result = await searchFaceInNationalId(imageUrl);
            clearInterval(timer);
            setMatchProgress(100);
            setMatchResult(result);
            if (result.matched && result.profile) {
                toast.success(`Identity found: ${result.profile.full_name}`);
            } else {
                toast.error("No matching identity found in National ID database.");
            }
        } catch (err: any) {
            clearInterval(timer);
            setMatchProgress(0);
            toast.error("Face search failed. Check backend connection.");
            setMatchResult({ matched: false, confidence: 0, error: err?.message });
        } finally {
            setIsMatching(false);
        }
    };

    // ── Shared result panel ──
    function ResultPanel({ imageUrl }: { imageUrl: string | null }) {
        return (
            <div
                className={cn(
                    "glass-card p-6 min-h-[400px] flex flex-col transition-all duration-500",
                    matchResult?.matched
                        ? "border-green-500/30 bg-green-500/5"
                        : matchResult && !matchResult.matched
                            ? "border-destructive/30 bg-destructive/5"
                            : ""
                )}
            >
                {/* Panel header */}
                <div className="flex items-center gap-3 mb-5">
                    <div
                        className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                            matchResult?.matched
                                ? "bg-green-500/20 text-green-500"
                                : matchResult && !matchResult.matched
                                    ? "bg-destructive/20 text-destructive"
                                    : "bg-primary/20 text-primary"
                        )}
                    >
                        <ScanFace className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold">Face Identification Result</h2>
                        <p className="text-xs text-muted-foreground">
                            Matching against National ID biometric database
                        </p>
                    </div>
                    {matchResult?.matched && (
                        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 shrink-0 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Identity Found
                        </Badge>
                    )}
                    {matchResult && !matchResult.matched && (
                        <Badge variant="destructive" className="shrink-0 gap-1">
                            <XCircle className="w-3 h-3" /> No Match
                        </Badge>
                    )}
                </div>

                {matchResult?.matched && matchResult.profile ? (
                    <ProfileCard
                        profile={matchResult.profile}
                        confidence={matchResult.confidence}
                        onClose={() => { setMatchResult(null); setMatchProgress(0); }}
                    />
                ) : matchResult && !matchResult.matched ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-500">
                        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                            <XCircle className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">No Match Found</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                The face in this image does not match any registered citizen in the National ID
                                database. Try a clearer image with better lighting.
                            </p>
                            {matchResult.error && (
                                <p className="text-xs text-destructive mt-2">{matchResult.error}</p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => { setMatchResult(null); setMatchProgress(0); }}
                        >
                            Try Again
                        </Button>
                    </div>
                ) : isMatching ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        <div className="text-center">
                            <p className="font-semibold text-primary">Scanning Biometric Database</p>
                            <p className="text-sm text-muted-foreground mt-1">Comparing facial features…</p>
                        </div>
                        <div className="w-full max-w-xs space-y-1">
                            <Progress value={matchProgress} className="h-2" />
                            <p className="text-center text-xs text-muted-foreground">{matchProgress}%</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                        <ScanFace className="w-16 h-16 opacity-20" />
                        <p className="max-w-xs text-sm">
                            Upload a photo, capture from webcam, or extract a frame from video, then click
                            <strong> Search Identity</strong> to match against the National ID database.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <AppLayout title="Face Identity Search" subtitle="Match faces against the National ID citizen database">
            {/* Hidden canvas for frame extraction */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="max-w-7xl mx-auto mt-2 space-y-6">
                {/* Header card */}
                <div className="glass-card p-5 flex items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Facial Identity Verification</h1>
                        <p className="text-sm text-muted-foreground">
                            Upload a photo or video to instantly identify a person against the National ID registration database using facial recognition.
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto shrink-0 border-primary/30 text-primary">
                        <ScanFace className="w-3.5 h-3.5 mr-1" /> AI Powered
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ── LEFT: Input methods ── */}
                    <div>
                        <Tabs defaultValue="photo" className="space-y-4">
                            <TabsList className="grid grid-cols-3 w-full">
                                <TabsTrigger value="photo" className="gap-2">
                                    <Upload className="w-4 h-4" /> Photo
                                </TabsTrigger>
                                <TabsTrigger value="webcam" className="gap-2">
                                    <Camera className="w-4 h-4" /> Webcam
                                </TabsTrigger>
                                <TabsTrigger value="video" className="gap-2">
                                    <Video className="w-4 h-4" /> Video
                                </TabsTrigger>
                            </TabsList>

                            {/* ── Photo Tab ── */}
                            <TabsContent value="photo" className="space-y-4">
                                <div
                                    className={cn(
                                        "relative glass-card min-h-[360px] flex flex-col items-center justify-center overflow-hidden transition-all",
                                        photoPreview ? "border-primary/40 cursor-default" : "border-dashed border-2 border-primary/20 hover:border-primary/50 cursor-pointer"
                                    )}
                                    onClick={() => !photoPreview && photoInputRef.current?.click()}
                                >
                                    {photoPreview ? (
                                        <>
                                            <img
                                                src={photoPreview}
                                                alt="Selected"
                                                className="max-h-[340px] object-contain mx-auto rounded-lg shadow-lg"
                                            />
                                            {isMatching && <ScanOverlay progress={matchProgress} />}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 p-8 text-center">
                                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Upload className="w-10 h-10 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold">Upload a Photo</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    JPG, PNG or BMP — Click to browse or drag & drop
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoChange}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    {photoPreview && (
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => { setPhotoPreview(null); setPhotoFile(null); resetResult(); if (photoInputRef.current) photoInputRef.current.value = ""; }}
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" /> Clear
                                        </Button>
                                    )}
                                    <Button
                                        className="flex-1"
                                        disabled={!photoPreview || isMatching}
                                        onClick={() => photoPreview && runMatch(photoPreview)}
                                    >
                                        {isMatching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                        Search Identity
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* ── Webcam Tab ── */}
                            <TabsContent value="webcam" className="space-y-4">
                                <div className="relative glass-card min-h-[360px] flex flex-col items-center justify-center overflow-hidden bg-black/5">
                                    {webcamActive ? (
                                        <>
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full max-h-[340px] object-contain rounded-lg"
                                            />
                                            {/* Face guide overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-48 h-56 border-2 border-dashed border-primary/60 rounded-[50%] shadow-[0_0_20px_rgba(99,102,241,0.3)]" />
                                            </div>
                                        </>
                                    ) : webcamCapture ? (
                                        <>
                                            <img
                                                src={webcamCapture}
                                                alt="Webcam capture"
                                                className="max-h-[340px] object-contain mx-auto rounded-lg shadow-lg"
                                            />
                                            {isMatching && <ScanOverlay progress={matchProgress} />}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 p-8 text-center">
                                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Camera className="w-10 h-10 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold">Use Webcam</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Capture a live photo from your camera
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {!webcamActive && !webcamCapture && (
                                        <Button className="flex-1" onClick={startWebcam}>
                                            <Camera className="w-4 h-4 mr-2" /> Start Camera
                                        </Button>
                                    )}
                                    {webcamActive && (
                                        <>
                                            <Button variant="outline" className="flex-1" onClick={stopWebcam}>
                                                <XCircle className="w-4 h-4 mr-2" /> Cancel
                                            </Button>
                                            <Button className="flex-1" onClick={captureWebcam}>
                                                <Camera className="w-4 h-4 mr-2" /> Capture
                                            </Button>
                                        </>
                                    )}
                                    {webcamCapture && !webcamActive && (
                                        <>
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => { setWebcamCapture(null); resetResult(); startWebcam(); }}
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" /> Retake
                                            </Button>
                                            <Button
                                                className="flex-1"
                                                disabled={isMatching}
                                                onClick={() => runMatch(webcamCapture)}
                                            >
                                                {isMatching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                                Search Identity
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </TabsContent>

                            {/* ── Video Tab ── */}
                            <TabsContent value="video" className="space-y-4">
                                {!videoSrc ? (
                                    <div
                                        className="glass-card min-h-[360px] flex flex-col items-center justify-center border-dashed border-2 border-primary/20 hover:border-primary/50 cursor-pointer transition-all"
                                        onClick={() => videoInputRef.current?.click()}
                                    >
                                        <div className="flex flex-col items-center gap-4 p-8 text-center">
                                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Video className="w-10 h-10 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold">Upload a Video</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    MP4, MOV, AVI — Frames will be extracted for face matching
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            ref={videoInputRef}
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={handleVideoChange}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Video player */}
                                        <div className="relative glass-card overflow-hidden bg-black rounded-xl">
                                            <video
                                                ref={videoPlayerRef}
                                                src={videoSrc}
                                                className="w-full max-h-[240px] object-contain"
                                                onEnded={() => setVideoPlaying(false)}
                                            />
                                        </div>

                                        {/* Controls */}
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (videoPlaying) { videoPlayerRef.current?.pause(); setVideoPlaying(false); }
                                                    else { videoPlayerRef.current?.play(); setVideoPlaying(true); }
                                                }}
                                            >
                                                {videoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                disabled={isExtractingFrames}
                                                onClick={extractFrames}
                                            >
                                                {isExtractingFrames ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <SkipForward className="w-4 h-4 mr-2" />
                                                )}
                                                Extract Frames
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => { setVideoSrc(null); setVideoFile(null); setVideoFrames([]); resetResult(); if (videoInputRef.current) videoInputRef.current.value = ""; }}
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Frames grid */}
                                        {videoFrames.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        Select a frame with a clear face:
                                                    </p>
                                                    <Badge variant="outline" className="text-xs">
                                                        Frame {selectedFrame + 1} / {videoFrames.length}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {videoFrames.map((frame, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                "relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:shadow-md",
                                                                selectedFrame === idx
                                                                    ? "border-primary shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
                                                                    : "border-border hover:border-primary/50"
                                                            )}
                                                            onClick={() => { setSelectedFrame(idx); resetResult(); }}
                                                        >
                                                            <img src={frame} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                                                            {selectedFrame === idx && (
                                                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Selected frame preview */}
                                                <div className="relative glass-card overflow-hidden min-h-[160px] flex items-center justify-center">
                                                    <img
                                                        src={videoFrames[selectedFrame]}
                                                        alt="Selected frame"
                                                        className="max-h-[200px] object-contain mx-auto rounded-lg"
                                                    />
                                                    {isMatching && <ScanOverlay progress={matchProgress} />}
                                                </div>

                                                <Button
                                                    className="w-full"
                                                    disabled={isMatching}
                                                    onClick={() => runMatch(videoFrames[selectedFrame])}
                                                >
                                                    {isMatching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                                    Search Identity from Frame {selectedFrame + 1}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* ── RIGHT: Result ── */}
                    <div>
                        {/* This uses a trick to pass the active image regardless of tab */}
                        <ResultPanel imageUrl={photoPreview ?? webcamCapture ?? videoFrames[selectedFrame] ?? null} />
                    </div>
                </div>

                {/* Info strip */}
                <div className="glass-card p-4 flex items-start gap-3 border-amber-500/20 bg-amber-500/5">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold text-amber-700 dark:text-amber-400">Usage Guidelines</p>
                        <p className="text-muted-foreground text-xs mt-1">
                            Face matching is for authorized law enforcement use only. Results are matched against the National ID biometric database.
                            Ensure images have clear, front-facing faces with good lighting for best accuracy. Video frames are processed locally — no raw video is sent to the server.
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
