import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Edit3,
  User,
  Zap,
  Search,
  Shield
} from "lucide-react";
import { DetectionNationalIdMatch } from "@/api/services/nationalIdService";
import { NationalIdProfile } from "./NationalIdProfile";
import { useUpdateNationalIdMatch } from "@/hooks/use-national-id";

interface NationalIdMatchProps {
  match: DetectionNationalIdMatch;
  showProfile?: boolean;
  onStatusChange?: (matchId: string, status: string, notes?: string) => void;
}

export function NationalIdMatch({ 
  match, 
  showProfile = true,
  onStatusChange 
}: NationalIdMatchProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState(match.status);
  const [editNotes, setEditNotes] = useState(match.verification_notes || "");
  
  const updateMatch = useUpdateNationalIdMatch();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "under_review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType.toLowerCase()) {
      case "face_recognition":
        return <User className="h-4 w-4" />;
      case "id_number":
        return <Shield className="h-4 w-4" />;
      case "manual_verification":
        return <Search className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "under_review":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await updateMatch.mutateAsync({
        matchId: match.id,
        updates: {
          status: editStatus,
          verification_notes: editNotes
        }
      });
      
      setIsEditOpen(false);
      
      if (onStatusChange) {
        onStatusChange(match.id, editStatus, editNotes);
      }
    } catch (error) {
      console.error("Failed to update match:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">
                {match.national_id_profile?.full_name || "Unknown Profile"}
              </CardTitle>
              <Badge className={getStatusColor(match.status)}>
                {getStatusIcon(match.status)}
                <span className="ml-1 capitalize">{match.status.replace("_", " ")}</span>
              </Badge>
            </div>
            
            <CardDescription>
              National ID: {match.national_id_profile?.national_id_number || "N/A"}
            </CardDescription>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                {getMatchTypeIcon(match.match_type)}
                <span className="capitalize">{match.match_type.replace("_", " ")}</span>
              </div>
              
              <Badge className={getConfidenceColor(match.confidence_score)} variant="outline">
                {match.confidence_score} Confidence
              </Badge>
              
              <span>
                {match.match_source === "mock_api" ? "Mock API" : 
                 match.match_source === "government_api" ? "Government API" : 
                 "Manual"}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {showProfile && match.national_id_profile && (
              <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>National ID Profile</DialogTitle>
                    <DialogDescription>
                      Complete profile information from National ID database
                    </DialogDescription>
                  </DialogHeader>
                  <NationalIdProfile profile={match.national_id_profile} />
                </DialogContent>
              </Dialog>
            )}
            
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Match Status</DialogTitle>
                  <DialogDescription>
                    Update the verification status and add notes for this National ID match.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Verification Notes</label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add notes about this match verification..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleStatusUpdate}
                      disabled={updateMatch.isPending}
                    >
                      {updateMatch.isPending ? "Updating..." : "Update Match"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Match Details */}
        {match.match_details && (
          <div>
            <h4 className="text-sm font-medium mb-2">Match Details</h4>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              {Object.entries(match.match_details).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="font-medium">
                    {typeof value === "number" ? value.toFixed(3) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Verification Notes */}
        {match.verification_notes && (
          <div>
            <h4 className="text-sm font-medium mb-2">Verification Notes</h4>
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              {match.verification_notes}
            </p>
          </div>
        )}
        
        <Separator />
        
        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Created: {formatDate(match.created_at)}</div>
          <div>Last Updated: {formatDate(match.updated_at)}</div>
          {match.verified_by_user_id && (
            <div>Verified by: {match.verified_by_user_id}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}