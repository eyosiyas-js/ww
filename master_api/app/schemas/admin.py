from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import date, datetime

class DashboardStats(BaseModel):
    activeCompanies: int
    totalCompanies: int
    totalUsers: int
    totalDevices: int
    onlineDevices: int
    totalDetections: int
    weaponDetections: int
    activeOfficers: int

AdminDashboardStats = DashboardStats

class DetectionTrend(BaseModel):
    period: str
    detections: int

class ActivityLog(BaseModel):
    id: str
    userId: str
    userName: str
    companyName: str
    action: str
    target: str
    timestamp: datetime
    type: str  # detection, camera, user, company, role, settings, form_template, auth
    actionType: Optional[str] = None  # create, update, delete, status_change, login, logout
    changes: Optional[List[dict]] = None  # [{"field": "Name", "from": "old", "to": "new"}]


class CompanyActivityStat(BaseModel):
    name: str
    detections: int
    cameras: int

class AnalyticsSummary(BaseModel):
    monthlyDetections: List[DetectionTrend]
    companyActivity: List[CompanyActivityStat]

class AnalyticsFilter(BaseModel):
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    companyId: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None

class CategoryStat(BaseModel):
    category: str
    count: int
    trend: float # Percentage change

class LocationStat(BaseModel):
    location: str
    count: int

# ── Detection Status Breakdown ───────────────────
class DetectionStatusStat(BaseModel):
    status: str
    count: int

# ── Enhanced Detailed Analytics ──────────────────
class DetailedAnalytics(BaseModel):
    totalDetections: int
    resolutionRate: float          # % of detections resolved
    avgResolutionTimeHours: Optional[float] = None  # backward compat alias (same as creation→resolution)
    avgCreationToResolutionHours: Optional[float] = None  # avg hours from creation to resolution/closure
    avgDetectionToResolutionHours: Optional[float] = None  # avg hours from first camera detection to resolution/closure
    recordsByCategory: List[CategoryStat]
    recordsByLocation: List[LocationStat]
    detectionStatusBreakdown: List[DetectionStatusStat]
    monthlyTrends: List[DetectionTrend]

# ── Crime Type Analytics ─────────────────────────
class CrimeTypeStat(BaseModel):
    crimeType: str
    count: int

class CrimeTypeTimeStat(BaseModel):
    period: str
    crimeType: str
    count: int

class CrimeTypeLocationStat(BaseModel):
    location: str
    crimeType: str
    count: int

class CrimeTypeCompanyStat(BaseModel):
    companyName: str
    crimeType: str
    count: int

class HourCrimeHeatmapCell(BaseModel):
    hour: int
    crimeType: str
    count: int

class CrimeTypeAnalyticsResponse(BaseModel):
    distribution: List[CrimeTypeStat]
    trendsOverTime: List[CrimeTypeTimeStat]
    byLocation: List[CrimeTypeLocationStat]
    byCompany: List[CrimeTypeCompanyStat]
    heatmap: List[HourCrimeHeatmapCell]

# ── Company Comparison ───────────────────────────
class CompanyComparisonMetrics(BaseModel):
    companyId: str
    companyName: str
    totalDetections: int
    resolvedCount: int
    resolutionRate: float
    avgResponseTimeHours: Optional[float] = None
    avgResolutionTimeHours: Optional[float] = None
    reopenRate: float
    slaComplianceRate: float  # placeholder – computed if SLA data exists
    acceptRate: float

class CompanyComparisonTrend(BaseModel):
    period: str
    companyId: str
    companyName: str
    detections: int

class CompanyComparisonResponse(BaseModel):
    companies: List[CompanyComparisonMetrics]
    trends: List[CompanyComparisonTrend]

# ── Performance Metrics ──────────────────────────
class CompanyPerformance(BaseModel):
    companyId: str
    companyName: str
    avgResponseTimeHours: Optional[float] = None
    avgResolutionTimeHours: Optional[float] = None
    totalHandled: int
    resolvedCount: int
    failedCount: int
    slaComplianceRate: float

class PerformanceResponse(BaseModel):
    companies: List[CompanyPerformance]

class RawSubmission(BaseModel):
    id: str
    type: str # detection
    title: str
    category: str
    location: str
    status: str
    handlingStatus: Optional[str] = None
    crimeType: Optional[str] = None
    timestamp: datetime
    companyName: str
    assignedCompanyName: Optional[str] = None
    details: Optional[dict] = None # For dynamic_data or other specifics
    # Extended fields for detail modal
    description: Optional[str] = None
    imageUrls: Optional[List[str]] = []
    subcategory: Optional[str] = None
    plateNumber: Optional[str] = None
    code: Optional[str] = None
    region: Optional[str] = None
    age: Optional[str] = None
    eligibleForAssignment: Optional[bool] = None
    handlingNotes: Optional[str] = None
    handlingProofUrls: Optional[List[str]] = []
    resolvedDynamicData: Optional[List[dict]] = []
    detectionEvents: Optional[List[dict]] = []

class OperationalIntelligence(BaseModel):
    hourlyDistribution: List[Dict[str, Any]]
    dayOfWeekDistribution: List[Dict[str, Any]]
    responseTimeMetrics: Dict[str, Any]
    resolutionMetrics: Dict[str, Any]
    crimeTypeDistribution: List[Dict[str, Any]]
    weaponTypeDistribution: List[Dict[str, Any]]
    topOfficers: List[Dict[str, Any]]
    cameraHealth: Dict[str, int]
    assignmentDistanceMetrics: Dict[str, Any]
    companyComparison: List[Dict[str, Any]]
    categoryTrends: List[Dict[str, Any]]
    trafficViolationsByRegion: List[Dict[str, Any]]
    topActiveUsers: List[Dict[str, Any]]
    liveStats: Dict[str, Any]
