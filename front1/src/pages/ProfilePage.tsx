import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Save, Edit2 } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { toast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { data: profileData } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "", email: "", phone: "", badge: "", unit: "", role: "", joinDate: "", avatar: "",
  });
  const [initialized, setInitialized] = useState(false);
  const [notifications, setNotifications] = useState({
    detectionAlerts: true, systemAlerts: true, emailNotifications: false, smsNotifications: true,
  });

  if (!initialized && profileData) {
    setProfile(profileData);
    setInitialized(true);
  }

  const displayProfile = initialized ? profile : profileData || profile;

  const handleSave = () => {
    updateProfileMutation.mutate(profile, {
      onSuccess: () => {
        toast({ title: "Profile Updated", description: "Your profile changes have been saved." });
        setIsEditing(false);
      },
    });
  };

  return (
    <AppLayout title="Profile" subtitle="Manage your account settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={displayProfile.avatar} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">{displayProfile.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{displayProfile.name}</h2>
                <p className="text-muted-foreground">{displayProfile.role}</p>
                <div className="status-indicator status-online mx-auto mt-4" />
                <p className="text-xs text-muted-foreground mt-1">Online</p>
              </div>
              <Separator className="my-6" />
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">{displayProfile.email}</span></div>
                <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">{displayProfile.phone}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" />Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </div>
                <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="gap-2">
                  {isEditing ? <><Save className="w-4 h-4" />Save Changes</> : <><Edit2 className="w-4 h-4" />Edit</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={profile.name || displayProfile.name} onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))} disabled={!isEditing} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={profile.email || displayProfile.email} onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))} disabled={!isEditing} /></div>
                <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={profile.phone || displayProfile.phone} onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))} disabled={!isEditing} /></div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
