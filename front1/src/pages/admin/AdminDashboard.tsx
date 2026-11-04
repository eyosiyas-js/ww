import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminDashboardStats, useDetectionTrends, useActivityLogs, useAdminCompanies } from "@/hooks/use-admin";
import { Building2, Users, Cpu, BarChart3, Activity, TrendingUp, Search, AlertTriangle, Clock, Filter, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuthContext } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuthContext();
  const [filterCompany, setFilterCompany] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = user?.role === "Super Admin";

  const { data: stats } = useAdminDashboardStats();
  const { data: trends = [] } = useDetectionTrends();
  const { data: activityLogs = [] } = useActivityLogs();
  const { data: companies = [] } = useAdminCompanies();

  const filteredLogs = activityLogs.filter(log => {
    if (isSuperAdmin && filterCompany !== "all" && log.companyName !== filterCompany) return false;
    if (searchQuery && !log.action.toLowerCase().includes(searchQuery.toLowerCase()) && !log.userName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout
      title={isSuperAdmin ? "Network Dashboard" : "Company Dashboard"}
      subtitle={isSuperAdmin ? "Global system overview" : "Organization operations overview"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: isSuperAdmin ? "Active Companies" : "Organization Status",
            value: isSuperAdmin ? (stats?.activeCompanies ?? 0) : "Active",
            change: isSuperAdmin ? `${stats?.totalCompanies ?? 0} total` : "Current Org",
            icon: Building2,
            changeType: "positive" as const
          },
          { title: "Total Users", value: stats?.totalUsers ?? 0, change: "+12 this month", icon: Users, changeType: "positive" as const },
          { title: "Total Devices", value: stats?.totalDevices ?? 0, change: `${stats?.onlineDevices ?? 0} online`, icon: Cpu, changeType: "neutral" as const },
          { title: "Detections (MTD)", value: stats?.totalDetections ?? 0, change: "+18% vs last month", icon: BarChart3, changeType: "positive" as const, iconColor: "text-warning" },
        ].map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Detection Trends</CardTitle>
              <CardDescription>Monthly detections across the network</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Bar dataKey="detections" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="Detections" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card h-full">
            <CardHeader><CardTitle className="flex items-center gap-2">{isSuperAdmin ? <Building2 className="w-5 h-5 text-primary" /> : <Activity className="w-5 h-5 text-primary" />}{isSuperAdmin ? "Companies" : "Quick Actions"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isSuperAdmin ? (
                companies.slice(0, 4).map(company => (
                  <div key={company.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div><p className="text-sm font-medium">{company.name}</p><p className="text-xs text-muted-foreground">{company.usersCount} users · {company.camerasCount} cameras</p></div>
                    <Badge variant={company.status === "active" ? "default" : "destructive"} className="capitalize text-xs">{company.status}</Badge>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" className="justify-start gap-2" asChild><a href="/admin/users"><Users className="w-4 h-4" />Manage Users</a></Button>
                  <Button variant="outline" className="justify-start gap-2" asChild><a href="/admin/forms"><FileText className="w-4 h-4" />Form Templates</a></Button>
                  <Button variant="outline" className="justify-start gap-2" asChild><a href="/admin/devices"><Cpu className="w-4 h-4" />Configure Devices</a></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />System Activity</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search activity..." className="pl-9 w-48" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              {isSuperAdmin && (
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className={`p-2 rounded-lg ${log.type === "detection" ? "bg-primary/10" : log.type === "camera" ? "bg-success/10" : log.type === "user" ? "bg-accent" : "bg-muted"}`}>
                  <Activity className={`w-4 h-4 ${log.type === "detection" ? "text-primary" : log.type === "camera" ? "text-success" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><span className="font-medium">{log.userName}</span> {log.action}</p>
                  <p className="text-xs text-muted-foreground">{log.target}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs capitalize">{log.companyName}</Badge>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
