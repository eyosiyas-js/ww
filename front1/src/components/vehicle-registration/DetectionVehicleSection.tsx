import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Car,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  RefreshCw
} from "lucide-react";
import {
  useDetectionVehicleMatches,
  useDetectionPrimaryVehicleMatch,
  useAutoMatchDetectionToVehicle,
  useVehicleByPlate
} from "@/hooks/use-vehicle-registration";
import { VehicleMatch } from "./VehicleMatch";
import { VehicleProfile } from "./VehicleProfile";

interface DetectionVehicleSectionProps {
  detectionId: string;
  detectionCategory: string;
  plateNumber?: string;
  className?: string;
}

export function DetectionVehicleSection({
  detectionId,
  detectionCategory,
  plateNumber,
  className = ""
}: DetectionVehicleSectionProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isMatchesDialogOpen, setIsMatchesDialogOpen] = useState(false);

  const {
    data: matches,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches
  } = useDetectionVehicleMatches(detectionId, detectionCategory === "vehicle");

  const {
    data: primaryMatch,
    isLoading: primaryLoading
  } = useDetectionPrimaryVehicleMatch(detectionId, detectionCategory === "vehicle");

  // Fallback: Check for registration by plate if no primary match exists
  const {
    data: directVehicle,
    isLoading: directLoading
  } = useVehicleByPlate(plateNumber || "", detectionCategory === "vehicle" && !primaryMatch);

  const autoMatch = useAutoMatchDetectionToVehicle();

  // Don't show for non-vehicle detections
  if (detectionCategory !== "vehicle") {
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

  const hasMatches = matches && matches.length > 0;
  const confirmedMatch = matches?.find(m => m.status === "confirmed");
  const primaryVehicle = confirmedMatch?.vehicle_registration || primaryMatch?.vehicle_registration || directVehicle;

  return (
    <Card className={className}>
      <CardHeader className="pb-8 border-b border-border/40 mb-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 text-primary">
              <Car className="h-6 w-6" />
              <CardTitle className="text-2xl font-semibold text-foreground">Vehicle Details</CardTitle>
            </div>

            <CardDescription className="text-base text-muted-foreground">
              {confirmedMatch ? (
                "Verified vehicle match confirmed and linked to this detection."
              ) : directVehicle ? (
                "Direct registration match found in Transport Bureau database for this plate number."
              ) : hasMatches ? (
                `Found ${matches.length} potential vehicle registration match${matches.length !== 1 ? "es" : ""} in the Transport Bureau database.`
              ) : (
                "No vehicle registration matches found. Click Auto-Match to search the Transport Bureau database."
              )}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="default"
              onClick={handleAutoMatch}
              disabled={autoMatch.isPending}
              className="h-11 px-6 shadow-sm"
            >
              {autoMatch.isPending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Search className="h-5 w-5 mr-2" />
              )}
              Auto-Match
            </Button>

            {hasMatches && (
              <Button
                variant="secondary"
                onClick={() => setIsMatchesDialogOpen(true)}
                className="h-11 px-6 shadow-sm"
              >
                <Eye className="h-5 w-5 mr-2" />
                View All ({matches.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {matchesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading vehicle registration matches...</span>
          </div>
        )}

        {matchesError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load vehicle registration matches. This might be because:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You need to be logged in to access Transport Bureau data</li>
                <li>The backend server needs to be restarted to load new endpoints</li>
                <li>Mock vehicle data hasn't been populated yet</li>
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
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!matchesLoading && !matchesError && (
          <>
            {/* Primary/Confirmed Match */}
            {primaryVehicle && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium flex items-center">
                    {confirmedMatch ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                        Confirmed Vehicle
                      </>
                    ) : (
                      <>
                        <Car className="h-4 w-4 mr-2 text-blue-600" />
                        Primary Match
                      </>
                    )}
                  </h3>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsProfileDialogOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Profile
                  </Button>
                </div>

                <VehicleProfile vehicle={primaryVehicle} compact />

                {confirmedMatch && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-green-800">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Vehicle Confirmed</span>
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
            {!primaryVehicle && !hasMatches && !matchesLoading && (
              <div className="text-center py-8">
                <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Vehicle Registration Matches</h3>
                <p className="text-muted-foreground mb-4">
                  This vehicle detection has not been matched to any Transport Bureau records.
                </p>
                <Button onClick={handleAutoMatch} disabled={autoMatch.isPending}>
                  {autoMatch.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search Transport Bureau Database
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
      {primaryVehicle && (
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vehicle Registration Details</DialogTitle>
              <DialogDescription>
                Complete vehicle information from Transport Bureau database
              </DialogDescription>
            </DialogHeader>
            <VehicleProfile vehicle={primaryVehicle} />
          </DialogContent>
        </Dialog>
      )}

      {/* All Matches Dialog */}
      <Dialog open={isMatchesDialogOpen} onOpenChange={setIsMatchesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Vehicle Registration Matches</DialogTitle>
            <DialogDescription>
              Review and manage all potential vehicle registration matches for this detection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {matches?.map((match) => (
              <VehicleMatch
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
