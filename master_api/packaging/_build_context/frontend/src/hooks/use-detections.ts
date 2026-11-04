import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDetections,
  createDetection,
  updateDetection,
  deleteDetection,
  handleDetectionAction,
  CreateDetectionPayload,
  UpdateDetectionPayload,
  DetectionActionPayload
} from "@/api/services/detectionService";

export function useDetections() {
  return useQuery({
    queryKey: ["detections"],
    queryFn: getDetections,
  });
}

export function useCreateDetection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDetectionPayload) => createDetection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detections"] });
    },
  });
}

export function useUpdateDetection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDetectionPayload) => updateDetection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detections"] });
    },
  });
}

export function useDeleteDetection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDetection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detections"] });
    },
  });
}

export function useDetectionAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DetectionActionPayload) => handleDetectionAction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detections"] });
    },
  });
}
