/**
 * Profile Service
 * 
 * Endpoints:
 * - GET   /api/v1/profile   → getProfile()
 * - PATCH /api/v1/profile   → updateProfile()
 */

import { mockGet, mockPatch } from "../client";
import { API_ENDPOINTS } from "../config";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  badge: string;
  unit: string;
  role: string;
  joinDate: string;
  avatar: string;
}

export async function getProfile() {
  const response = await mockGet<UserProfile>(API_ENDPOINTS.profile.get);
  return response.data;
}

export async function updateProfile(updates: Partial<UserProfile>) {
  const response = await mockPatch<UserProfile>(API_ENDPOINTS.profile.update, updates);
  return response.data;
}

export async function updateUsername(new_username: string) {
  const response = await mockPatch<any>(API_ENDPOINTS.profile.updateUsername, { new_username });
  return response.data;
}

export async function updatePassword(current_password: string, new_password: string) {
  const response = await mockPatch<any>(API_ENDPOINTS.profile.updatePassword, { current_password, new_password });
  return response.data;
}
