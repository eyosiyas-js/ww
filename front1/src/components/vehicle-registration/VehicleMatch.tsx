import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { 
  CheckCircle2, 
  XCircle, 

  Eye,
  MessageSquare
} from "lucide-react";
import type { DetectionVehicleMatch } from "@/types/vehicle-registration";
import { VehicleProfile } from "./VehicleProfile";
import { useUpdateVehicleMatch } from "@/hooks/use-vehicle-registration";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VehicleMatchProps {
  match: DetectionVehicleMatch;
  onStatusChange?: () => void;
}

export function VehicleMatch({ match, onStatusChange }: VehicleMatchProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notes, setNotes] = useState(match.verification_notes || "");
  const [showNotes, setShowNotes] = useState(false);
  
  const updateMatch = useUpdateVehicleMatch();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateMatch.mutateAsync({
        matchId: match.id,
        status: newStatus,
        notes: notes || undefined,
      });
      toast({
        title: "Match Updated",
        description: `Vehicle match ${newStatus} successfully`,
      });
      onStatusChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update vehicle match",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      case "under_review":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!match.vehicle_registration) {
    return null;
  }

  const vehicle = match.vehicle_registration;

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className={`pb-3 ${getStatusColor(match.status)}`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {vehicle.vehicle_make} {vehicle.vehicle_model}
              <Badge variant="outline" className="ml-2">
                {vehicle.plate_number}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getConfidenceColor(match.confidence_score)}>
                {match.confidence_score} Confidence
              </Badge>
              <Badge variant="outline" className="capitalize">
                {match.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4 space-y-4">

          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Owner:</span>
              <p className="font-medium">{vehicle.owner_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Year:</span>
              <p className="font-medium">{vehicle.vehicle_year}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Color:</span>
              <p className="font-medium">{vehicle.vehicle_color}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium">{vehicle.vehicle_type}</p>
            </div>
          </div>

          {/* Match Details */}
          <div className="text-sm space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match Type:</span>
              <span className="font-medium capitalize">{match.match_type.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match Source:</span>
              <span className="font-medium capitalize">{match.match_source.replace("_", " ")}</span>
            </div>
          </div>

          {/* Notes Section */}
          {(showNotes || match.verification_notes) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this match..."
                className="min-h-[80px]"
                disabled={match.status === "confirmed" || match.status === "rejected"}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProfileOpen(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full Profile
            </Button>

            {match.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showNotes ? "Hide" : "Add"} Notes
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleStatusChange("confirmed")}
                  disabled={updateMatch.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Match
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleStatusChange("rejected")}
                  disabled={updateMatch.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Match
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Registration Details</DialogTitle>
            <DialogDescription>
              Complete vehicle information from Transport Bureau database
            </DialogDescription>
          </DialogHeader>
          <VehicleProfile vehicle={vehicle} />
        </DialogContent>
      </Dialog>
    </>
  );
}
