/**
 * API Configuration
 * 
 * Central configuration for all API endpoints.
 * When the real backend is ready, update API_BASE_URL and the endpoint paths below.
 * No UI logic changes required.
 */

// In development: uses http://localhost:8000/api/v1
// In production build: uses relative /api/v1 (served behind nginx reverse proxy)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `/api/v1`;

export const getMediaUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  // Derive backend base from API_BASE_URL (removes /api/v1)
  const backendBase = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  // Ensure the URL is properly joined
  const normalizedUrl = url.startsWith("/") ? url.slice(1) : url;
  return `${backendBase}/${normalizedUrl}`;
};

// Simulated network delay in ms (set to 0 in production)
export const MOCK_DELAY = 0;

/**
 * API Endpoint Map
 * 
 * Each key maps to a real backend route.
 * Update paths here when connecting to production.
 */
export const API_ENDPOINTS = {
  // ── Client Endpoints ──────────────────────────────
  // GET /cameras → list all cameras
  cameras: {
    list: `${API_BASE_URL}/cameras/`,
    create: `${API_BASE_URL}/cameras/`,
    getById: (id: string) => `${API_BASE_URL}/cameras/${id}`,
    update: (id: string) => `${API_BASE_URL}/cameras/${id}`,
    delete: (id: string) => `${API_BASE_URL}/cameras/${id}`,
    stream: (id: string) => `${API_BASE_URL}/cameras/${id}/stream`,
    access: (id: string) => `${API_BASE_URL}/cameras/${id}/access`,
    accessOrgs: (id: string) => `${API_BASE_URL}/cameras/${id}/access-orgs`,
  },

  // GET /detections, POST /detections
  detections: {
    list: `${API_BASE_URL}/detections/`,
    create: `${API_BASE_URL}/detections`,
    getById: (id: string) => `${API_BASE_URL}/detections/${id}`,
    update: (id: string) => `${API_BASE_URL}/detections/${id}`,
    delete: (id: string) => `${API_BASE_URL}/detections/${id}`,
  },

  // GET /weapon-detections, POST /weapon-detections/simulate
  weaponDetections: {
    list: `${API_BASE_URL}/weapon-detections/`,
    simulate: `${API_BASE_URL}/weapon-detections/simulate`,
  },

  // National ID endpoints
  nationalId: {
    profiles: `${API_BASE_URL}/national-id/profiles`,
    profileById: (id: string) => `${API_BASE_URL}/national-id/profiles/${id}`,
    profileByIdNumber: (idNumber: string) => `${API_BASE_URL}/national-id/profiles/by-id-number/${idNumber}`,
    search: `${API_BASE_URL}/national-id/search`,
    detectionMatches: (detectionId: string) => `${API_BASE_URL}/national-id/detections/${detectionId}/matches`,
    detectionPrimaryMatch: (detectionId: string) => `${API_BASE_URL}/national-id/detections/${detectionId}/primary-match`,
    detectionAutoMatch: (detectionId: string) => `${API_BASE_URL}/national-id/detections/${detectionId}/auto-match`,
    detectionWithNationalId: (detectionId: string) => `${API_BASE_URL}/national-id/detections/${detectionId}/with-national-id`,
    createMatch: (detectionId: string) => `${API_BASE_URL}/national-id/detections/${detectionId}/match`,
    updateMatch: (matchId: string) => `${API_BASE_URL}/national-id/matches/${matchId}`,
    populateMockData: `${API_BASE_URL}/national-id/populate-mock-data`,
    configureRealApi: `${API_BASE_URL}/national-id/configure-real-api`,
    switchToMock: `${API_BASE_URL}/national-id/switch-to-mock`,
  },

  // Vehicle Registration endpoints
  vehicleRegistration: {
    registrations: `${API_BASE_URL}/vehicle-registration/registrations`,
    registrationById: (id: string) => `${API_BASE_URL}/vehicle-registration/registrations/${id}`,
    registrationByPlate: (plateNumber: string) => `${API_BASE_URL}/vehicle-registration/registrations/by-plate/${plateNumber}`,
    search: `${API_BASE_URL}/vehicle-registration/search`,
    detectionMatches: (detectionId: string) => `${API_BASE_URL}/vehicle-registration/detections/${detectionId}/matches`,
    detectionPrimaryMatch: (detectionId: string) => `${API_BASE_URL}/vehicle-registration/detections/${detectionId}/primary-match`,
    detectionAutoMatch: (detectionId: string) => `${API_BASE_URL}/vehicle-registration/detections/${detectionId}/auto-match`,
    detectionWithVehicle: (detectionId: string) => `${API_BASE_URL}/vehicle-registration/detections/${detectionId}/with-vehicle`,
    createMatch: (detectionId: string) => `${API_BASE_URL}/vehicle-registration/detections/${detectionId}/match`,
    updateMatch: (matchId: string) => `${API_BASE_URL}/vehicle-registration/matches/${matchId}`,
    populateMockData: `${API_BASE_URL}/vehicle-registration/populate-mock-data`,
    configureRealApi: `${API_BASE_URL}/vehicle-registration/configure-real-api`,
    switchToMock: `${API_BASE_URL}/vehicle-registration/switch-to-mock`,
  },

  // Fingerprint match history
  fingerprintHistory: {
    list: `${API_BASE_URL}/fingerprint-history/`,
    create: `${API_BASE_URL}/fingerprint-history/`,
    delete: (id: string) => `${API_BASE_URL}/fingerprint-history/${id}`,
    clearAll: `${API_BASE_URL}/fingerprint-history/`,
  },


  // GET /officers
  officers: {
    list: `${API_BASE_URL}/officers/`,
  },

  // GET /notifications, PATCH /notifications/:id, DELETE /notifications/:id
  notifications: {
    list: `${API_BASE_URL}/notifications/`,
    markRead: (id: string) => `${API_BASE_URL}/notifications/${id}/read`,
    markAllRead: `${API_BASE_URL}/notifications/read-all`,
    delete: (id: string) => `${API_BASE_URL}/notifications/${id}`,
    clearAll: `${API_BASE_URL}/notifications`,
  },

  // GET /profile, PATCH /profile
  profile: {
    get: `${API_BASE_URL}/profile`,
    update: `${API_BASE_URL}/profile`,
    updateUsername: `${API_BASE_URL}/profile/username`,
    updatePassword: `${API_BASE_URL}/profile/password`,
  },

  // GET /history
  history: {
    list: `${API_BASE_URL}/history/`,
  },

  // ── Admin Endpoints ───────────────────────────────
  admin: {
    // GET /admin/dashboard
    dashboard: {
      stats: `${API_BASE_URL}/admin/dashboard/stats`,
      activityLogs: `${API_BASE_URL}/admin/dashboard/activity-logs`,
      detectionTrends: `${API_BASE_URL}/admin/dashboard/detection-trends`,
    },

    // GET /admin/companies, POST, PATCH, DELETE
    companies: {
      list: `${API_BASE_URL}/admin/companies`,
      create: `${API_BASE_URL}/admin/companies`,
      update: (id: string) => `${API_BASE_URL}/admin/companies/${id}`,
      delete: (id: string) => `${API_BASE_URL}/admin/companies/${id}`,
    },

    // GET /admin/users, POST, PATCH, DELETE
    users: {
      list: `${API_BASE_URL}/admin/users`,
      create: `${API_BASE_URL}/admin/users`,
      update: (id: string) => `${API_BASE_URL}/admin/users/${id}`,
      delete: (id: string) => `${API_BASE_URL}/admin/users/${id}`,
    },

    // GET /admin/roles, POST, PATCH, DELETE
    roles: {
      list: `${API_BASE_URL}/admin/roles`,
      create: `${API_BASE_URL}/admin/roles`,
      update: (id: string) => `${API_BASE_URL}/admin/roles/${id}`,
      delete: (id: string) => `${API_BASE_URL}/admin/roles/${id}`,
      permissions: `${API_BASE_URL}/admin/roles/permissions`,
    },

    // GET /admin/forms, POST, PATCH, DELETE
    forms: {
      list: `${API_BASE_URL}/admin/forms`,
      create: `${API_BASE_URL}/admin/forms`,
      update: (id: string) => `${API_BASE_URL}/admin/forms/${id}`,
      delete: (id: string) => `${API_BASE_URL}/admin/forms/${id}`,
    },

    // GET /admin/devices
    devices: {
      list: `${API_BASE_URL}/admin/devices`,
    },

    // GET /admin/analytics/*
    analytics: {
      detections: `${API_BASE_URL}/admin/analytics/detections`,
      detailed: `${API_BASE_URL}/admin/analytics/detailed`,
      raw: `${API_BASE_URL}/admin/analytics/raw`,
      crimeTypes: `${API_BASE_URL}/admin/analytics/crime-types`,
      companyComparison: `${API_BASE_URL}/admin/analytics/company-comparison`,
      performance: `${API_BASE_URL}/admin/analytics/performance`,
      users: `${API_BASE_URL}/admin/analytics/users`,
      companies: `${API_BASE_URL}/admin/analytics/companies`,
      cameras: `${API_BASE_URL}/admin/analytics/cameras`,
    },
    // GET /admin/settings, PUT /admin/settings/:key
    settings: {
      list: `${API_BASE_URL}/admin/settings`,
      update: (key: string) => `${API_BASE_URL}/admin/settings/${key}`,
    },
  },
} as const;
