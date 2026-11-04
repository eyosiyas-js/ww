import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { User, Mail, Phone, Shield, Bell, Lock, Camera, Save, Edit2 } from "lucide-react";
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
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="outline" className="gap-1"><Shield className="w-3 h-3" />{displayProfile.badge}</Badge>
                  <Badge variant="secondary">{displayProfile.unit}</Badge>
                </div>
                <div className="status-indicator status-online mx-auto mt-4" />
                <p className="text-xs text-muted-foreground mt-1">Online</p>
              </div>
              <Separator className="my-6" />
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">{displayProfile.email}</span></div>
                <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">{displayProfile.phone}</span></div>
                <div className="flex items-center gap-3 text-sm"><Camera className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Member since {displayProfile.joinDate ? new Date(displayProfile.joinDate).toLocaleDateString() : "N/A"}</span></div>
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
                <div className="space-y-2"><Label htmlFor="unit">Unit</Label><Input id="unit" value={displayProfile.unit} disabled className="bg-muted/50" /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "detectionAlerts", label: "Detection Alerts", desc: "Get notified when a match is found" },
                { key: "systemAlerts", label: "System Alerts", desc: "Camera offline and system warnings" },
                { key: "emailNotifications", label: "Email Notifications", desc: "Send copies to your email" },
                { key: "smsNotifications", label: "SMS Notifications", desc: "Receive critical alerts via SMS" },
              ].map((item, i) => (
                <div key={item.key}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium">{item.label}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                    <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [item.key]: checked }))} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-primary" />Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="font-medium">Change Password</p><p className="text-sm text-muted-foreground">Update your account password</p></div><Button variant="outline" size="sm">Change</Button></div>
              <Separator />
              <div className="flex items-center justify-between"><div><p className="font-medium">Two-Factor Authentication</p><p className="text-sm text-muted-foreground">Add an extra layer of security</p></div><Badge variant="outline" className="text-success border-success/50">Enabled</Badge></div>
              <Separator />
              <div className="flex items-center justify-between"><div><p className="font-medium">Active Sessions</p><p className="text-sm text-muted-foreground">Manage your active login sessions</p></div><Button variant="outline" size="sm">View</Button></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
