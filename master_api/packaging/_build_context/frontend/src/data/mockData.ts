export interface Camera {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  status: "online" | "offline" | "maintenance";
  isFlagged: boolean;
  lastDetection?: string;
  streamUrl?: string;
  cameraStreamId?: string;
}

export interface DetectionRequest {
  id: string;
  category: "person" | "vehicle";
  name: string;
  description: string;
  age?: string;
  location?: string;
  subcategory?: "missing_person" | "criminal";
  crimeType?: string;
  plateNumber?: string;
  code?: string;
  region?: string;
  nationalIdNumber?: string;
  imageUrls?: string[];
  status: "pending" | "monitoring" | "detected" | "in_progress" | "resolved" | "failed";
  createdAt: string;
  updatedAt: string;
  detectedCameraIds?: string[];
  formTemplateId?: string;
  dynamicData?: Record<string, any>;
  detectionEvents?: Array<{
    id: string;
    cameraId: string;
    cameraName: string;
    timestamp: string;
    snapshotUrl: string;
    snapshotUrls?: string[];
    lat?: number;
    lng?: number;
  }>;
  resolvedDynamicData?: Array<{ label: string, value: any }>;
  assignedCompanyId?: string;
  assignedCompanyName?: string;
  handlingStatus?: "unassigned" | "pending" | "in_progress" | "resolved" | "failed";
  handlingNotes?: string;
  handlingProofUrls?: string[];
  eligibleForAssignment?: boolean;
}

export interface Officer {
  id: string;
  name: string;
  badge: string;
  unit: string;
  avatar?: string;
  status: "available" | "busy" | "offline";
}

export interface Notification {
  id: string;
  type: "alert" | "info" | "warning" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export const mockCameras: Camera[] = [
  { id: "cam-001", name: "Main Street Camera 1", location: "Downtown", lat: 40.7128, lng: -74.006, status: "online", isFlagged: false },
  { id: "cam-002", name: "Central Park North", location: "Central Park", lat: 40.7829, lng: -73.9654, status: "online", isFlagged: true, lastDetection: "2 mins ago" },
  { id: "cam-003", name: "Times Square West", location: "Midtown", lat: 40.758, lng: -73.9855, status: "online", isFlagged: false },
  { id: "cam-004", name: "Brooklyn Bridge Entry", location: "Brooklyn", lat: 40.7061, lng: -73.9969, status: "online", isFlagged: true, lastDetection: "5 mins ago" },
  { id: "cam-005", name: "Wall Street", location: "Financial District", lat: 40.7074, lng: -74.0113, status: "offline", isFlagged: false },
  { id: "cam-006", name: "Grand Central Station", location: "Midtown", lat: 40.7527, lng: -73.9772, status: "online", isFlagged: false },
  { id: "cam-007", name: "Hudson Yards", location: "West Side", lat: 40.7537, lng: -74.0019, status: "maintenance", isFlagged: false },
  { id: "cam-008", name: "Battery Park", location: "Lower Manhattan", lat: 40.7033, lng: -74.017, status: "online", isFlagged: false },
  { id: "cam-009", name: "Union Square", location: "Gramercy", lat: 40.7359, lng: -73.9911, status: "online", isFlagged: false },
  { id: "cam-010", name: "Chelsea Market", location: "Chelsea", lat: 40.7424, lng: -74.006, status: "online", isFlagged: false },
];

export const mockDetections: DetectionRequest[] = [
  {
    id: "det-001",
    category: "person",
    name: "John Doe",
    description: "Male, 35-40 years old, last seen wearing dark jacket",
    status: "detected",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T14:22:00Z",
    detectedCameraIds: ["cam-002", "cam-004"],
  },
  {
    id: "det-002",
    category: "vehicle",
    name: "Black SUV",
    description: "License plate: ABC-1234, Dark tinted windows",
    status: "monitoring",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "det-003",
    category: "person",
    name: "Jane Smith",
    description: "Female, 25-30 years old, blonde hair",
    status: "pending",
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-15T08:00:00Z",
  },
];

export const mockOfficers: Officer[] = [
  { id: "off-001", name: "Mike Johnson", badge: "B-1234", unit: "Detective Unit", status: "available" },
  { id: "off-002", name: "Sarah Williams", badge: "B-5678", unit: "Traffic Division", status: "busy" },
  { id: "off-003", name: "Tom Brown", badge: "B-9012", unit: "Patrol", status: "available" },
  { id: "off-004", name: "Emily Davis", badge: "B-3456", unit: "Surveillance", status: "offline" },
  { id: "off-005", name: "James Wilson", badge: "B-7890", unit: "Special Ops", status: "available" },
];

export const mockNotifications: Notification[] = [
  {
    id: "notif-001",
    type: "alert",
    title: "Critical Match Found",
    message: "Camera 2 (Central Park North) detected a high-priority target from Detection #det-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
    read: false,
    actionUrl: "/cameras?highlight=cam-002",
  },
  {
    id: "notif-002",
    type: "alert",
    title: "Secondary Match Confirmed",
    message: "Camera 4 (Brooklyn Bridge Entry) also confirmed target from Detection #det-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    read: false,
    actionUrl: "/cameras?highlight=cam-004",
  },
  {
    id: "notif-003",
    type: "info",
    title: "Detection Created",
    message: "A new detection request has been submitted and is now being monitored",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: true,
  },
  {
    id: "notif-004",
    type: "warning",
    title: "Connectivity Alert",
    message: "Camera 5 (Wall Street) has lost connection to the primary server",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    read: true,
  },
  {
    id: "notif-005",
    type: "success",
    title: "Detection Resolved",
    message: "Detection #det-004 (Suspicious Package) has been successfully resolved",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
  },
  {
    id: "notif-006",
    type: "alert",
    title: "Unauthorized Access",
    message: "Motion detected in Restricted Zone (Server Room) after hours",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    read: false,
    actionUrl: "/cameras?highlight=cam-005",
  },
  {
    id: "notif-007",
    type: "info",
    title: "System Update",
    message: "Facial recognition engine updated to v2.4. Improved accuracy for low-light conditions.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    read: true,
  },
  {
    id: "notif-008",
    type: "warning",
    title: "Storage Warning",
    message: "Main recording server is at 85% capacity. Automated cleanup will start in 24 hours.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    read: false,
  },
  {
    id: "notif-009",
    type: "info",
    title: "Schedule Maintenance",
    message: "Camera 7 (Hudson Yards) will be down for maintenance from 02:00 to 04:00 AM",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
    read: false,
  },
  {
    id: "notif-010",
    type: "success",
    title: "User Profile Updated",
    message: "Your account permissions have been updated by the administrator",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    read: true,
  }
];
