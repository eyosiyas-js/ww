import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminCompanies, useAdminDashboardStats } from "@/hooks/use-admin";
import { useSearchParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building2, Activity, Zap, TrendingUp, Filter, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMemo, useState } from "react";

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

export function CompaniesAnalytics() {
    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState({ 
        companyId: searchParams.get("companyId") || "all",
        includeChildren: true
    });
    const { user } = useAuthContext();
    const { data: allCompanies = [], isLoading: companiesLoading } = useAdminCompanies();
    const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();

    // In a real scenario, useAdminCompanies might also take filters.
    // For now, let's filter the companies list to reflect the "Include Children" logic in the UI
    // even if it's partly a frontend simulation here since CompaniesAnalytics is a bit special.
    const filteredCompanies = useMemo(() => {
        if (!filters.companyId || filters.companyId === "all") return allCompanies;
        
        // Find the target company
        const target = allCompanies.find(c => c.id === filters.companyId);
        if (!target) return allCompanies;

        if (!filters.includeChildren) return [target];

        // Hierarchical filter: find all descendants
        const getDescendants = (parentId: string): string[] => {
            const children = allCompanies.filter(c => c.parentId === parentId);
            let ids = children.map(c => c.id);
            for (const child of children) {
                ids = [...ids, ...getDescendants(child.id)];
            }
            return ids;
        };

        const descendantIds = getDescendants(filters.companyId);
        return allCompanies.filter(c => c.id === filters.companyId || descendantIds.includes(c.id));
    }, [allCompanies, filters]);

    const companies = filteredCompanies;

    const colors = ["hsl(199, 89%, 48%)", "hsl(38, 92%, 50%)", "hsl(152, 69%, 41%)", "hsl(0, 72%, 51%)"];

    // Calculate metrics
    const defaultActive = companies.filter((c) => c.status === "active").length;
    const activeCount = stats?.activeCompanies ?? defaultActive;


    if (companiesLoading || statsLoading) return <div className="p-8 text-center">Loading Companies Analytics...</div>;

    return (
        <AdminLayout title="Companies Analytics" subtitle="Organization performance and engagement">
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
                                {allCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                <StatCard title="Total Organizations" value={stats?.totalCompanies ?? 0} icon={Building2} color="primary" />
                <StatCard title="Active Subscriptions" value={activeCount} icon={Activity} color="emerald" />
                <StatCard title="Suspended Orgs" value={(stats?.totalCompanies ?? 0) - activeCount} icon={Zap} color="rose" />
                <StatCard title="Monthly Retention" value="99.2%" icon={TrendingUp} color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                <Card className="glass-card overflow-hidden border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            Users per Organization
                        </CardTitle>
                        <CardDescription>Size of organizations by headcount</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={companies.slice(0, 5).map(c => ({ name: c.name.split(" ")[0], count: c.usersCount }))}>
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
                    <CardTitle>Organization Data Rollup</CardTitle>
                    <CardDescription>Comprehensive metrics per onboarded company</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Company Name</TableHead>
                                    <TableHead>Admins Count</TableHead>
                                    <TableHead>Cameras Count</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companies.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="font-medium max-w-[150px] truncate">{row.name}</TableCell>
                                        <TableCell>{row.usersCount}</TableCell>
                                        <TableCell>{row.camerasCount}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${row.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <span className="text-xs capitalize">{row.status}</span>
                                            </div>
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
