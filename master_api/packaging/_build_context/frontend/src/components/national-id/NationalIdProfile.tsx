import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  Shield, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  IdCard
} from "lucide-react";
import { NationalIdProfile as NationalIdProfileType } from "@/api/services/nationalIdService";
import { getMediaUrl } from "@/api/config";

interface NationalIdProfileProps {
  profile: NationalIdProfileType;
  showActions?: boolean;
  onVerify?: () => void;
  onEdit?: () => void;
  compact?: boolean;
}

export function NationalIdProfile({ 
  profile, 
  showActions = false, 
  onVerify, 
  onEdit,
  compact = false 
}: NationalIdProfileProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "suspended":
        return "bg-red-100 text-red-800 border-red-200";
      case "deceased":
        return "bg-black text-white border-black";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={profile.profile_photo_url ? getMediaUrl(profile.profile_photo_url) : undefined} 
                alt={profile.full_name} 
              />
              <AvatarFallback className="bg-primary/10">
                {profile.first_name[0]}{profile.last_name[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold truncate">{profile.full_name}</h3>
                <Badge className={getStatusColor(profile.status)}>
                  {profile.status}
                </Badge>
              </div>
              
              <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <IdCard className="h-4 w-4" />
                  <span>{profile.national_id_number}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(profile.date_of_birth)} ({calculateAge(profile.date_of_birth)} years)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.city}, {profile.region}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage 
                src={profile.profile_photo_url ? getMediaUrl(profile.profile_photo_url) : undefined} 
                alt={profile.full_name} 
              />
              <AvatarFallback className="bg-primary/10 text-lg">
                {profile.first_name[0]}{profile.last_name[0]}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
              <CardDescription className="text-lg mt-1">
                National ID: {profile.national_id_number}
              </CardDescription>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getStatusColor(profile.status)}>
                  {profile.status}
                </Badge>
                {profile.is_verified && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {showActions && (
            <div className="flex space-x-2">
              {onVerify && !profile.is_verified && (
                <Button variant="outline" size="sm" onClick={onVerify}>
                  <Shield className="h-4 w-4 mr-2" />
                  Verify
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-sm">{profile.full_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Gender</label>
              <p className="text-sm">{profile.gender}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
              <p className="text-sm">{formatDate(profile.date_of_birth)} ({calculateAge(profile.date_of_birth)} years old)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nationality</label>
              <p className="text-sm">{profile.nationality}</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p className="text-sm">{profile.address || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Region</label>
              <p className="text-sm">{profile.region || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">City</label>
              <p className="text-sm">{profile.city || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
              <p className="text-sm">{profile.phone_number || "N/A"}</p>
            </div>
            {profile.email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{profile.email}</p>
              </div>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Professional Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Briefcase className="h-5 w-5 mr-2" />
            Professional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Occupation</label>
              <p className="text-sm">{profile.occupation || "N/A"}</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Official Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Official Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
              <p className="text-sm">{formatDate(profile.registration_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
              <p className="text-sm">{formatDate(profile.expiry_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Issuing Authority</label>
              <p className="text-sm">{profile.issuing_authority || "N/A"}</p>
            </div>
          </div>
        </div>
        
        {/* Emergency Contact */}
        {profile.emergency_contact_name && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{profile.emergency_contact_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-sm">{profile.emergency_contact_phone || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                  <p className="text-sm">{profile.emergency_contact_relationship || "N/A"}</p>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Additional Information */}
        {profile.additional_info && Object.keys(profile.additional_info).length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(profile.additional_info).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </label>
                    <p className="text-sm">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {/* System Information */}
        <Separator />
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>Created: {formatDate(profile.created_at)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>Last Updated: {formatDate(profile.updated_at)}</span>
          </div>
          {profile.verification_date && (
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-3 w-3" />
              <span>Verified: {formatDate(profile.verification_date)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}