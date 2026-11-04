import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockGet, mockPost, mockPut } from "@/api/client";
import { API_ENDPOINTS } from "@/api/config";
import type { VehicleRegistration, DetectionVehicleMatch } from "@/types/vehicle-registration";

// Fetch vehicle registration matches for a detection
export function useDetectionVehicleMatches(detectionId: string, enabled: boolean = true) {
  return useQuery<DetectionVehicleMatch[]>({
    queryKey: ["detection-vehicle-matches", detectionId],
    queryFn: async () => {
      const response = await mockGet<DetectionVehicleMatch[]>(
        API_ENDPOINTS.vehicleRegistration.detectionMatches(detectionId)
      );
      return response.data;
    },
    enabled: enabled && !!detectionId,
  });
}

// Fetch primary vehicle registration match for a detection
export function useDetectionPrimaryVehicleMatch(detectionId: string, enabled: boolean = true) {
  return useQuery<DetectionVehicleMatch | null>({
    queryKey: ["detection-primary-vehicle-match", detectionId],
    queryFn: async () => {
      const response = await mockGet<DetectionVehicleMatch | null>(
        API_ENDPOINTS.vehicleRegistration.detectionPrimaryMatch(detectionId)
      );
      return response.data;
    },
    enabled: enabled && !!detectionId,
  });
}

// Fetch vehicle registration by plate number
export function useVehicleByPlate(plateNumber: string, enabled: boolean = true) {
  return useQuery<VehicleRegistration | null>({
    queryKey: ["vehicle-by-plate", plateNumber],
    queryFn: async () => {
      try {
        const response = await mockGet<VehicleRegistration>(
          API_ENDPOINTS.vehicleRegistration.registrationByPlate(plateNumber)
        );
        return response.data;
      } catch (error) {
        return null;
      }
    },
    enabled: enabled && !!plateNumber,
    retry: false,
  });
}

// Auto-match detection to vehicle registration
export function useAutoMatchDetectionToVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (detectionId: string) => {
      const response = await mockPost<{
        success: boolean;
        message: string;
        matches_created: number;
        search_time_ms: number;
      }>(API_ENDPOINTS.vehicleRegistration.detectionAutoMatch(detectionId));
      return response.data;
    },
    onSuccess: (_, detectionId) => {
      queryClient.invalidateQueries({ queryKey: ["detection-vehicle-matches", detectionId] });
      queryClient.invalidateQueries({ queryKey: ["detection-primary-vehicle-match", detectionId] });
    },
  });
}

// Update vehicle match status
export function useUpdateVehicleMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, status, notes }: { matchId: string; status: string; notes?: string }) => {
      const response = await mockPut<DetectionVehicleMatch>(
        API_ENDPOINTS.vehicleRegistration.updateMatch(matchId),
        {
          status,
          verification_notes: notes,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["detection-vehicle-matches", data.detection_id] });
      queryClient.invalidateQueries({ queryKey: ["detection-primary-vehicle-match", data.detection_id] });
    },
  });
}

// Populate mock vehicle data
export function usePopulateMockVehicleData() {
  return useMutation({
    mutationFn: async () => {
      const response = await mockPost<{ success: boolean; message: string }>(
        API_ENDPOINTS.vehicleRegistration.populateMockData
      );
      return response.data;
    },
  });
}
