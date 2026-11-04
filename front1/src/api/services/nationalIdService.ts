/**
 * National ID Service
 * 
 * Endpoints:
 * - GET  /api/v1/national-id/profiles                    → getNationalIdProfiles()
 * - GET  /api/v1/national-id/profiles/{id}               → getNationalIdProfile()
 * - POST /api/v1/national-id/search                      → searchNationalId()
 * - GET  /api/v1/national-id/detections/{id}/matches     → getDetectionNationalIdMatches()
 * - POST /api/v1/national-id/detections/{id}/auto-match  → autoMatchDetectionToNationalId()
 * - PUT  /api/v1/national-id/matches/{id}                → updateNationalIdMatch()
 * - GET  /api/v1/national-id/detections/{id}/with-national-id → getDetectionWithNationalId()
 */

import { mockGet, mockPost, mockPut, mockDelete } from "../client";
import { API_ENDPOINTS, API_BASE_URL } from "../config";

// Types
export interface NationalIdProfile {
  id: string;
  national_id_number: string;
  full_name: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  address?: string;
  region?: string;
  city?: string;
  phone_number?: string;
  email?: string;
  occupation?: string;
  status: string;
  registration_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  profile_photo_url?: string;
  additional_info?: Record<string, any>;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  verification_date?: string;
}

export interface DetectionNationalIdMatch {
  id: string;
  detection_id: string;
  national_id_profile_id: string;
  confidence_score: string; // "High", "Medium", "Low"
  match_type: string; // "face_recognition", "manual_verification", "id_number"
  match_source: string; // "mock_api", "government_api", "manual"
  match_details?: Record<string, any>;
  verification_notes?: string;
  status: string; // "pending", "confirmed", "rejected", "under_review"
  verified_by_user_id?: string;
  created_at: string;
  updated_at: string;
  national_id_profile?: NationalIdProfile;
}

export interface NationalIdSearchRequest {
  query_type: "id_number" | "face_embedding" | "name";
  query_value: string;
  confidence_threshold?: number;
}

export interface NationalIdSearchResponse {
  success: boolean;
  matches: Array<{
    profile: NationalIdProfile;
    confidence_score: string;
    match_type: string;
    match_details: Record<string, any>;
  }>;
  total_matches: number;
  search_time_ms: number;
  message?: string;
}

export interface DetectionWithNationalId {
  id: string;
  category: string;
  name: string;
  description?: string;
  age?: string;
  location?: string;
  subcategory?: string;
  crime_type?: string;
  image_urls: string[];
  status: string;
  created_at: string;
  updated_at: string;
  national_id_matches: DetectionNationalIdMatch[];
  primary_national_id?: NationalIdProfile;
  has_national_id_match: boolean;
}

// API Functions
export async function getNationalIdProfiles(params?: {
  skip?: number;
  limit?: number;
  status?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.skip) queryParams.append("skip", params.skip.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.status) queryParams.append("status", params.status);

  // Use public endpoint for testing
  const url = `${API_BASE_URL}/public/national-id/profiles${queryParams.toString() ? `?${queryParams}` : ""}`;
  const response = await mockGet<NationalIdProfile[]>(url);
  return response.data;
}

export async function getNationalIdProfile(profileId: string) {
  const response = await mockGet<NationalIdProfile>(API_ENDPOINTS.nationalId.profileById(profileId));
  return response.data;
}

export async function getNationalIdProfileByIdNumber(nationalIdNumber: string) {
  const response = await mockGet<NationalIdProfile>(API_ENDPOINTS.nationalId.profileByIdNumber(nationalIdNumber));
  return response.data;
}

export async function updateNationalIdProfile(profileId: string, profileData: Partial<NationalIdProfile>) {
  const response = await mockPut<NationalIdProfile>(API_ENDPOINTS.nationalId.profileById(profileId), profileData);
  return response.data;
}

export async function deleteNationalIdProfile(profileId: string) {
  const response = await mockDelete(API_ENDPOINTS.nationalId.profileById(profileId));
  return response.data;
}

export async function searchNationalId(searchRequest: NationalIdSearchRequest) {
  const response = await mockPost<NationalIdSearchResponse>(API_ENDPOINTS.nationalId.search, searchRequest);
  return response.data;
}

export async function getDetectionNationalIdMatches(detectionId: string) {
  // Use public endpoint for testing
  const response = await mockGet<DetectionNationalIdMatch[]>(`${API_BASE_URL}/public/national-id/detections/${detectionId}/matches`);
  return response.data;
}

export async function getDetectionPrimaryNationalIdMatch(detectionId: string) {
  const response = await mockGet<DetectionNationalIdMatch | null>(API_ENDPOINTS.nationalId.detectionPrimaryMatch(detectionId));
  return response.data;
}

export async function autoMatchDetectionToNationalId(detectionId: string) {
  const response = await mockPost<{
    success: boolean;
    message: string;
    matches_created: number;
    search_time_ms: number;
  }>(API_ENDPOINTS.nationalId.detectionAutoMatch(detectionId), {});
  return response.data;
}

export async function updateNationalIdMatch(
  matchId: string,
  updates: {
    confidence_score?: string;
    match_type?: string;
    match_source?: string;
    match_details?: Record<string, any>;
    verification_notes?: string;
    status?: string;
  }
) {
  const response = await mockPut<DetectionNationalIdMatch>(API_ENDPOINTS.nationalId.updateMatch(matchId), updates);
  return response.data;
}

export async function getDetectionWithNationalId(detectionId: string) {
  const response = await mockGet<DetectionWithNationalId>(API_ENDPOINTS.nationalId.detectionWithNationalId(detectionId));
  return response.data;
}

export async function createDetectionNationalIdMatch(
  detectionId: string,
  matchData: {
    national_id_profile_id: string;
    confidence_score: string;
    match_type: string;
    match_source: string;
    match_details?: Record<string, any>;
    verification_notes?: string;
    status?: string;
  }
) {
  const response = await mockPost<DetectionNationalIdMatch>(
    API_ENDPOINTS.nationalId.createMatch(detectionId),
    matchData
  );
  return response.data;
}

// Admin functions
export async function populateMockNationalIdData() {
  // Use public endpoint for testing
  const response = await mockPost<{ success: boolean; message: string }>(`${API_BASE_URL}/public/national-id/populate-mock-data`, {});
  return response.data;
}

export async function configureRealNationalIdApi(apiUrl: string, apiKey: string) {
  const response = await mockPost<{ success: boolean; message: string; api_url: string }>(
    API_ENDPOINTS.nationalId.configureRealApi,
    { api_url: apiUrl, api_key: apiKey }
  );
  return response.data;
}

export async function switchToMockApi() {
  const response = await mockPost<{ success: boolean; message: string }>(API_ENDPOINTS.nationalId.switchToMock, {});
  return response.data;
}