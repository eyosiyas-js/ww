import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminDashboardStats,
  useDetectionTrends,
  useActivityLogs,
  useAdminCompanies,
  useDashboardOverview,
  useDashboardIntelligence,
} from "@/hooks/use-admin";
import {
  Building2, Users, Cpu, BarChart3, Activity, TrendingUp,
  AlertTriangle, Camera, MapPin, Target, FileText, Clock,
  CheckCircle2, XCircle, Shield, Zap, TrendingDown, Award,
} from "lucide-react";import { motion } from "framer-motion";
import { useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { useAuthContext } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  primary:  "hsl(199, 89%, 48%)",
  success:  "hsl(142, 76%, 36%)",
  warning:  "hsl(38,  92%, 50%)",
  danger:   "hsl(0,   84%, 60%)",
  info:     "hsl(217, 91%, 60%)",
  purple:   "hsl(271, 91%, 65%)",
};

const CHART_COLORS = [C.primary, C.success, C.warning, C.danger, C.info, C.purple];

// Maps real DB values → colours
const STATUS_COLOR: Record<string, string> = {
  // detection.status
  pending:    C.warning,
  monitoring: C.info,
  detected:   C.success,
  // detection.handling_status
  unassigned: C.warning,
  assigned:   C.info,
  in_progress: C.primary,
  resolved:   C.success,
  failed:     C.danger,
  // camera.status
  online:      C.success,
  offline:     C.danger,
  maintenance: C.warning,
  // detection.category
  person:  C.primary,
  vehicle: C.success,
  weapon:  C.danger,
};

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function MainDashboard() {
  const { user } = useAuthContext();
  const [timeRange, setTimeRange] = useState("monthly");
  const isSuperAdmin = user?.role === "Super Admin";

  // All data comes from real backend endpoints
  const { data: stats,       isLoading: statsLoading    } = useAdminDashboardStats();
  const { data: trends = [], isLoading: trendsLoading   } = useDetectionTrends(timeRange);
  const { data: logs   = [], isLoading: logsLoading     } = useActivityLogs();
  const { data: companies = []                          } = useAdminCompanies();
  const { data: overview,    isLoading: overviewLoading } = useDashboardOverview();
  const { data: intelligence, isLoading: intelligenceLoading } = useDashboardIntelligence();

  return (
    <AdminLayout
      title="System Overview Dashboard"
      subtitle="Real-time analytics and system monitoring"
    >
      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: isSuperAdmin ? "Active Companies" : "Organization",
            value: isSuperAdmin ? (stats?.activeCompanies ?? 0) : "Active",
            change: isSuperAdmin ? `${stats?.totalCompanies ?? 0} total` : "Current org",
            icon: Building2,
            changeType: "positive" as const,
            link: "/admin/companies",
          },
          {
            title: "Total Users",
            value: stats?.totalUsers ?? 0,
            change: `${stats?.activeOfficers ?? 0} officers online`,
            icon: Users,
            changeType: "positive" as const,
            link: "/admin/users",
          },
          {
            title: "Active Cameras",
            value: stats?.onlineDevices ?? 0,
            change: `${stats?.totalDevices ?? 0} total`,
            icon: Camera,
            changeType: "neutral" as const,
            link: "/admin/devices",
          },
          {
            title: "Total Registrations",
            value: stats?.totalDetections ?? 0,
            change: `${stats?.weaponDetections ?? 0} weapon detections`,
            icon: BarChart3,
            changeType: "positive" as const,
            iconColor: "text-warning",
            link: "/admin/analytics/detections",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={stat.link}>
              <StatsCard {...stat} className="hover:shadow-lg transition-shadow cursor-pointer" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Detection trends + companies/actions ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Area chart — real data from /dashboard/trends */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Detection Trends
                  </CardTitle>
                  <CardDescription>Detection activity over time</CardDescription>
                </div>
                <Tabs value={timeRange} onValueChange={setTimeRange}>
                  <TabsList className="grid grid-cols-4 w-auto">
                    <TabsTrigger value="daily"   className="text-xs">Daily</TabsTrigger>
                    <TabsTrigger value="weekly"  className="text-xs">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
                    <TabsTrigger value="yearly"  className="text-xs">Yearly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Loading…
                </div>
              ) : trends.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No detection data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="gradDet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.primary} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="detections"
                      stroke={C.primary}
                      fill="url(#gradDet)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Companies list (Super Admin) or quick actions (Company Admin) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isSuperAdmin
                  ? <><Building2 className="w-5 h-5 text-primary" /> Companies</>
                  : <><Activity  className="w-5 h-5 text-primary" /> Quick Actions</>
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isSuperAdmin ? (
                companies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No companies found</p>
                ) : (
                  companies.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.usersCount} users · {c.camerasCount} cameras
                        </p>
                      </div>
                      <Badge
                        variant={c.status === "active" ? "default" : "destructive"}
                        className="capitalize text-xs"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  ))
                )
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" className="justify-start gap-2" asChild>
                    <Link to="/admin/users"><Users className="w-4 h-4" />Manage Users</Link>
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" asChild>
                    <Link to="/admin/forms"><FileText className="w-4 h-4" />Form Templates</Link>
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" asChild>
                    <Link to="/admin/devices"><Cpu className="w-4 h-4" />Configure Devices</Link>
                  </Button>
                  <Button variant="outline" className="justify-start gap-2" asChild>
                    <Link to="/admin/officer-tracking"><MapPin className="w-4 h-4" />Officer Tracking</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Detection distribution (only when real data exists) ──────────────── */}
      {overview && (
        (overview.detectionsByCategory?.length > 0 || overview.detectionsByStatus?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* By category — pie */}
            {overview.detectionsByCategory?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Detections by Category
                    </CardTitle>
                    <CardDescription>Distribution of detection types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie
                            data={overview.detectionsByCategory}
                            cx="50%" cy="50%"
                            innerRadius={50} outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {overview.detectionsByCategory.map((entry, i) => (
                              <Cell
                                key={entry.name}
                                fill={STATUS_COLOR[entry.name] ?? CHART_COLORS[i % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 flex-1">
                        {overview.detectionsByCategory.map((cat, i) => (
                          <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: STATUS_COLOR[cat.name] ?? CHART_COLORS[i % CHART_COLORS.length] }}
                              />
                              <span className="text-sm capitalize">{cat.name}</span>
                            </div>
                            <span className="text-sm font-semibold">{cat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* By status — horizontal bar */}
            {overview.detectionsByStatus?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-info" />
                      Detections by Status
                    </CardTitle>
                    <CardDescription>Current detection workflow status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={overview.detectionsByStatus} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          width={90}
                        />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {overview.detectionsByStatus.map((entry, i) => (
                            <Cell
                              key={entry.name}
                              fill={STATUS_COLOR[entry.name] ?? CHART_COLORS[i % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )
      )}

      {/* ── Top cameras + recent activity ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top cameras — only when data exists */}
        {overview?.topCameras?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Top Cameras — Last 30 Days
                </CardTitle>
                <CardDescription>Most active cameras by detection count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview.topCameras.map((cam, i) => (
                    <div
                      key={cam.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cam.name}</p>
                        <p className="text-xs text-muted-foreground">{cam.id} · {cam.detections} detections</p>
                      </div>
                      <Badge
                        variant={cam.status === "online" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {cam.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent activity — real logs from /dashboard/logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/history">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No recent activity</div>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 6).map(log => {
                    const iconMap: Record<string, React.ReactNode> = {
                      detection: <Target className="w-4 h-4 text-primary" />,
                      camera: <Camera className="w-4 h-4 text-info" />,
                      user: <Users className="w-4 h-4 text-success" />,
                      company: <Building2 className="w-4 h-4 text-warning" />,
                      role: <Shield className="w-4 h-4 text-purple-500" />,
                      settings: <Zap className="w-4 h-4 text-muted-foreground" />,
                      auth: <Activity className="w-4 h-4 text-muted-foreground" />,
                    };
                    const actionColorMap: Record<string, string> = {
                      create: "text-green-600",
                      delete: "text-red-600",
                      update: "text-blue-600",
                      status_change: "text-orange-500",
                      login: "text-muted-foreground",
                      logout: "text-muted-foreground",
                    };
                    const changes = (log as any).changes as Array<{field: string; from: string; to: string}> | null;
                    const actionType = (log as any).actionType as string | null;

                    return (
                      <div
                        key={log.id}
                        className="rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors overflow-hidden"
                      >
                        {/* Main row */}
                        <div className="flex items-start gap-3 p-3">
                          <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                            log.type === "detection" ? "bg-primary/10" :
                            log.type === "camera" ? "bg-info/10" :
                            log.type === "user" ? "bg-success/10" :
                            log.type === "company" ? "bg-warning/10" : "bg-muted"
                          }`}>
                            {iconMap[log.type] ?? <Activity className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug">
                              <span className="font-semibold">{log.userName}</span>
                              {actionType && (
                                <span className={`ml-1 text-xs font-medium uppercase tracking-wide ${actionColorMap[actionType] ?? ""}`}>
                                  [{actionType.replace("_", " ")}]
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.action}</p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            {isSuperAdmin && (
                              <Badge variant="outline" className="text-[10px] mb-1 block max-w-[100px] truncate">
                                {log.companyName}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                            </p>
                          </div>
                        </div>

                        {/* Field-level changes (only for update actions) */}
                        {changes && changes.length > 0 && (
                          <div className="border-t border-border bg-muted/30 px-3 py-2 space-y-1">
                            {changes.slice(0, 4).map((c, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground font-medium w-24 shrink-0 truncate">{c.field}:</span>
                                <span className="text-red-500 line-through truncate max-w-[80px]">{c.from}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-green-600 font-medium truncate max-w-[80px]">{c.to}</span>
                              </div>
                            ))}
                            {changes.length > 4 && (
                              <p className="text-[10px] text-muted-foreground">+{changes.length - 4} more changes</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ENTERPRISE INTELLIGENCE SECTIONS (Only render when data exists)
          ═══════════════════════════════════════════════════════════════════════ */}

      {intelligence && (
        <>
          {/* ── Live Operational Statistics ──────────────────────────────────── */}
          {intelligence.liveStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mb-6"
            >
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary animate-pulse" />
                    Live Operational Statistics
                  </CardTitle>
                  <CardDescription>Real-time system activity (updates every minute)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-muted-foreground mb-1">Last Hour</p>
                      <p className="text-3xl font-bold text-primary">{intelligence.liveStats.detectionsLastHour}</p>
                      <p className="text-xs text-muted-foreground mt-1">detections</p>
                    </div>
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm text-muted-foreground mb-1">Last 24 Hours</p>
                      <p className="text-3xl font-bold text-success">{intelligence.liveStats.detectionsLast24h}</p>
                      <p className="text-xs text-muted-foreground mt-1">detections</p>
                    </div>
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-sm text-muted-foreground mb-1">Active Assignments</p>
                      <p className="text-3xl font-bold text-warning">{intelligence.liveStats.activeAssignments}</p>
                      <p className="text-xs text-muted-foreground mt-1">in progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Peak Hours Analysis + Resolution Metrics ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Hourly Distribution */}
            {intelligence.hourlyDistribution && intelligence.hourlyDistribution.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Peak Hours Analysis
                    </CardTitle>
                    <CardDescription>Detection activity by hour of day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={intelligence.hourlyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="hour"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickFormatter={(h) => `${h}:00`}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelFormatter={(h) => `Hour: ${h}:00`}
                        />
                        <Bar dataKey="detections" fill={C.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Resolution Metrics */}
            {intelligence.resolutionMetrics && intelligence.resolutionMetrics.totalHandled > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      Resolution Metrics
                    </CardTitle>
                    <CardDescription>Detection handling performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                          <span className="text-sm font-medium">Resolved</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-success">{intelligence.resolutionMetrics.resolved}</p>
                          <p className="text-xs text-muted-foreground">{intelligence.resolutionMetrics.resolutionRate}%</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-danger/10">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-danger" />
                          <span className="text-sm font-medium">Failed</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-danger">{intelligence.resolutionMetrics.failed}</p>
                          <p className="text-xs text-muted-foreground">{intelligence.resolutionMetrics.failureRate}%</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/20">
                        <p className="text-sm text-muted-foreground mb-1">Total Handled</p>
                        <p className="text-2xl font-bold">{intelligence.resolutionMetrics.totalHandled}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* ── Response Time + Camera Health ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Response Time Analytics */}
            {intelligence.responseTimeMetrics && intelligence.responseTimeMetrics.totalAssignments > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-info" />
                      Response Time Analytics
                    </CardTitle>
                    <CardDescription>Assignment to closure duration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-success/10 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Min</p>
                        <p className="text-xl font-bold text-success">
                          {intelligence.responseTimeMetrics.minHours?.toFixed(1) ?? 'N/A'}h
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Avg</p>
                        <p className="text-xl font-bold text-primary">
                          {intelligence.responseTimeMetrics.avgHours?.toFixed(1) ?? 'N/A'}h
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-danger/10 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Max</p>
                        <p className="text-xl font-bold text-danger">
                          {intelligence.responseTimeMetrics.maxHours?.toFixed(1) ?? 'N/A'}h
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">Total Assignments</p>
                      <p className="text-2xl font-bold">{intelligence.responseTimeMetrics.totalAssignments}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Camera Health */}
            {intelligence.cameraHealth && intelligence.cameraHealth.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-primary" />
                      Camera Health Status
                    </CardTitle>
                    <CardDescription>System-wide camera monitoring</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                        <span className="text-sm font-medium">Online</span>
                        <span className="text-xl font-bold text-success">{intelligence.cameraHealth.online}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-danger/10">
                        <span className="text-sm font-medium">Offline</span>
                        <span className="text-xl font-bold text-danger">{intelligence.cameraHealth.offline}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
                        <span className="text-sm font-medium">Flagged</span>
                        <span className="text-xl font-bold text-warning">{intelligence.cameraHealth.flagged}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                        <span className="text-sm font-medium">Stale (24h+)</span>
                        <span className="text-xl font-bold">{intelligence.cameraHealth.stale}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* ── Crime & Weapon Types + Officer Efficiency ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Crime & Weapon Types */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-danger" />
                    Threat Distribution
                  </CardTitle>
                  <CardDescription>Crime types and weapon detections</CardDescription>
                </CardHeader>
                <CardContent>
                  {intelligence.crimeTypeDistribution && intelligence.crimeTypeDistribution.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      <p className="text-sm font-semibold text-muted-foreground">Crime Types</p>
                      {intelligence.crimeTypeDistribution.slice(0, 5).map((crime, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-danger/10">
                          <span className="text-sm capitalize">{crime.type}</span>
                          <Badge variant="destructive">{crime.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">No criminal detections recorded</p>
                  )}
                  
                  {intelligence.weaponTypeDistribution && intelligence.weaponTypeDistribution.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">Weapon Types</p>
                      {intelligence.weaponTypeDistribution.slice(0, 5).map((weapon, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-warning/10">
                          <span className="text-sm">{weapon.type}</span>
                          <Badge variant="outline" className="bg-warning/20">{weapon.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No weapon detections recorded</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Officers */}
            {intelligence.topOfficers && intelligence.topOfficers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-warning" />
                      Top Performing Officers
                    </CardTitle>
                    <CardDescription>Officers by assignment success rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {intelligence.topOfficers.slice(0, 5).map((officer, i) => (
                        <div key={officer.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/10 text-warning font-semibold text-sm">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{officer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {officer.totalAssignments} assignments · {officer.resolved} resolved
                            </p>
                          </div>
                          <Badge
                            variant={officer.successRate >= 80 ? "default" : officer.successRate >= 50 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {officer.successRate.toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* ── Company Comparison (Super Admin only) ────────────────────────── */}
          {isSuperAdmin && intelligence.companyComparison && intelligence.companyComparison.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
              className="mb-6"
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple" />
                    Company Performance Comparison
                  </CardTitle>
                  <CardDescription>Multi-company operational metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {intelligence.companyComparison.map((company) => (
                      <div key={company.id} className="p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">{company.name}</p>
                          <Badge variant="outline">{company.detections} detections</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 rounded bg-primary/10">
                            <p className="text-muted-foreground">Cameras</p>
                            <p className="font-bold text-primary">{company.cameras}</p>
                          </div>
                          <div className="text-center p-2 rounded bg-success/10">
                            <p className="text-muted-foreground">Officers</p>
                            <p className="font-bold text-success">{company.officers}</p>
                          </div>
                          <div className="text-center p-2 rounded bg-warning/10">
                            <p className="text-muted-foreground">Detections</p>
                            <p className="font-bold text-warning">{company.detections}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Day of Week Distribution ─────────────────────────────────────── */}
          {intelligence.dayOfWeekDistribution && intelligence.dayOfWeekDistribution.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7 }}
              className="mb-6"
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Weekly Activity Pattern
                  </CardTitle>
                  <CardDescription>Detection distribution by day of week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={intelligence.dayOfWeekDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="detections" fill={C.success} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Traffic Violations by Region ─────────────────────────────────── */}
          {intelligence.trafficViolationsByRegion && intelligence.trafficViolationsByRegion.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 }}
              className="mb-6"
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-warning" />
                    Traffic Violations by Region
                  </CardTitle>
                  <CardDescription>Vehicle detections with plate numbers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {intelligence.trafficViolationsByRegion.map((region) => (
                      <div key={region.region} className="p-3 rounded-lg bg-warning/10 text-center">
                        <p className="text-2xl font-bold text-warning">{region.count}</p>
                        <p className="text-xs text-muted-foreground mt-1">{region.region}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {/* ── Quick links to detailed analytics ───────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Detailed Analytics</CardTitle>
            <CardDescription>Navigate to category-specific analytics pages for deeper insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Detections",  icon: Target,        link: "/admin/analytics/detections",         color: C.primary  },
                { label: "Crime Types", icon: AlertTriangle,  link: "/admin/analytics/crime-types",        color: C.danger   },
                { label: "Cameras",     icon: Camera,         link: "/admin/analytics/cameras",            color: C.success  },
                { label: "Users",       icon: Users,          link: "/admin/analytics/users",              color: C.info     },
                { label: "Companies",   icon: Building2,      link: "/admin/analytics/companies",          color: C.purple   },
                { label: "Comparison",  icon: BarChart3,      link: "/admin/analytics/company-comparison", color: C.warning  },
              ].map(item => (
                <Link key={item.label} to={item.link}>
                  <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 hover:shadow-md transition-all">
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
}