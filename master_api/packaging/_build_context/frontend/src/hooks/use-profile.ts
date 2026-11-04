import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, UserProfile } from "@/api/services/profileService";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<UserProfile>) => updateProfile(updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}
