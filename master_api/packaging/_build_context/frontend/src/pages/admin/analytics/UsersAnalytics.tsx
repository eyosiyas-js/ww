import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminUsers, useAdminDashboardStats, useAdminCompanies } from "@/hooks/use-admin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Shield, UserX, UserCheck, Download, Filter, Search, FileText, Building2, UserPlus, Activity, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export function UsersAnalytics() {
    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState({ 
        companyId: searchParams.get("companyId") || "all",
        includeChildren: true
    });
    const { data: companies = [] } = useAdminCompanies();
    const { user } = useAuthContext();
    const { data: users = [], isLoading: usersLoading } = useAdminUsers(filters);
    const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();

    const colors = ["hsl(199, 89%, 48%)", "hsl(152, 69%, 41%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

    // Calculate metrics
    const activeUsers = users.filter((u) => u.status === "active").length;
    const roleDistribution = users.reduce((acc: any, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {});
    const roleData = Object.keys(roleDistribution).map((k) => ({ name: k, count: roleDistribution[k] }));

    if (usersLoading || statsLoading) return <div className="p-8 text-center">Loading Users Analytics...</div>;

    return (
        <AdminLayout title="Users Analytics" subtitle="Insights into system users and activity">
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
                <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} color="primary" />
                <StatCard title="Active Users" value={activeUsers} icon={UserCheck} color="emerald" />
                <StatCard title="Inactive Users" value={users.length - activeUsers} icon={UserX} color="rose" />
                <StatCard title="Platform Admins" value={roleDistribution["Super Admin"] || 0} icon={Shield} color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="glass-card overflow-hidden border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            Role Distribution
                        </CardTitle>
                        <CardDescription>Users categorized by their access levels</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={roleData}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={80}
                                        paddingAngle={5} dataKey="count" nameKey="name"
                                    >
                                        {roleData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-3 w-full max-w-[200px]">
                                {roleData.map((item: any, i: number) => (
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
                            <Users className="w-4 h-4 text-primary" />
                            Recent System Registrations
                        </CardTitle>
                        <CardDescription>Newest users signed up</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={roleData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                                <Bar dataKey="count" fill="hsl(152, 69%, 41%)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/50 col-span-2">
                <CardHeader>
                    <CardTitle>Raw User Data</CardTitle>
                    <CardDescription>Complete list of assigned active and inactive users</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>User Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Activity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="font-medium max-w-[150px] truncate">{row.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{row.email}</TableCell>
                                        <TableCell>{row.role}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${row.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="text-xs capitalize">{row.status}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-[11px]">
                                            {row.lastLogin ? format(new Date(row.lastLogin), "MMM d, HH:mm") : "Never"}
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
