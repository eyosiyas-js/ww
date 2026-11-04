import { mockGet, mockPost } from "../client";
import { API_ENDPOINTS } from "../config";

export interface WeaponDetection {
  id: string;
  weaponType: string;
  description?: string;
  confidence: number;
  imageUrl?: string;
  cameraId: string;
  cameraName?: string;
  organizationId?: string;
  assignedCompanyName?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getWeaponDetections() {
  const response = await mockGet<WeaponDetection[]>(API_ENDPOINTS.weaponDetections.list);
  return response.data;
}

export interface SimulateWeaponDetectionPayload {
  weaponType: string;
  confidence: number;
  cameraId: string;
  imageFile: File;
}

export async function simulateWeaponDetection(payload: SimulateWeaponDetectionPayload) {
  // The backend expects weapon_type, confidence, camera_id in multipart/form-data
  const formData = new FormData();
  formData.append("weapon_type", payload.weaponType);
  formData.append("confidence", payload.confidence.toString());
  formData.append("camera_id", payload.cameraId);
  formData.append("image", payload.imageFile);

  const response = await mockPost<WeaponDetection>(API_ENDPOINTS.weaponDetections.simulate, formData);
  return response.data;
}
