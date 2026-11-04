import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDashboardStats, getDetectionTrends, getActivityLogs, getDashboardOverview, getDashboardIntelligence,
  getCompanies, createCompany, updateCompany, deleteCompany,
  getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  getRoles, getAllPermissions, createRole, updateRole, deleteRole,
  getFormTemplates, createFormTemplate, updateFormTemplate, deleteFormTemplate, getActiveFormTemplate,
  getDevices, getAnalyticsData, getDetailedAnalytics, getRawSubmissions,
  getCrimeTypeAnalytics, getCompanyComparison, getPerformanceMetrics,
  toggleCameraAccess, getCameraAccessOrgs, createCamera, updateCamera, deleteCamera,
  getSystemSettings, updateSystemSetting,
  type DashboardStats, type AnalyticsFilter,
} from "@/api/services/adminService";
import type { Company, AdminUser, Role, CaseFormTemplate } from "@/data/adminMockData";

// ── Dashboard ───────────────────────────────────
export function useAdminDashboardStats() {
  return useQuery({ queryKey: ["admin", "dashboard", "stats"], queryFn: getDashboardStats });
}
export function useDetectionTrends(timeRange: string = "monthly") {
  return useQuery({ 
    queryKey: ["admin", "dashboard", "trends", timeRange], 
    queryFn: () => getDetectionTrends(timeRange) 
  });
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["admin", "dashboard", "overview"],
    queryFn: getDashboardOverview
  });
}

export function useDashboardIntelligence() {
  return useQuery({
    queryKey: ["admin", "dashboard", "intelligence"],
    queryFn: getDashboardIntelligence,
    refetchInterval: 60000, // Refresh every minute for live stats
  });
}

export function useActivityLogs() {
  return useQuery({ queryKey: ["admin", "dashboard", "activity"], queryFn: getActivityLogs });
}

// ── Companies ───────────────────────────────────
export function useAdminCompanies() {
  return useQuery({ queryKey: ["admin", "companies"], queryFn: getCompanies });
}
export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Pick<Company, "name" | "adminEmail" | "status" | "lat" | "lng">) => createCompany(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "companies"] }),
  });
}
export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Company> & { cascadeFeatures?: boolean } }) => updateCompany(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "companies"] }),
  });
}
export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "companies"] }),
  });
}

// ── Users ───────────────────────────────────────
export function useAdminUsers(filters?: any) {
  return useQuery({ queryKey: ["admin", "users", filters], queryFn: () => getAdminUsers(filters) });
}
export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Pick<AdminUser, "name" | "email" | "companyId" | "role" | "status">) => createAdminUser(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AdminUser> }) => updateAdminUser(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ── Roles ───────────────────────────────────────
export function useAdminRoles() {
  return useQuery({ queryKey: ["admin", "roles"], queryFn: getRoles });
}
export function useAllPermissions() {
  return useQuery({ queryKey: ["admin", "permissions"], queryFn: getAllPermissions });
}
export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Pick<Role, "name" | "description" | "permissions">) => createRole(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roles"] }),
  });
}
export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Role> }) => updateRole(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roles"] }),
  });
}
export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roles"] }),
  });
}

// ── Form Templates ──────────────────────────────
export function useAdminFormTemplates() {
  return useQuery({ queryKey: ["admin", "forms"], queryFn: getFormTemplates });
}
export function useCreateFormTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Pick<CaseFormTemplate, "name" | "description" | "isActive" | "fields">) => createFormTemplate(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "forms"] }),
  });
}
export function useUpdateFormTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CaseFormTemplate> }) => updateFormTemplate(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "forms"] }),
  });
}
export function useDeleteFormTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFormTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "forms"] }),
  });
}
export function useActiveFormTemplate(detectionType: string = "person") {
  return useQuery({ queryKey: ["admin", "forms", "active", detectionType], queryFn: () => getActiveFormTemplate(detectionType) });
}

// ── Devices ─────────────────────────────────────
export function useAdminDevices(filters?: any) {
  return useQuery({ queryKey: ["admin", "devices", filters], queryFn: () => getDevices(filters) });
}
export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => createCamera(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "devices"] }),
  });
}
export function useUpdateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateCamera(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "devices"] }),
  });
}
export function useDeleteCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCamera(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "devices"] }),
  });
}
export function useToggleCameraAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cameraId, organizationId, hasAccess }: { cameraId: string; organizationId: string; hasAccess: boolean }) => 
      toggleCameraAccess(cameraId, organizationId, hasAccess),
    onSuccess: (_, { cameraId }) => qc.invalidateQueries({ queryKey: ["admin", "camera-access", cameraId] }),
  });
}
export function useCameraAccessOrgs(cameraId: string) {
  return useQuery({ 
    queryKey: ["admin", "camera-access", cameraId], 
    queryFn: () => getCameraAccessOrgs(cameraId),
    enabled: !!cameraId
  });
}

// ── Analytics ───────────────────────────────────
export function useAdminAnalytics() {
  return useQuery({ queryKey: ["admin", "analytics"], queryFn: getAnalyticsData });
}

export function useDetailedAnalytics(filters: AnalyticsFilter) {
  return useQuery({
    queryKey: ["admin", "analytics", "detailed", filters],
    queryFn: () => getDetailedAnalytics(filters)
  });
}

export function useRawSubmissions(filters: AnalyticsFilter) {
  return useQuery({
    queryKey: ["admin", "analytics", "raw", filters],
    queryFn: () => getRawSubmissions(filters)
  });
}

export function useCrimeTypeAnalytics(filters: AnalyticsFilter) {
  return useQuery({
    queryKey: ["admin", "analytics", "crime-types", filters],
    queryFn: () => getCrimeTypeAnalytics(filters)
  });
}

export function useCompanyComparison(companyIds: string[], filters: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: ["admin", "analytics", "company-comparison", companyIds, filters],
    queryFn: () => getCompanyComparison(companyIds, filters)
  });
}

export function usePerformanceMetrics(filters: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: ["admin", "analytics", "performance", filters],
    queryFn: () => getPerformanceMetrics(filters)
  });
}

// ── System Settings ────────────────────────────────
export function useSystemSettings() {
  return useQuery({ 
    queryKey: ["admin", "settings"], 
    queryFn: getSystemSettings 
  });
}

export function useUpdateSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, description }: { key: string; value: any; description?: string }) => 
      updateSystemSetting(key, value, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

