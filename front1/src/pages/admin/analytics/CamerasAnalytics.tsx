import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminDevices, useAdminDashboardStats, useAdminCompanies } from "@/hooks/use-admin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Filter, Search, Building2, Eye, Activity, MapPin, EyeOff, Camera, Video, Wifi, WifiOff } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
};

function StatCard({ title, value, icon: Icon, color }: any) {
    return (
        <Card className="overflow-hidden border-none bg-secondary/20 shadow-none">
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                        <h3 className="text-2xl font-bold">{value}</h3>
                    </div>
                    <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function CamerasAnalytics() {
    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState({ 
        companyId: searchParams.get("companyId") || "all",
        includeChildren: true
    });
    const { data: companies = [] } = useAdminCompanies();
    const { user } = useAuthContext();
    const { data: devices = [], isLoading: devicesLoading } = useAdminDevices(filters);
    const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();

    const colors = ["hsl(199, 89%, 48%)", "hsl(38, 92%, 50%)", "hsl(152, 69%, 41%)", "hsl(0, 72%, 51%)"];

    // Calculate metrics
    const defaultOnline = devices.filter((d) => d.status === "online").length;
    // If stats.onlineDevices doesn't match properly due to mock mismatch, use either
    const onlineCount = stats?.onlineDevices ?? defaultOnline;

    const typeDistribution = devices.reduce((acc: any, d) => {
        const typeLabel = d.model.includes("PTZ") ? "PTZ" : d.model.includes("Bullet") ? "Bullet" : "Dome";
        acc[typeLabel] = (acc[typeLabel] || 0) + 1;
        return acc;
    }, {});
    const typeData = Object.keys(typeDistribution).map((k) => ({ name: k, count: typeDistribution[k] }));

    if (devicesLoading || statsLoading) return <div className="p-8 text-center">Loading Cameras Analytics...</div>;

    return (
        <AdminLayout title="Cameras Analytics" subtitle="Network device status and distributions">
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-xl mb-6 border border-border/50">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                { (user?.role === "Super Admin" || user?.role === "Company Admin") && (
                    <div className="flex items-center gap-3">
                        <Select value={filters.companyId} onValueChange={(v) => setFilters({ ...filters, companyId: v })}>
                            <SelectTrigger className="w-[200px] h-9">
                                <Building2 className="w-3.5 h-3.5 mr-2 opacity-70" />
                                <SelectValue placeholder="All Companies" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Companies</SelectItem>
                                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2 px-3 h-9 bg-background/50 border border-border/50 rounded-md">
                            <Switch 
                                id="include-children" 
                                checked={filters.includeChildren} 
                                onCheckedChange={(v) => setFilters({ ...filters, includeChildren: v })} 
                            />
                            <Label htmlFor="include-children" className="text-[10px] uppercase tracking-wider font-bold opacity-70 cursor-pointer whitespace-nowrap">
                                Include Children
                            </Label>
                        </div>
                    </div>
                )}

                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Download className="w-4 h-4" /> Export Report
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Connected" value={stats?.totalDevices ?? 0} icon={Camera} color="primary" />
                <StatCard title="Streaming Online" value={onlineCount} icon={Wifi} color="emerald" />
                <StatCard title="Offline Cameras" value={(stats?.totalDevices ?? 0) - onlineCount} icon={WifiOff} color="rose" />
                <StatCard title="Storage Consumed" value="~14.2 TB" icon={Video} color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="glass-card overflow-hidden border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Camera className="w-4 h-4 text-primary" />
                            Camera Models Overview
                        </CardTitle>
                        <CardDescription>Cameras grouped by visual capability</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={80}
                                        paddingAngle={5} dataKey="count" nameKey="name"
                                    >
                                        {typeData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-3 w-full max-w-[200px]">
                                {typeData.map((item: any, i: number) => (
                                    <div key={item.name} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                                            <span className="capitalize">{item.name}</span>
                                        </div>
                                        <span className="font-semibold">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card overflow-hidden border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Video className="w-4 h-4 text-primary" />
                            Cameras by Organization
                        </CardTitle>
                        <CardDescription>Hardware distributed per client company</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={typeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                                <Bar dataKey="count" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/50 col-span-2">
                <CardHeader>
                    <CardTitle>Raw Device Integration Data</CardTitle>
                    <CardDescription>Full connectivity status for monitoring feeds</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Camera Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Ping</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="font-medium max-w-[150px] truncate">{row.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{row.location}</TableCell>
                                        <TableCell>{row.model}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${row.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="text-xs capitalize">{row.status}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-[11px]">
                                            {format(new Date(row.lastPing), "MMM d, HH:mm")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
