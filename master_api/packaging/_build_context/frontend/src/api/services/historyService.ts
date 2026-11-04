/**
 * History Service
 * 
 * Endpoints:
 * - GET /api/v1/history → getHistory()
 */

import { mockGet } from "../client";
import { API_ENDPOINTS } from "../config";

export interface HistoryItem {
  id: string;
  type: "detection";
  title: string;
  category: string;
  status: string;
  timestamp: string;
  description: string;
}

export async function getHistory() {
  const response = await mockGet<HistoryItem[]>(API_ENDPOINTS.history.list);
  return response.data;
}
