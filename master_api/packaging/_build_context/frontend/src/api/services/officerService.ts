/**
 * Officer Service
 * 
 * Endpoints:
 * - GET /api/v1/officers → getOfficers()
 */

import { mockGet } from "../client";
import { API_ENDPOINTS } from "../config";
import { Officer } from "@/data/mockData";

export async function getOfficers() {
  const response = await mockGet<Officer[]>(API_ENDPOINTS.officers.list);
  return response.data;
}
