import { mockGet, mockPost, mockPut, mockPatch, mockDelete } from "../client";
import { API_ENDPOINTS } from "../config";
import { Camera } from "@/data/mockData";
import {
  Company, AdminUser, Role, CaseFormTemplate, DeviceRecord, ActivityLog,
} from "@/data/adminMockData";

// ── Dashboard ───────────────────────────────────
export interface DashboardStats {
  activeCompanies: number;
  totalCompanies: number;
  totalUsers: number;
  totalDevices: number;
  onlineDevices: number;
  totalDetections: number;
}

export async function getDashboardStats() {
  const response = await mockGet<DashboardStats>(API_ENDPOINTS.admin.dashboard.stats);
  return response.data;
}

export async function getDetectionTrends(timeRange: string = "monthly") {
  const response = await mockGet<any>(`${API_ENDPOINTS.admin.dashboard.detectionTrends}?time_series=${timeRange}`);
  return response.data;
}

export async function getActivityLogs() {
  const response = await mockGet<ActivityLog[]>(API_ENDPOINTS.admin.dashboard.activityLogs);
  return response.data;
}

export async function getDashboardOverview() {
  const response = await mockGet<any>(`${API_ENDPOINTS.admin.dashboard.stats.replace('/stats', '/overview')}`);
  return response.data;
}

export async function getDashboardIntelligence() {
  const response = await mockGet<any>(`${API_ENDPOINTS.admin.dashboard.stats.replace('/stats', '/intelligence')}`);
  return response.data;
}

// ── Companies ───────────────────────────────────
export async function getCompanies() {
  const response = await mockGet<Company[]>(API_ENDPOINTS.admin.companies.list);
  return response.data;
}

export async function createCompany(payload: Pick<Company, "name" | "adminEmail" | "status" | "lat" | "lng">) {
  const response = await mockPost<Company>(API_ENDPOINTS.admin.companies.create, payload);
  return response.data;
}

export async function updateCompany(id: string, updates: Partial<Company> & { cascadeFeatures?: boolean }) {
  const { cascadeFeatures, ...rest } = updates;
  const payload = { ...rest, cascade_features: cascadeFeatures };
  const response = await mockPatch<Company>(API_ENDPOINTS.admin.companies.update(id), payload as any);
  return response.data;
}

export async function deleteCompany(id: string) {
  const response = await mockDelete(API_ENDPOINTS.admin.companies.delete(id));
  return response.data;
}

// ── Users ───────────────────────────────────────
export async function getAdminUsers(filters: AnalyticsFilter = {}) {
  const params = new URLSearchParams();
  if (filters.companyId && filters.companyId !== 'all') params.append('company_id', filters.companyId);
  if (filters.includeChildren !== undefined) params.append('include_children', String(filters.includeChildren));
  const url = `${API_ENDPOINTS.admin.users.list}?${params.toString()}`;
  const response = await mockGet<AdminUser[]>(url);
  return response.data;
}

export async function createAdminUser(payload: Pick<AdminUser, "name" | "email" | "companyId" | "role" | "status">) {
  const response = await mockPost<AdminUser>(API_ENDPOINTS.admin.users.create, payload);
  return response.data;
}

export async function updateAdminUser(id: string, updates: Partial<AdminUser>) {
  const response = await mockPatch<AdminUser>(API_ENDPOINTS.admin.users.update(id), updates);
  return response.data;
}

export async function deleteAdminUser(id: string) {
  const response = await mockDelete(API_ENDPOINTS.admin.users.delete(id));
  return response.data;
}

// ── Roles ───────────────────────────────────────
export async function getRoles() {
  const response = await mockGet<Role[]>(API_ENDPOINTS.admin.roles.list);
  return response.data;
}

export async function getAllPermissions() {
  const response = await mockGet<string[]>(API_ENDPOINTS.admin.roles.permissions);
  return response.data;
}

export async function createRole(payload: Pick<Role, "name" | "description" | "permissions">) {
  const response = await mockPost<Role>(API_ENDPOINTS.admin.roles.create, payload);
  return response.data;
}

export async function updateRole(id: string, updates: Partial<Role>) {
  const response = await mockPatch<Role>(API_ENDPOINTS.admin.roles.update(id), updates);
  return response.data;
}

export async function deleteRole(id: string) {
  const response = await mockDelete(API_ENDPOINTS.admin.roles.delete(id));
  return response.data;
}

// ── Form Templates ──────────────────────────────
export async function getFormTemplates() {
  const response = await mockGet<CaseFormTemplate[]>(API_ENDPOINTS.admin.forms.list);
  return response.data;
}

export async function createFormTemplate(payload: Pick<CaseFormTemplate, "name" | "description" | "isActive" | "fields">) {
  const response = await mockPost<CaseFormTemplate>(API_ENDPOINTS.admin.forms.create, payload);
  return response.data;
}

export async function updateFormTemplate(id: string, updates: Partial<CaseFormTemplate>) {
  const response = await mockPatch<CaseFormTemplate>(API_ENDPOINTS.admin.forms.update(id), updates);
  return response.data;
}

export async function deleteFormTemplate(id: string) {
  const response = await mockDelete(API_ENDPOINTS.admin.forms.delete(id));
  return response.data;
}

export async function getActiveFormTemplate(detectionType: string = "person") {
  const response = await mockGet<CaseFormTemplate>(`${API_ENDPOINTS.admin.forms.list}/active?detection_type=${detectionType}`);
  return response.data;
}

// ── Devices ─────────────────────────────────────
export async function getDevices(filters: AnalyticsFilter = {}) {
  const params = new URLSearchParams();
  if (filters.companyId && filters.companyId !== 'all') params.append('company_id', filters.companyId);
  if (filters.includeChildren !== undefined) params.append('include_children', String(filters.includeChildren));
  const url = `${API_ENDPOINTS.admin.devices.list}?${params.toString()}`;
  const response = await mockGet<DeviceRecord[]>(url);
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

// ── Analytics ───────────────────────────────────
export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  companyId?: string;
  includeChildren?: boolean;
  location?: string;
  category?: string;
  status?: string;
  crimeType?: string;
  timeSeries?: string;
}

export interface CategoryStat {
  category: string;
  count: number;
  trend: number;
}

export interface LocationStat {
  location: string;
  count: number;
}

export interface DetectionStatusStat {
  status: string;
  count: number;
}

export interface DetailedAnalytics {
  totalDetections: number;
  resolutionRate: number;
  avgResolutionTimeHours: number | null;
  avgCreationToResolutionHours: number | null;
  avgDetectionToResolutionHours: number | null;
  recordsByCategory: CategoryStat[];
  recordsByLocation: LocationStat[];
  detectionStatusBreakdown: DetectionStatusStat[];
  monthlyTrends: any[];
}

export interface RawSubmission {
  id: string;
  type: 'detection';
  title: string;
  category: string;
  location: string;
  status: string;
  handlingStatus?: string;
  crimeType?: string;
  timestamp: string;
  companyName: string;
  assignedCompanyName?: string;
  details?: Record<string, any>;
  description?: string;
  imageUrls?: string[];
  subcategory?: string;
  plateNumber?: string;
  code?: string;
  region?: string;
  age?: string;
  eligibleForAssignment?: boolean;
  handlingNotes?: string;
  handlingProofUrls?: string[];
  resolvedDynamicData?: { label: string; value: any }[];
  detectionEvents?: any[];
}

// ── Crime Type Analytics ────────────────────────
export interface CrimeTypeStat {
  crimeType: string;
  count: number;
}

export interface CrimeTypeTimeStat {
  period: string;
  crimeType: string;
  count: number;
}

export interface CrimeTypeLocationStat {
  location: string;
  crimeType: string;
  count: number;
}

export interface CrimeTypeCompanyStat {
  companyName: string;
  crimeType: string;
  count: number;
}

export interface HourCrimeHeatmapCell {
  hour: number;
  crimeType: string;
  count: number;
}

export interface CrimeTypeAnalyticsResponse {
  distribution: CrimeTypeStat[];
  trendsOverTime: CrimeTypeTimeStat[];
  byLocation: CrimeTypeLocationStat[];
  byCompany: CrimeTypeCompanyStat[];
  heatmap: HourCrimeHeatmapCell[];
}

// ── Company Comparison ──────────────────────────
export interface CompanyComparisonMetrics {
  companyId: string;
  companyName: string;
  totalDetections: number;
  resolvedCount: number;
  resolutionRate: number;
  avgResponseTimeHours: number | null;
  avgResolutionTimeHours: number | null;
  reopenRate: number;
  slaComplianceRate: number;
}

export interface CompanyComparisonTrend {
  period: string;
  companyId: string;
  companyName: string;
  detections: number;
}

export interface CompanyComparisonResponse {
  companies: CompanyComparisonMetrics[];
  trends: CompanyComparisonTrend[];
}

// ── Performance ─────────────────────────────────
export interface CompanyPerformance {
  companyId: string;
  companyName: string;
  avgResponseTimeHours: number | null;
  avgResolutionTimeHours: number | null;
  totalHandled: number;
  resolvedCount: number;
  failedCount: number;
  slaComplianceRate: number;
}

export interface PerformanceResponse {
  companies: CompanyPerformance[];
}

// ── API Functions ───────────────────────────────

function buildFilterParams(filters: AnalyticsFilter = {}): string {
  const params = new URLSearchParams();
  if (filters.companyId && filters.companyId !== 'all') params.append('company_id', filters.companyId);
  if (filters.includeChildren !== undefined) params.append('include_children', String(filters.includeChildren));
  if (filters.location) params.append('location', filters.location);
  if (filters.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.crimeType && filters.crimeType !== 'all') params.append('crime_type', filters.crimeType);
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.timeSeries) params.append('time_series', filters.timeSeries);
  return params.toString();
}

export async function getAnalyticsData() {
  const response = await mockGet<any>(API_ENDPOINTS.admin.analytics.detections);
  return response.data;
}

export async function getDetailedAnalytics(filters: AnalyticsFilter = {}) {
  const qs = buildFilterParams(filters);
  const url = `${API_ENDPOINTS.admin.analytics.detailed}?${qs}`;
  const response = await mockGet<DetailedAnalytics>(url);
  return response.data;
}

export async function getRawSubmissions(filters: AnalyticsFilter = {}) {
  const qs = buildFilterParams(filters);
  const url = `${API_ENDPOINTS.admin.analytics.raw}?${qs}`;
  const response = await mockGet<RawSubmission[]>(url);
  return response.data;
}

export async function getCrimeTypeAnalytics(filters: AnalyticsFilter = {}) {
  const qs = buildFilterParams(filters);
  // Send the client's timezone offset so the heatmap shows local hours
  const tzOffsetMinutes = -(new Date().getTimezoneOffset()); // e.g. 180 for UTC+3
  const url = `${API_ENDPOINTS.admin.analytics.crimeTypes}?${qs}&tz_offset_minutes=${tzOffsetMinutes}`;
  const response = await mockGet<CrimeTypeAnalyticsResponse>(url);
  return response.data;
}

export async function getCompanyComparison(
  companyIds: string[],
  filters: AnalyticsFilter = {}
) {
  const params = new URLSearchParams();
  if (companyIds.length > 0) params.append('company_ids', companyIds.join(','));
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  const url = `${API_ENDPOINTS.admin.analytics.companyComparison}?${params.toString()}`;
  const response = await mockGet<CompanyComparisonResponse>(url);
  return response.data;
}

export async function getPerformanceMetrics(filters: AnalyticsFilter = {}) {
  const qs = buildFilterParams(filters);
  const url = `${API_ENDPOINTS.admin.analytics.performance}?${qs}`;
  const response = await mockGet<PerformanceResponse>(url);
  return response.data;
}

// ── System Settings ────────────────────────────────
export interface SystemSetting {
  key: string;
  value: any;
  description: string | null;
}

export async function getSystemSettings() {
  const response = await mockGet<SystemSetting[]>(API_ENDPOINTS.admin.settings.list);
  return response.data;
}

export async function updateSystemSetting(key: string, value: any, description?: string) {
  const response = await mockPut<SystemSetting>(API_ENDPOINTS.admin.settings.update(key), { value, description });
  return response.data;
}
