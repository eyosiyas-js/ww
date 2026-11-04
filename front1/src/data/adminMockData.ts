export interface Company {
  id: string;
  name: string;
  adminEmail: string;
  usersCount: number;
  camerasCount: number;
  detectionsCount: number;
  status: "active" | "suspended" | "inactive";
  createdAt: string;
  features?: Record<string, 'full' | 'view' | 'none'>;
  parentId?: string;
  lat?: number;
  lng?: number;
  companyType?: "general" | "traffic_police";
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  role: string;
  status: "active" | "suspended" | "inactive";
  lastLogin: string;
  createdAt: string;
  avatar?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  usersCount: number;
  isSystem: boolean;
}

export interface CaseFormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  isActive: boolean;
  detectionType: "person" | "vehicle";
  createdAt: string;
  updatedAt: string;
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "file" | "number" | "checkbox";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DeviceRecord {
  id: string;
  name: string;
  type: "camera" | "sensor" | "drone";
  model: string;
  companyId: string;
  companyName: string;
  linkedTrafficCompanyId?: string;
  linkedTrafficCompanyName?: string;
  location: string;
  lat?: number;
  lng?: number;
  status: "online" | "offline" | "maintenance";
  lastActivity: string;
  lastPing: string;
  firmware: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  companyName: string;
  action: string;
  target: string;
  timestamp: string;
  type: "detection" | "camera" | "user" | "system";
}

export const allPermissions = [
  "cameras.view", "cameras.manage",
  "detections.view", "detections.manage",
  "users.view", "users.manage",
  "reports.view", "reports.manage",
  "settings.view", "settings.manage",
  "notifications.view", "notifications.manage",
];

export const mockCompanies: Company[] = [
  { id: "comp-001", name: "Metro Police Dept", adminEmail: "admin@metropd.gov", usersCount: 45, camerasCount: 120, detectionsCount: 1540, status: "active", createdAt: "2023-06-15", features: { detections: "full", fingerprint: "full" } },
  { id: "comp-002", name: "City Watch Corp", adminEmail: "admin@citywatch.com", usersCount: 22, camerasCount: 65, detectionsCount: 620, status: "active", createdAt: "2023-09-01", features: { detections: "full", fingerprint: "full" }, parentId: "comp-001" },
  { id: "comp-003", name: "SafeStreet Inc", adminEmail: "admin@safestreet.io", usersCount: 12, camerasCount: 30, detectionsCount: 310, status: "active", createdAt: "2024-01-10", features: { detections: "full", fingerprint: "none" }, parentId: "comp-002" },
  { id: "comp-004", name: "Guardian Security", adminEmail: "admin@guardian.com", usersCount: 8, camerasCount: 18, detectionsCount: 150, status: "suspended", createdAt: "2023-11-20", features: { detections: "full", fingerprint: "full" } },
  { id: "comp-005", name: "Sentinel Services", adminEmail: "admin@sentinel.co", usersCount: 35, camerasCount: 90, detectionsCount: 1100, status: "active", createdAt: "2023-03-05", features: { detections: "full", fingerprint: "full" } },
];

export const mockAdminUsers: AdminUser[] = [
  { id: "usr-001", name: "Mike Johnson", email: "mike@metropd.gov", companyId: "comp-001", companyName: "Metro Police Dept", role: "Company Admin", status: "active", lastLogin: "2024-01-15T14:30:00Z", createdAt: "2023-06-15" },
  { id: "usr-002", name: "Sarah Williams", email: "sarah@metropd.gov", companyId: "comp-001", companyName: "Metro Police Dept", role: "Operator", status: "active", lastLogin: "2024-01-15T10:00:00Z", createdAt: "2023-07-01" },
  { id: "usr-003", name: "Tom Brown", email: "tom@citywatch.com", companyId: "comp-002", companyName: "City Watch Corp", role: "Company Admin", status: "active", lastLogin: "2024-01-14T09:00:00Z", createdAt: "2023-09-01" },
  { id: "usr-004", name: "Emily Davis", email: "emily@safestreet.io", companyId: "comp-003", companyName: "SafeStreet Inc", role: "Operator", status: "suspended", lastLogin: "2024-01-10T16:00:00Z", createdAt: "2024-01-10" },
  { id: "usr-005", name: "James Wilson", email: "james@guardian.com", companyId: "comp-004", companyName: "Guardian Security", role: "Viewer", status: "inactive", lastLogin: "2023-12-20T11:00:00Z", createdAt: "2023-11-20" },
  { id: "usr-006", name: "Lisa Chen", email: "lisa@sentinel.co", companyId: "comp-005", companyName: "Sentinel Services", role: "Company Admin", status: "active", lastLogin: "2024-01-15T08:00:00Z", createdAt: "2023-03-05" },
];

export const mockRoles: Role[] = [
  { id: "role-001", name: "Super Admin", description: "Full system access across all companies", permissions: allPermissions, usersCount: 2, isSystem: true },
  { id: "role-002", name: "Company Admin", description: "Full access within their company", permissions: ["cameras.view", "cameras.manage", "detections.view", "detections.manage", "users.view", "users.manage", "reports.view", "reports.manage", "settings.view", "settings.manage", "notifications.view", "notifications.manage"], usersCount: 5, isSystem: true },
  { id: "role-003", name: "Operator", description: "Can manage cameras and detections", permissions: ["cameras.view", "cameras.manage", "detections.view", "detections.manage", "reports.view"], usersCount: 18, isSystem: false },
  { id: "role-004", name: "Viewer", description: "Read-only access to cameras and reports", permissions: ["cameras.view", "detections.view", "reports.view"], usersCount: 12, isSystem: false },
  { id: "role-005", name: "Field Officer", description: "Detection monitoring and alerts", permissions: ["cameras.view", "detections.view", "notifications.view", "notifications.manage"], usersCount: 25, isSystem: false },
];

export const mockFormTemplates: CaseFormTemplate[] = [
  {
    id: "form-001", name: "Criminal Incident Details", description: "Detailed form for criminal detection follow-ups",
    isActive: true, createdAt: "2023-06-15", updatedAt: "2024-01-10",
    fields: [
      { id: "f1", label: "Incident Title", type: "text", required: true, placeholder: "Enter incident title" },
      { id: "f2", label: "Observations", type: "textarea", required: true, placeholder: "Describe observations" },
      { id: "f3", label: "Severity", type: "select", required: true, options: ["Low", "Medium", "High", "Critical"] },
      { id: "f4", label: "Detection Date", type: "date", required: true },
      { id: "f5", label: "Supporting Evidence", type: "file", required: false },
    ],
  },
  {
    id: "form-002", name: "Vehicle Alert Log", description: "Specialized form for vehicle detection records",
    isActive: true, createdAt: "2023-08-20", updatedAt: "2024-01-05",
    fields: [
      { id: "f1", label: "Vehicle Description", type: "text", required: true, placeholder: "Make, model, color" },
      { id: "f2", label: "License Plate", type: "text", required: true, placeholder: "Enter plate number" },
      { id: "f3", label: "Location Sighted", type: "text", required: true },
      { id: "f4", label: "Notes", type: "textarea", required: false },
    ],
  },
];

export const mockDevices: DeviceRecord[] = [
  { id: "dev-001", name: "Main St Camera 1", type: "camera", model: "Bullet 4K", companyId: "comp-001", companyName: "Metro Police Dept", location: "Downtown", status: "online", lastActivity: "2024-01-15T14:30:00Z", lastPing: "2024-01-15T14:30:00Z", firmware: "v3.2.1" },
  { id: "dev-002", name: "Park Sensor A", type: "sensor", model: "Motion Pro", companyId: "comp-001", companyName: "Metro Police Dept", location: "Central Park", status: "online", lastActivity: "2024-01-15T14:28:00Z", lastPing: "2024-01-15T14:30:00Z", firmware: "v2.1.0" },
  { id: "dev-003", name: "Drone Unit 5", type: "drone", model: "PTZ SkyGuard", companyId: "comp-002", companyName: "City Watch Corp", location: "Midtown", status: "offline", lastActivity: "2024-01-14T18:00:00Z", lastPing: "2024-01-14T18:30:00Z", firmware: "v4.0.3" },
  { id: "dev-004", name: "Bridge Camera 2", type: "camera", model: "Dome 2K", companyId: "comp-003", companyName: "SafeStreet Inc", location: "Brooklyn", status: "maintenance", lastActivity: "2024-01-13T10:00:00Z", lastPing: "2024-01-13T10:30:00Z", firmware: "v3.1.0" },
  { id: "dev-005", name: "Wall St Camera", type: "camera", model: "PTZ Pro", companyId: "comp-005", companyName: "Sentinel Services", location: "Financial District", status: "online", lastActivity: "2024-01-15T14:25:00Z", lastPing: "2024-01-15T14:30:00Z", firmware: "v3.2.1" },
];

export const mockActivityLogs: ActivityLog[] = [
  { id: "log-001", userId: "usr-001", userName: "Mike Johnson", companyName: "Metro Police Dept", action: "Created detection request", target: "John Doe - Person", timestamp: "2024-01-15T14:30:00Z", type: "detection" },
  { id: "log-003", userId: "usr-003", userName: "Tom Brown", companyName: "City Watch Corp", action: "Added camera", target: "Drone Unit 5", timestamp: "2024-01-15T11:00:00Z", type: "camera" },
  { id: "log-004", userId: "usr-006", userName: "Lisa Chen", companyName: "Sentinel Services", action: "Created user", target: "New operator account", timestamp: "2024-01-15T09:00:00Z", type: "user" },
  { id: "log-006", userId: "usr-003", userName: "Tom Brown", companyName: "City Watch Corp", action: "Updated detection", target: "Black SUV - Vehicle", timestamp: "2024-01-14T16:00:00Z", type: "detection" },
  { id: "log-007", userId: "usr-002", userName: "Sarah Williams", companyName: "Metro Police Dept", action: "System config change", target: "Alert threshold updated", timestamp: "2024-01-14T14:00:00Z", type: "system" },
  { id: "log-008", userId: "usr-006", userName: "Lisa Chen", companyName: "Sentinel Services", action: "Exported report", target: "Monthly analytics report", timestamp: "2024-01-14T10:00:00Z", type: "system" },
];

// Analytics data
export const monthlyDetections = [
  { month: "Jul", detections: 120 },
  { month: "Aug", detections: 145 },
  { month: "Sep", detections: 165 },
  { month: "Oct", detections: 190 },
  { month: "Nov", detections: 210 },
  { month: "Dec", detections: 180 },
  { month: "Jan", detections: 230 },
];

export const companyActivity = [
  { name: "Metro Police Dept", detections: 1540, cameras: 120 },
  { name: "City Watch Corp", detections: 620, cameras: 65 },
  { name: "Sentinel Services", detections: 1100, cameras: 90 },
  { name: "SafeStreet Inc", detections: 310, cameras: 30 },
  { name: "Guardian Security", detections: 150, cameras: 18 },
];
