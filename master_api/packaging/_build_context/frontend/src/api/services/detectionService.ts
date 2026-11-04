/**
 * Detection Service
 * 
 * Endpoints:
 * - GET  /api/v1/detections       → getDetections()
 * - POST /api/v1/detections       → createDetection()
 * - PUT  /api/v1/detections/:id   → updateDetection()
 * - DEL  /api/v1/detections/:id   → deleteDetection()
 */

import { mockGet, mockPost, mockPut, mockDelete } from "../client";
import { API_ENDPOINTS } from "../config";
import { DetectionRequest } from "@/data/mockData";

export async function getDetections() {
  const response = await mockGet<DetectionRequest[]>(API_ENDPOINTS.detections.list);
  return response.data;
}

export interface CreateDetectionPayload {
  category: "person" | "vehicle";
  name: string;
  description: string;
  age?: string;
  location?: string;
  subcategory?: "missing_person" | "criminal";
  crimeType?: string;
  cameraId?: string;
  imageFiles?: File[];
  formTemplateId?: string;
  dynamicData?: Record<string, any>;
  eligibleForAssignment?: boolean;
  plateNumber?: string;
  code?: string;
  region?: string;
}

export async function createDetection(payload: CreateDetectionPayload) {
  const formData = new FormData();
  formData.append("category", payload.category);
  formData.append("name", payload.name);
  formData.append("description", payload.description);
  if (payload.age) formData.append("age", payload.age);
  if (payload.location) formData.append("location", payload.location);
  if (payload.subcategory) formData.append("subcategory", payload.subcategory);
  if (payload.crimeType) formData.append("crimeType", payload.crimeType);
  if (payload.cameraId) formData.append("cameraId", payload.cameraId);
  if (payload.formTemplateId) formData.append("formTemplateId", payload.formTemplateId);
  if (payload.dynamicData) formData.append("dynamicData", JSON.stringify(payload.dynamicData));
  if (payload.eligibleForAssignment !== undefined) formData.append("eligibleForAssignment", payload.eligibleForAssignment ? "true" : "false");
  if (payload.plateNumber) formData.append("plateNumber", payload.plateNumber);
  if (payload.code) formData.append("code", payload.code);
  if (payload.region) formData.append("region", payload.region);
  if (payload.imageFiles && payload.imageFiles.length > 0) {
    payload.imageFiles.forEach(file => {
      formData.append("imageFiles", file);
    });
  }

  const response = await mockPost<DetectionRequest>(API_ENDPOINTS.detections.create, formData);
  return response.data;
}

export interface UpdateDetectionPayload extends Partial<CreateDetectionPayload> {
  id: string;
  status?: string;
  cameraId?: string;
  eligibleForAssignment?: boolean;
  plateNumber?: string;
  code?: string;
  region?: string;
}

export async function updateDetection(payload: UpdateDetectionPayload) {
  const { id, ...rest } = payload;
  const formData = new FormData();
  if (rest.category) formData.append("category", rest.category);
  if (rest.name) formData.append("name", rest.name);
  if (rest.description) formData.append("description", rest.description);
  if (rest.age) formData.append("age", rest.age);
  if (rest.location) formData.append("location", rest.location);
  if (rest.subcategory) formData.append("subcategory", rest.subcategory);
  if (rest.crimeType) formData.append("crimeType", rest.crimeType);
  if (rest.status) formData.append("status", rest.status);
  if (rest.cameraId) formData.append("cameraId", rest.cameraId);
  if (rest.formTemplateId) formData.append("formTemplateId", rest.formTemplateId);
  if (rest.dynamicData) formData.append("dynamicData", JSON.stringify(rest.dynamicData));
  if (rest.eligibleForAssignment !== undefined) formData.append("eligibleForAssignment", rest.eligibleForAssignment ? "true" : "false");
  if (rest.plateNumber) formData.append("plateNumber", rest.plateNumber);
  if (rest.code) formData.append("code", rest.code);
  if (rest.region) formData.append("region", rest.region);
  if (rest.imageFiles && rest.imageFiles.length > 0) {
    rest.imageFiles.forEach(file => {
      formData.append("imageFiles", file);
    });
  }

  const response = await mockPut<DetectionRequest>(API_ENDPOINTS.detections.update(id), formData);
  return response.data;
}

export async function deleteDetection(id: string) {
  const response = await mockDelete(API_ENDPOINTS.detections.delete(id));
  return response.data;
}

export interface DetectionActionPayload {
  id: string;
  status: "in_progress" | "resolved" | "failed";
  notes?: string;
  proofFiles?: File[];
}

export async function handleDetectionAction(payload: DetectionActionPayload) {
  const { id, ...rest } = payload;
  const formData = new FormData();
  formData.append("status", rest.status);
  if (rest.notes) formData.append("notes", rest.notes);
  if (rest.proofFiles && rest.proofFiles.length > 0) {
    rest.proofFiles.forEach(file => {
      formData.append("proofFiles", file);
    });
  }

  // Use the update URL but replace it with the action endpoint
  // Usually API_ENDPOINTS.detections.update(id) returns e.g. /api/v1/detections/{id}
  const baseUrl = API_ENDPOINTS.detections.update(id);
  const actionUrl = `${baseUrl}/action`;

  const response = await mockPost<DetectionRequest>(actionUrl, formData);
  return response.data;
}
