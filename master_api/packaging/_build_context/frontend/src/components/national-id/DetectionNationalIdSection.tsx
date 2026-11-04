import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  IdCard,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Zap,
  Eye,
  RefreshCw,
  Calendar,
  Phone,
  MapPin,
  Briefcase
} from "lucide-react";
import {
  useDetectionNationalIdMatches,
  useDetectionPrimaryNationalIdMatch,
  useAutoMatchDetectionToNationalId,
  useNationalIdProfileByIdNumber
} from "@/hooks/use-national-id";
import { NationalIdMatch } from "./NationalIdMatch";
import { NationalIdProfile } from "./NationalIdProfile";

interface DetectionNationalIdSectionProps {
  detectionId: string;
  detectionCategory: string;
  nationalIdNumber?: string;
  className?: string;
}

export function DetectionNationalIdSection({
  detectionId,
  detectionCategory,
  nationalIdNumber,
  className = ""
}: DetectionNationalIdSectionProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isMatchesDialogOpen, setIsMatchesDialogOpen] = useState(false);

  const {
    data: matches,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches
  } = useDetectionNationalIdMatches(detectionId, detectionCategory === "person");

  const {
    data: primaryMatch,
    isLoading: primaryLoading
  } = useDetectionPrimaryNationalIdMatch(detectionId, detectionCategory === "person");

  const {
    data: directPerson,
    isLoading: directLoading,
    error: directError
  } = useNationalIdProfileByIdNumber(nationalIdNumber || "", detectionCategory === "person" && !primaryMatch);

  console.log("DetectionNationalIdSection:", { detectionId, nationalIdNumber, directPerson, primaryMatch });

  const autoMatch = useAutoMatchDetectionToNationalId();

  // Don't show for non-person detections
  if (detectionCategory !== "person") {
    return null;
  }

  const handleAutoMatch = async () => {
    try {
      await autoMatch.mutateAsync(detectionId);
      refetchMatches();
    } catch (error) {
      console.error("Auto-match failed:", error);
    }
  };

  // Automatically trigger auto-match if no matches found
  React.useEffect(() => {
    if (detectionCategory === "person" && !matchesLoading && matches && matches.length === 0 && !primaryMatch && !directPerson && !autoMatch.isPending) {
      console.log("Triggering auto-match for:", detectionId);
      handleAutoMatch();
    }
  }, [detectionId, detectionCategory, matches, matchesLoading, primaryMatch, directPerson]);

  const hasMatches = (matches && matches.length > 0) || !!directPerson;
  const confirmedMatch = matches?.find(m => m.status === "confirmed");

  // Selection priority: 1. Confirmed link 2. Primary link from DB 3. Direct ID lookup
  const primaryProfile = confirmedMatch?.national_id_profile || primaryMatch?.national_id_profile || directPerson;
  const isAnyLoading = matchesLoading || primaryLoading || (directLoading && !!nationalIdNumber);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <IdCard className="h-5 w-5" />
            <CardTitle>National ID</CardTitle>
            {hasMatches && (
              <Badge variant="outline" className="ml-2">
                {matches.length} match{matches.length !== 1 ? "es" : ""}
              </Badge>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoMatch}
              disabled={autoMatch.isPending}
            >
              {autoMatch.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Auto-Match
            </Button>

            {hasMatches && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMatchesDialogOpen(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All ({matches.length})
              </Button>
            )}
          </div>
        </div>

        <CardDescription>
          {confirmedMatch ? (
            "Verified identity confirmed and linked to this detection."
          ) : directPerson ? (
            "Direct registration match found in National ID database for this ID number."
          ) : hasMatches ? (
            `${matches.length} potential National ID match${matches.length !== 1 ? "es" : ""} found`
          ) : (
            "No National ID matches found. Click Auto-Match to search the database."
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {matchesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading National ID matches...</span>
          </div>
        )}

        {matchesError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load National ID matches. This might be because:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You need to be logged in to access National ID data</li>
                <li>The backend server needs to be restarted to load new endpoints</li>
                <li>Mock National ID data hasn't been populated yet</li>
              </ul>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchMatches()}
                  className="mr-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/admin/national-id-management', '_blank')}
                >
                  Open Admin Panel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {isAnyLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">Searching National ID database...</p>
          </div>
        )}

        {!isAnyLoading && !matchesError && (
          <>
            {/* Primary/Confirmed Match */}
            {primaryProfile && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium flex items-center">
                    {confirmedMatch ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                        Confirmed Identity
                      </>
                    ) : primaryMatch ? (
                      <>
                        <User className="h-4 w-4 mr-2 text-blue-600" />
                        Primary Match
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                        Direct ID Match
                      </>
                    )}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsProfileDialogOpen(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </div>

                <NationalIdProfile profile={primaryProfile} compact />

                {/* Full Information Display for matched profiles */}
                <div className="grid grid-cols-2 gap-3 mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tight flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date of Birth
                    </p>
                    <p className="text-sm font-semibold">{new Date(primaryProfile.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tight flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone Number
                    </p>
                    <p className="text-sm font-semibold">{primaryProfile.phone_number || "N/A"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tight flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Region / City
                    </p>
                    <p className="text-sm font-semibold truncate">{primaryProfile.region}{primaryProfile.city ? `, ${primaryProfile.city}` : ""}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tight flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Occupation
                    </p>
                    <p className="text-sm font-semibold truncate">{primaryProfile.occupation || "N/A"}</p>
                  </div>
                  <div className="col-span-2 space-y-0.5 pt-1">
                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tight flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Residential Address
                    </p>
                    <p className="text-sm font-medium text-muted-foreground leading-snug">{primaryProfile.address || "No address provided"}</p>
                  </div>
                </div>

                {confirmedMatch && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Identity Confirmed</span>
                    </div>
                    {confirmedMatch.verification_notes && (
                      <p className="text-sm text-green-700 mt-1">
                        {confirmedMatch.verification_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No Matches State */}
            {!primaryProfile && !hasMatches && (
              <div className="text-center py-8">
                <IdCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No National ID Matches</h3>
                <p className="text-muted-foreground mb-4">
                  This person detection has not been matched to any National ID records.
                </p>
                <Button onClick={handleAutoMatch} disabled={autoMatch.isPending}>
                  {autoMatch.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search National ID Database
                </Button>
              </div>
            )}

            {/* Multiple Matches Summary */}
            {hasMatches && matches.length > 1 && (
              <div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Additional Matches</h3>
                    <p className="text-sm text-muted-foreground">
                      {matches.length - 1} other potential match{matches.length - 1 !== 1 ? "es" : ""} found
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMatchesDialogOpen(true)}
                  >
                    Review All Matches
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Full Profile Dialog */}
      {primaryProfile && (
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>National ID Profile</DialogTitle>
              <DialogDescription>
                Complete profile information from National ID database
              </DialogDescription>
            </DialogHeader>
            <NationalIdProfile profile={primaryProfile} />
          </DialogContent>
        </Dialog>
      )}

      {/* All Matches Dialog */}
      <Dialog open={isMatchesDialogOpen} onOpenChange={setIsMatchesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All National ID Matches</DialogTitle>
            <DialogDescription>
              Review and manage all potential National ID matches for this detection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {matches?.map((match) => (
              <NationalIdMatch
                key={match.id}
                match={match}
                onStatusChange={() => {
                  refetchMatches();
                }}
              />
            ))}

            {matches?.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No matches found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}