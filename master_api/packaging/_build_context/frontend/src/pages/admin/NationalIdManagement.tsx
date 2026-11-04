import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  IdCard, 
  Search, 
  Database, 
  Settings, 
  Users, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Server,
  Zap
} from "lucide-react";
import {
  useNationalIdProfiles,
  useSearchNationalId,
  usePopulateMockNationalIdData,
  useConfigureRealNationalIdApi,
  useSwitchToMockApi
} from "@/hooks/use-national-id";
import { NationalIdProfile } from "@/components/national-id/NationalIdProfile";
import { toast } from "@/hooks/use-toast";

export default function NationalIdManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"name" | "id_number">("name");
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { data: profiles, isLoading: profilesLoading, refetch: refetchProfiles } = useNationalIdProfiles();
  const searchMutation = useSearchNationalId();
  const populateMockData = usePopulateMockNationalIdData();
  const configureRealApi = useConfigureRealNationalIdApi();
  const switchToMock = useSwitchToMockApi();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        variant: "destructive",
        title: "Search Query Required",
        description: "Please enter a search query",
      });
      return;
    }

    try {
      const result = await searchMutation.mutateAsync({
        query_type: searchType,
        query_value: searchQuery.trim(),
        confidence_threshold: 0.7
      });

      if (result.success && result.matches.length > 0) {
        toast({
          title: "Search Completed",
          description: `Found ${result.matches.length} matches in ${result.search_time_ms}ms`,
        });
      } else {
        toast({
          title: "No Matches Found",
          description: result.message || "No profiles matched your search criteria",
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handlePopulateMockData = async () => {
    try {
      await populateMockData.mutateAsync();
      refetchProfiles();
    } catch (error) {
      console.error("Failed to populate mock data:", error);
    }
  };

  const handleConfigureRealApi = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please provide both API URL and API Key",
      });
      return;
    }

    try {
      await configureRealApi.mutateAsync({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim() });
      setApiUrl("");
      setApiKey("");
    } catch (error) {
      console.error("Failed to configure real API:", error);
    }
  };

  const handleSwitchToMock = async () => {
    try {
      await switchToMock.mutateAsync();
    } catch (error) {
      console.error("Failed to switch to mock API:", error);
    }
  };

  const viewProfile = (profile: any) => {
    setSelectedProfile(profile);
    setIsProfileDialogOpen(true);
  };

  return (
    <AppLayout title="National ID Management" subtitle="Manage National ID database integration and profiles">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        <Tabs defaultValue="profiles" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          {/* Profiles Tab */}
          <TabsContent value="profiles" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">National ID Profiles</h2>
                <p className="text-muted-foreground">
                  Browse and manage National ID profiles in the system
                </p>
              </div>
              <Button onClick={refetchProfiles} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {profilesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span>Loading profiles...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles?.map((profile) => (
                  <Card key={profile.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{profile.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{profile.national_id_number}</p>
                        </div>
                        <Badge variant={profile.status === "active" ? "default" : "secondary"}>
                          {profile.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        <div>{profile.gender} • {profile.nationality}</div>
                        <div>{profile.city}, {profile.region}</div>
                        {profile.occupation && <div>{profile.occupation}</div>}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => viewProfile(profile)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {profiles?.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <IdCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Profiles Found</h3>
                    <p className="text-muted-foreground mb-4">
                      No National ID profiles are currently in the system.
                    </p>
                    <Button onClick={handlePopulateMockData} disabled={populateMockData.isPending}>
                      {populateMockData.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4 mr-2" />
                      )}
                      Populate Mock Data
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Search Tab */}
          <TabsContent value="search" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Search National ID Database</h2>
              <p className="text-muted-foreground">
                Test the National ID search functionality
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Search Parameters
                </CardTitle>
                <CardDescription>
                  Search the National ID database by name or ID number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder={searchType === "name" ? "Enter name to search..." : "Enter National ID number..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as "name" | "id_number")}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="name">Search by Name</option>
                    <option value="id_number">Search by ID Number</option>
                  </select>
                  <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                    {searchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchMutation.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>
                    {searchMutation.data.success 
                      ? `Found ${searchMutation.data.total_matches} matches in ${searchMutation.data.search_time_ms}ms`
                      : "Search failed"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searchMutation.data.success ? (
                    <div className="space-y-4">
                      {searchMutation.data.matches.map((match, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{match.profile.full_name}</h3>
                              <p className="text-sm text-muted-foreground">{match.profile.national_id_number}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={match.confidence_score === "High" ? "default" : 
                                            match.confidence_score === "Medium" ? "secondary" : "outline"}>
                                {match.confidence_score} Confidence
                              </Badge>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => viewProfile(match.profile)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <div>Match Type: {match.match_type.replace("_", " ")}</div>
                            <div>{match.profile.city}, {match.profile.region}</div>
                          </div>
                        </div>
                      ))}
                      
                      {searchMutation.data.matches.length === 0 && (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No matches found for your search query</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {searchMutation.data.message || "Search failed"}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">National ID Integration Settings</h2>
              <p className="text-muted-foreground">
                Configure the National ID API integration
              </p>
            </div>

            {/* Mock Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Mock Data Management
                </CardTitle>
                <CardDescription>
                  Manage mock National ID data for development and testing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Mock data includes 100 realistic Ethiopian National ID profiles for testing purposes.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handlePopulateMockData} 
                  disabled={populateMockData.isPending}
                  className="w-full"
                >
                  {populateMockData.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  Populate Mock National ID Data
                </Button>
              </CardContent>
            </Card>

            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Real API Configuration
                </CardTitle>
                <CardDescription>
                  Configure connection to the real government National ID API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure these settings when the real government National ID API becomes available.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">API URL</label>
                    <Input
                      placeholder="https://api.nationalid.gov.et/v1"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">API Key</label>
                    <Input
                      type="password"
                      placeholder="Enter API key..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleConfigureRealApi} 
                    disabled={configureRealApi.isPending}
                    className="w-full"
                  >
                    {configureRealApi.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    Configure Real API
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Mode Switch */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  API Mode
                </CardTitle>
                <CardDescription>
                  Switch between mock and real API modes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Current Mode: Mock API</h3>
                    <p className="text-sm text-muted-foreground">
                      Using simulated National ID data for development
                    </p>
                  </div>
                  <Badge variant="secondary">Mock</Badge>
                </div>
                
                <Button 
                  onClick={handleSwitchToMock} 
                  disabled={switchToMock.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {switchToMock.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Switch to Mock API
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Profile View Dialog */}
        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>National ID Profile</DialogTitle>
              <DialogDescription>
                Complete profile information from National ID database
              </DialogDescription>
            </DialogHeader>
            {selectedProfile && <NationalIdProfile profile={selectedProfile} />}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}