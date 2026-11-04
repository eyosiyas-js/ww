import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWeaponDetections,
  simulateWeaponDetection,
  SimulateWeaponDetectionPayload
} from "@/api/services/weaponDetectionService";

export function useWeaponDetections() {
  return useQuery({
    queryKey: ["weaponDetections"],
    queryFn: getWeaponDetections,
    refetchInterval: 5000, // Poll every 5 seconds for simulation updates
  });
}

export function useSimulateWeaponDetection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SimulateWeaponDetectionPayload) => simulateWeaponDetection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weaponDetections"] });
    },
  });
}
