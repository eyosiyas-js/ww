import { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Fingerprint,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  User as UserIcon,
  Info,
  Calendar,
  Globe,
  Tag,
  History,
  Download,
  Clock,
  Trash2,
  ChevronRight,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { mockGet, mockPost, mockDelete } from "@/api/client";
import { API_ENDPOINTS } from "@/api/config";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FingerprintMatch {
  name: string;
  age: number | string;
  gender: string;
  nationality: string;
  remark: string;
  matchScore: number;
  facePhotoB64?: string;
  rawFingerprintB64?: string;
}

/** Shape returned by the backend */
interface HistoryEntry {
  id: string;
  user_id: string;
  organization_id: string;
  matched_name: string;
  matched_dob?: string;
  matched_gender?: string;
  matched_nationality?: string;
  match_score: number;
  remark?: string;
  fingerprint_image_b64?: string;
  face_photo_b64?: string;
  raw_fingerprint_b64?: string;
  created_at: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchHistory(): Promise<HistoryEntry[]> {
  const res = await mockGet<HistoryEntry[]>(API_ENDPOINTS.fingerprintHistory.list);
  return res.data;
}

async function saveMatch(
  match: FingerprintMatch,
  fingerprintB64: string,
): Promise<HistoryEntry> {
  const payload = {
    matched_name: match.name,
    matched_dob: String(match.age),
    matched_gender: match.gender,
    matched_nationality: match.nationality,
    match_score: match.matchScore,
    remark: match.remark,
    fingerprint_image_b64: fingerprintB64.replace(/^data:[^;]+;base64,/, ""),
    face_photo_b64: match.facePhotoB64 ?? null,
    raw_fingerprint_b64: match.rawFingerprintB64 ?? null,
  };
  const res = await mockPost<HistoryEntry>(API_ENDPOINTS.fingerprintHistory.create, payload);
  return res.data;
}

async function deleteEntry(id: string): Promise<void> {
  await mockDelete(API_ENDPOINTS.fingerprintHistory.delete(id));
}

async function clearAllEntries(): Promise<void> {
  // DELETE /fingerprint-history/ clears the caller's visible scope
  await fetch(API_ENDPOINTS.fingerprintHistory.clearAll, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("cims_access_token") ?? ""}`,
    },
  });
}

// ── Download helper ───────────────────────────────────────────────────────────

function downloadBase64Image(b64: string, filename: string) {
  const link = document.createElement("a");
  link.href = `data:image/jpeg;base64,${b64}`;
  link.download = filename;
  link.click();
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

function MatchCard({
  result,
  onNewSearch,
}: {
  result: FingerprintMatch;
  onNewSearch?: () => void;
}) {
  const stableId = useRef(Math.random().toString(36).slice(2, 11).toUpperCase());

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Photo + name */}
      <div className="flex items-center gap-5 p-4 rounded-xl bg-background/50 border border-border">
        <div className="relative w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border/50 shrink-0">
          {result.facePhotoB64 ? (
            <img
              src={`data:image/jpeg;base64,${result.facePhotoB64}`}
              alt="Matched person"
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className="w-12 h-12 text-muted-foreground" />
          )}
          {result.facePhotoB64 && (
            <button
              type="button"
              title="Download photo"
              onClick={() =>
                downloadBase64Image(
                  result.facePhotoB64!,
                  `${result.name.replace(/\s+/g, "_")}_photo.jpg`,
                )
              }
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg"
            >
              <Download className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold truncate">{result.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
            <Badge variant="outline" className="font-mono text-xs">
              ID: {stableId.current}
            </Badge>
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              Confidence: {(result.matchScore * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {result.facePhotoB64 && (
          <Button
            variant="outline"
            size="icon"
            title="Download profile photo"
            className="shrink-0"
            onClick={() =>
              downloadBase64Image(
                result.facePhotoB64!,
                `${result.name.replace(/\s+/g, "_")}_photo.jpg`,
              )
            }
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Calendar, label: "Date of Birth", value: result.age },
          { icon: UserIcon, label: "Gender", value: result.gender },
          { icon: Globe, label: "Nationality", value: result.nationality },
          { icon: Tag, label: "Status", value: "Flagged", className: "text-warning" },
        ].map(({ icon: Icon, label, value, className }) => (
          <div key={label} className="p-3 rounded-xl bg-background/40 border border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase mb-1">
              <Icon className="w-3 h-3" /> {label}
            </div>
            <p className={cn("font-semibold text-sm", className)}>{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Remark */}
      <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
        <div className="flex items-center gap-2 text-xs text-warning uppercase mb-2 font-bold">
          <Info className="w-4 h-4" /> Remark
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed italic">
          "{result.remark}"
        </p>
      </div>

      {onNewSearch && (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => (window.location.href = "/detection")}>
            View Detections
          </Button>
          <Button variant="outline" onClick={onNewSearch}>
            New Search
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FingerprintMatchingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const [matchResult, setMatchResult] = useState<FingerprintMatch | null>(null);
  const [noMatchFound, setNoMatchFound] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const features = (user as any)?.organizationFeatures || {};
  const fingerprintFeature = features.fingerprint || "full";

  // ── Feature gate ──
  useEffect(() => {
    if (fingerprintFeature === "none") {
      toast.error("Your organisation does not have access to Fingerprint Matching.");
      navigate("/");
    }
  }, [fingerprintFeature, navigate]);

  // ── Load history from backend on mount ──
  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => toast.error("Could not load match history."))
      .finally(() => setHistoryLoading(false));
  }, []);

  // ── File selection ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, BMP).");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    setMatchResult(null);
    setNoMatchFound(false);
    setMatchingProgress(0);
    setViewingEntry(null);
  };

  // ── Run match ──
  const startMatching = async () => {
    if (!file || !preview) return;

    setIsMatching(true);
    setMatchingProgress(0);
    setMatchResult(null);
    setNoMatchFound(false);
    setViewingEntry(null);

    try {
      const progressInterval = setInterval(() => {
        setMatchingProgress((p) => (p < 90 ? p + 10 : p));
      }, 500);

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/fingerprint-api/api/fingerprints/match", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setMatchingProgress(100);

      if (response.ok) {
        const data = await response.json();
        if (data?.fullName) {
          const result: FingerprintMatch = {
            name: data.fullName,
            age: data.dateOfBirth,
            gender: data.sex,
            nationality: data.nationality,
            remark: "Biometric identification match confirmed via central database.",
            matchScore: 0.99,
            facePhotoB64: data.facePhotoB64,
            rawFingerprintB64: data.rawFingerprintB64,
          };
          setMatchResult(result);
          toast.success("Identity Match Found!");

          // Persist to database
          try {
            const saved = await saveMatch(result, preview);
            setHistory((prev) => [saved, ...prev]);
          } catch {
            toast.error("Match found but could not save to history.");
          }
        } else {
          setNoMatchFound(true);
          toast.error("No identity match found in database.");
        }
      } else {
        throw new Error("API call failed");
      }
    } catch {
      setNoMatchFound(true);
      toast.error("Failed to connect to matching service.");
    } finally {
      setIsMatching(false);
    }
  };

  // ── Clear scan ──
  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setMatchResult(null);
    setNoMatchFound(false);
    setMatchingProgress(0);
    setViewingEntry(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Delete single entry ──
  const handleDeleteEntry = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await deleteEntry(id);
        setHistory((prev) => prev.filter((h) => h.id !== id));
        if (viewingEntry?.id === id) setViewingEntry(null);
        toast.success("Entry removed from history.");
      } catch {
        toast.error("Could not delete entry.");
      }
    },
    [viewingEntry],
  );

  // ── Clear all (confirmed) ──
  const handleClearAll = async () => {
    try {
      await clearAllEntries();
      setHistory([]);
      setViewingEntry(null);
      toast.success("History cleared.");
    } catch {
      toast.error("Could not clear history.");
    }
  };

  // ── Derive display result ──
  const displayResult: FingerprintMatch | null = viewingEntry
    ? {
      name: viewingEntry.matched_name,
      age: viewingEntry.matched_dob ?? "—",
      gender: viewingEntry.matched_gender ?? "—",
      nationality: viewingEntry.matched_nationality ?? "—",
      remark: viewingEntry.remark ?? "",
      matchScore: viewingEntry.match_score,
      facePhotoB64: viewingEntry.face_photo_b64,
      rawFingerprintB64: viewingEntry.raw_fingerprint_b64,
    }
    : matchResult;

  const isViewingHistory = viewingEntry !== null;

  return (
    <AppLayout title="Fingerprint Matching" subtitle="Biometric identity verification">
      <div className="max-w-7xl mx-auto mt-6 space-y-6">

        {/* ── Main two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left: Upload & Scan */}
          <div className="space-y-6">
            <div
              className={cn(
                "glass-card p-8 flex flex-col items-center justify-center min-h-[400px] relative border-dashed border-2 transition-colors",
                preview
                  ? "border-primary/40"
                  : "border-primary/20 hover:border-primary/40 cursor-pointer",
              )}
              onClick={() => !preview && fileInputRef.current?.click()}
            >
              {!preview ? (
                <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Upload className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium">Upload Fingerprint</p>
                    <p className="text-sm text-muted-foreground">
                      Click to browse or drag and drop image
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={
                      matchResult?.rawFingerprintB64
                        ? `data:image/jpeg;base64,${matchResult.rawFingerprintB64}`
                        : preview
                    }
                    alt="Fingerprint"
                    className={cn(
                      "max-h-[300px] object-contain rounded-lg shadow-lg transition-all duration-500",
                      isMatching && "opacity-50 blur-[2px]",
                      matchResult?.rawFingerprintB64 && "border-2 border-success/50",
                    )}
                  />

                  {isMatching && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-1 bg-primary/50 absolute top-0 animate-scan" />
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        <p className="text-primary font-bold tracking-widest uppercase">
                          Scanning...
                        </p>
                      </div>
                    </div>
                  )}

                  {!isMatching && !matchResult && !noMatchFound && (
                    <div className="absolute -bottom-4 right-0 flex gap-2">
                      <Button variant="outline" size="sm" onClick={clearAll}>
                        Clear
                      </Button>
                      <Button size="sm" onClick={startMatching}>
                        Start Matching
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
              />
            </div>

            {isMatching && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Database Search Status</span>
                  <span>{matchingProgress}%</span>
                </div>
                <Progress value={matchingProgress} className="h-2" />
              </div>
            )}
          </div>

          {/* Right: Result panel */}
          <div className="space-y-4">
            <div
              className={cn(
                "glass-card p-8 min-h-[400px] transition-all duration-500 flex flex-col",
                displayResult
                  ? "border-success/30 bg-success/5"
                  : noMatchFound
                    ? "border-destructive/30 bg-destructive/5"
                    : "",
              )}
            >
              {/* Panel header */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                    displayResult
                      ? "bg-success/20 text-success"
                      : noMatchFound
                        ? "bg-destructive/20 text-destructive"
                        : "bg-primary/20 text-primary",
                  )}
                >
                  <Fingerprint className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">
                    {isViewingHistory ? "History Entry" : "Verification Result"}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {isViewingHistory
                      ? `Matched on ${new Date(viewingEntry!.created_at).toLocaleString()}`
                      : "Automated matching against Public Safety System database"}
                  </p>
                </div>
                {displayResult && (
                  <Badge
                    variant="outline"
                    className="ml-auto flex gap-1 bg-success/10 text-success border-success/30 shrink-0"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {isViewingHistory ? "From History" : "Match Found"}
                  </Badge>
                )}
                {noMatchFound && !displayResult && (
                  <Badge variant="destructive" className="ml-auto flex gap-1 shrink-0">
                    <XCircle className="w-3 h-3" /> No Match
                  </Badge>
                )}
              </div>

              {displayResult ? (
                <MatchCard
                  result={displayResult}
                  onNewSearch={isViewingHistory ? undefined : clearAll}
                />
              ) : noMatchFound ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Match Found</h3>
                  <p className="text-muted-foreground max-w-xs">
                    The uploaded fingerprint does not match any records in the surveillance
                    database. Please try another scan or verify the image quality.
                  </p>
                  <Button variant="outline" className="mt-6" onClick={clearAll}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                  <Fingerprint className="w-16 h-16 mb-4 opacity-20" />
                  <p className="max-w-xs">
                    Upload a fingerprint image and click 'Start Matching' to verify against
                    the Public Safety System biometric database.
                  </p>
                </div>
              )}
            </div>

            {isViewingHistory && (matchResult || noMatchFound) && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setViewingEntry(null)}
              >
                <Eye className="w-4 h-4" />
                Back to Current Result
              </Button>
            )}
          </div>
        </div>

        {/* ── Match History ── */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Match History</h2>
              {!historyLoading && (
                <Badge variant="secondary" className="text-xs">
                  {history.length}
                </Badge>
              )}
            </div>

            {history.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all match history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {history.length} fingerprint match
                      record{history.length !== 1 ? "s" : ""} from the database. This action
                      cannot be undone and will also remove the data from analytics.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, clear all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <Separator className="mb-4" />

          {historyLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading history…
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <History className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">No match history yet.</p>
              <p className="text-xs mt-1">Successful matches will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {history.map((entry) => {
                const isActive = viewingEntry?.id === entry.id;
                const fingerprintSrc = entry.fingerprint_image_b64
                  ? `data:image/jpeg;base64,${entry.fingerprint_image_b64}`
                  : null;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setViewingEntry(isActive ? null : entry);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "group relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                      isActive
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/40",
                    )}
                  >
                    {/* Fingerprint thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border border-border/50 shrink-0 flex items-center justify-center">
                      {fingerprintSrc ? (
                        <img
                          src={fingerprintSrc}
                          alt="Fingerprint"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Fingerprint className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{entry.matched_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {new Date(entry.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 mt-1 text-success border-success/40"
                      >
                        {(entry.match_score * 100).toFixed(0)}% match
                      </Badge>
                    </div>

                    {/* Face photo thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border/50 shrink-0 flex items-center justify-center">
                      {entry.face_photo_b64 ? (
                        <img
                          src={`data:image/jpeg;base64,${entry.face_photo_b64}`}
                          alt={entry.matched_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    <ChevronRight
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform",
                        isActive ? "text-primary rotate-90" : "text-muted-foreground",
                      )}
                    />

                    {/* Per-entry delete */}
                    <button
                      type="button"
                      title="Remove entry"
                      onClick={(e) => handleDeleteEntry(entry.id, e)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%  { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan { animation: scan 2s linear infinite; }
      `}</style>
    </AppLayout>
  );
}
