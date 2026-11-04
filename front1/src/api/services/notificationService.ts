/**
 * Notification Service
 * 
 * Endpoints:
 * - GET    /api/v1/notifications               → getNotifications()
 * - PATCH  /api/v1/notifications/:id/read       → markAsRead()
 * - PATCH  /api/v1/notifications/read-all       → markAllAsRead()
 * - DELETE /api/v1/notifications/:id            → deleteNotification()
 * - DELETE /api/v1/notifications                → clearAllNotifications()
 */

import { mockGet, mockPatch, mockDelete } from "../client";
import { API_ENDPOINTS } from "../config";
import { Notification } from "@/data/mockData";

export async function getNotifications() {
  const response = await mockGet<Notification[]>(API_ENDPOINTS.notifications.list);
  return response.data;
}

export async function markNotificationAsRead(id: string) {
  const response = await mockPatch<Notification>(API_ENDPOINTS.notifications.markRead(id));
  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await mockPatch<{ count: number }>(API_ENDPOINTS.notifications.markAllRead);
  return response.data;
}

export async function deleteNotification(id: string) {
  const response = await mockDelete(API_ENDPOINTS.notifications.delete(id));
  return response.data;
}

export async function clearAllNotifications() {
  const response = await mockDelete(API_ENDPOINTS.notifications.clearAll);
  return response.data;
}
