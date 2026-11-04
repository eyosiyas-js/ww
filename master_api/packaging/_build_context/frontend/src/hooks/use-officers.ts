import { useQuery } from "@tanstack/react-query";
import { getOfficers } from "@/api/services/officerService";

export function useOfficers() {
  return useQuery({
    queryKey: ["officers"],
    queryFn: getOfficers,
  });
}
