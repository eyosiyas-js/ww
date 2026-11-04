import { useQuery } from "@tanstack/react-query";
import { getCameras } from "@/api/services/cameraService";

export function useCameras() {
  return useQuery({
    queryKey: ["cameras"],
    queryFn: getCameras,
  });
}
