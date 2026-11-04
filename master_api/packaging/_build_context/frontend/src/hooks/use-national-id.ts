import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNationalIdProfiles,
  getNationalIdProfile,
  getNationalIdProfileByIdNumber,
  searchNationalId,
  getDetectionNationalIdMatches,
  getDetectionPrimaryNationalIdMatch,
  autoMatchDetectionToNationalId,
  updateNationalIdMatch,
  getDetectionWithNationalId,
  createDetectionNationalIdMatch,
  updateNationalIdProfile as updateProfileApi,
  deleteNationalIdProfile as deleteProfileApi,
  populateMockNationalIdData,
  configureRealNationalIdApi,
  switchToMockApi,
  type NationalIdSearchRequest,
  type DetectionWithNationalId,
  type NationalIdProfile,
  type DetectionNationalIdMatch
} from "@/api/services/nationalIdService";
import { toast } from "@/hooks/use-toast";

// Query hooks
export function useNationalIdProfiles(params?: {
  skip?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ["national-id-profiles", params],
    queryFn: () => getNationalIdProfiles(params),
  });
}

export function useNationalIdProfile(profileId: string, enabled = true) {
  return useQuery({
    queryKey: ["national-id-profile", profileId],
    queryFn: () => getNationalIdProfile(profileId),
    enabled: enabled && !!profileId,
  });
}

export function useNationalIdProfileByIdNumber(nationalIdNumber: string, enabled = true) {
  return useQuery({
    queryKey: ["national-id-profile-by-number", nationalIdNumber],
    queryFn: () => getNationalIdProfileByIdNumber(nationalIdNumber),
    enabled: enabled && !!nationalIdNumber,
  });
}

export function useDetectionNationalIdMatches(detectionId: string, enabled = true) {
  return useQuery({
    queryKey: ["detection-national-id-matches", detectionId],
    queryFn: () => getDetectionNationalIdMatches(detectionId),
    enabled: enabled && !!detectionId,
  });
}

export function useDetectionPrimaryNationalIdMatch(detectionId: string, enabled = true) {
  return useQuery({
    queryKey: ["detection-primary-national-id-match", detectionId],
    queryFn: () => getDetectionPrimaryNationalIdMatch(detectionId),
    enabled: enabled && !!detectionId,
  });
}

export function useDetectionWithNationalId(detectionId: string, enabled = true) {
  return useQuery({
    queryKey: ["detection-with-national-id", detectionId],
    queryFn: () => getDetectionWithNationalId(detectionId),
    enabled: enabled && !!detectionId,
  });
}

// Mutation hooks
export function useSearchNationalId() {
  return useMutation({
    mutationFn: (searchRequest: NationalIdSearchRequest) => searchNationalId(searchRequest),
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error.message || "Failed to search National ID database",
      });
    },
  });
}

export function useAutoMatchDetectionToNationalId() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (detectionId: string) => autoMatchDetectionToNationalId(detectionId),
    onSuccess: (data, detectionId) => {
      toast({
        title: "Auto-Match Completed",
        description: `Found ${data.matches_created} potential matches in ${data.search_time_ms}ms`,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["detection-national-id-matches", detectionId] });
      queryClient.invalidateQueries({ queryKey: ["detection-primary-national-id-match", detectionId] });
      queryClient.invalidateQueries({ queryKey: ["detection-with-national-id", detectionId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Auto-Match Failed",
        description: error.message || "Failed to automatically match detection to National ID",
      });
    },
  });
}

export function useUpdateNationalIdMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      updates
    }: {
      matchId: string;
      updates: {
        confidence_score?: string;
        match_type?: string;
        match_source?: string;
        match_details?: Record<string, any>;
        verification_notes?: string;
        status?: string;
      }
    }) => updateNationalIdMatch(matchId, updates),
    onSuccess: (data) => {
      toast({
        title: "Match Updated",
        description: "National ID match has been updated successfully",
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["detection-national-id-matches", data.detection_id] });
      queryClient.invalidateQueries({ queryKey: ["detection-primary-national-id-match", data.detection_id] });
      queryClient.invalidateQueries({ queryKey: ["detection-with-national-id", data.detection_id] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update National ID match",
      });
    },
  });
}

export function useCreateDetectionNationalIdMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      detectionId,
      matchData
    }: {
      detectionId: string;
      matchData: {
        national_id_profile_id: string;
        confidence_score: string;
        match_type: string;
        match_source: string;
        match_details?: Record<string, any>;
        verification_notes?: string;
        status?: string;
      }
    }) => createDetectionNationalIdMatch(detectionId, matchData),
    onSuccess: (data, { detectionId }) => {
      toast({
        title: "Match Created",
        description: "National ID match has been created successfully",
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["detection-national-id-matches", detectionId] });
      queryClient.invalidateQueries({ queryKey: ["detection-primary-national-id-match", detectionId] });
      queryClient.invalidateQueries({ queryKey: ["detection-with-national-id", detectionId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Failed to create National ID match",
      });
    },
  });
}

// Admin mutation hooks
export function usePopulateMockNationalIdData() {
  return useMutation({
    mutationFn: () => populateMockNationalIdData(),
    onSuccess: (data) => {
      toast({
        title: "Mock Data Populated",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Population Failed",
        description: error.message || "Failed to populate mock National ID data",
      });
    },
  });
}

export function useConfigureRealNationalIdApi() {
  return useMutation({
    mutationFn: ({ apiUrl, apiKey }: { apiUrl: string; apiKey: string }) =>
      configureRealNationalIdApi(apiUrl, apiKey),
    onSuccess: (data) => {
      toast({
        title: "API Configured",
        description: `Real National ID API configured: ${data.api_url}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Configuration Failed",
        description: error.message || "Failed to configure real National ID API",
      });
    },
  });
}

export function useSwitchToMockApi() {
  return useMutation({
    mutationFn: () => switchToMockApi(),
    onSuccess: (data) => {
      toast({
        title: "Switched to Mock API",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Switch Failed",
        description: error.message || "Failed to switch to mock API",
      });
    },
  });
}
export function useUpdateNationalIdProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, profileData }: { profileId: string; profileData: Partial<NationalIdProfile> }) => 
      updateProfileApi(profileId, profileData),
    onSuccess: () => {
      toast({ title: 'Profile Updated', description: 'National ID profile has been updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['national-id-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['national-id-profile'] });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Failed to update profile' });
    },
  });
}

export function useDeleteNationalIdProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => deleteProfileApi(profileId),
    onSuccess: () => {
      toast({ title: 'Profile Deleted', description: 'National ID profile has been deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['national-id-profiles'] });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message || 'Failed to delete profile' });
    },
  });
}
