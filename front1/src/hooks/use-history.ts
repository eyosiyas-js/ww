import { useQuery } from "@tanstack/react-query";
import { getHistory } from "@/api/services/historyService";

export function useHistory() {
  return useQuery({
    queryKey: ["history"],
    queryFn: getHistory,
  });
}
