/**
 * Camera Service
 */

import { mockGet, mockPost, mockPut, mockDelete } from "../client";
import { API_ENDPOINTS } from "../config";
import { Camera } from "@/data/mockData";

export async function getCameras() {
  const response = await mockGet<Camera[]>(API_ENDPOINTS.cameras.list);
  return response.data;
}

export async function getCameraById(id: string) {
  const response = await mockGet<Camera>(API_ENDPOINTS.cameras.getById(id));
  return response.data;
}

export async function createCamera(payload: any) {
  const response = await mockPost<Camera>(API_ENDPOINTS.cameras.create, payload);
  return response.data;
}

export async function updateCamera(id: string, updates: any) {
  const response = await mockPut<Camera>(API_ENDPOINTS.cameras.update(id), updates);
  return response.data;
}

export async function deleteCamera(id: string) {
  const response = await mockDelete(API_ENDPOINTS.cameras.delete(id));
  return response.data;
}

export async function startCameraStream(id: string) {
  const response = await mockGet<any>(API_ENDPOINTS.cameras.stream(id));
  return response.data;
}

export async function toggleCameraAccess(cameraId: string, organizationId: string, hasAccess: boolean) {
  const response = await mockPost<any>(API_ENDPOINTS.cameras.access(cameraId), {
    organizationId,
    hasAccess
  });
  return response.data;
}

export async function getCameraAccessOrgs(cameraId: string) {
  const response = await mockGet<string[]>(API_ENDPOINTS.cameras.accessOrgs(cameraId));
  return response.data;
}
