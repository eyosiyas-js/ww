import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminCompanies, useCrimeTypeAnalytics } from "@/hooks/use-admin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { useState, useMemo } from "react";
import { Download, Filter, Building2, MapPin, Tag, Layers, Clock, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
};

const CRIME_COLORS = [
    "hsl(0, 72%, 51%)", "hsl(38, 92%, 50%)", "hsl(199, 89%, 48%)", 
    "hsl(152, 69%, 41%)", "hsl(270, 60%, 55%)", "hsl(330, 70%, 55%)",
    "hsl(180, 60%, 45%)", "hsl(20, 80%, 50%)"
];

export function CrimeTypeAnalytics() {
    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState({
        companyId: searchParams.get("companyId") || "all",
        includeChildren: true,
        startDate: "",
        endDate: "",
        timeSeries: "monthly",
    });
    const { user } = useAuthContext();
    const { data: companies = [] } = useAdminCompanies();
    const { data: crimeData, isLoading } = useCrimeTypeAnalytics(filters);

    // Build crime type color map
    const crimeColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        (crimeData?.distribution ?? []).forEach((item, i) => {
            map[item.crimeType] = CRIME_COLORS[i % CRIME_COLORS.length];
        });
        return map;
    }, [crimeData?.distribution]);

    const allCrimeTypes = useMemo(() => {
        return (crimeData?.distribution ?? []).map(d => d.crimeType);
    }, [crimeData?.distribution]);

    // Aggregate trends for area chart
    const trendChartData = useMemo(() => {
        if (!crimeData?.trendsOverTime) return [];
        const periodMap: Record<string, Record<string, number>> = {};
        for (const t of crimeData.trendsOverTime) {
            if (!periodMap[t.period]) periodMap[t.period] = {};
            periodMap[t.period][t.crimeType] = t.count;
        }
        
        // Ensure all periods have entries for all crime types (fill with 0 if missing)
        const allPeriods = Object.keys(periodMap);
        const result = allPeriods.map(period => {
            const periodData: Record<string, any> = { period };
            allCrimeTypes.forEach(crimeType => {
                periodData[crimeType] = periodMap[period][crimeType] || 0;
            });
            return periodData;
        });
        
        return result;
    }, [crimeData?.trendsOverTime, allCrimeTypes]);

    // Top locations table
    const locationTable = useMemo(() => {
        if (!crimeData?.byLocation) return [];
        const locMap: Record<string, Record<string, number>> = {};
        for (const item of crimeData.byLocation) {
            if (!locMap[item.location]) locMap[item.location] = {};
            locMap[item.location][item.crimeType] = (locMap[item.location][item.crimeType] || 0) + item.count;
        }
        return Object.entries(locMap).map(([location, types]) => ({
            location,
            total: Object.values(types).reduce((a, b) => a + b, 0),
            types,
        })).sort((a, b) => b.total - a.total);
    }, [crimeData?.byLocation]);

    // Heatmap data: hours x crime types
    const heatmapRows = useMemo(() => {
        if (!crimeData?.heatmap || allCrimeTypes.length === 0) return [];
        const hourMap: Record<number, Record<string, number>> = {};
        for (let h = 0; h < 24; h++) hourMap[h] = {};
        for (const cell of crimeData.heatmap) {
            hourMap[cell.hour][cell.crimeType] = cell.count;
        }
        return Object.entries(hourMap).map(([hour, types]) => ({
            hour: `${String(hour).padStart(2, "0")}:00`,
            ...types,
        }));
    }, [crimeData?.heatmap, allCrimeTypes]);

    if (isLoading) return <div className="p-8 text-center">Loading Crime Type Analytics...</div>;

    const totalCrimes = (crimeData?.distribution ?? []).reduce((sum, d) => sum + d.count, 0);
    const topCrime = (crimeData?.distribution ?? []).sort((a, b) => b.count - a.count)[0];

    return (
        <AdminLayout title="Crime Type Analytics" subtitle="Dedicated analysis of detection crime types and patterns">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-xl mb-6 border border-border/50">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                {(user?.role === "Super Admin" || user?.role === "Company Admin") && (
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
                            <Switch id="include-children-crime" checked={filters.includeChildren} onCheckedChange={(v) => setFilters({ ...filters, includeChildren: v })} />
                            <Label htmlFor="include-children-crime" className="text-[10px] uppercase tracking-wider font-bold opacity-70 cursor-pointer whitespace-nowrap">Include Children</Label>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <Input type="date" className="h-9 w-[140px]" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input type="date" className="h-9 w-[140px]" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
                </div>

                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Download className="w-4 h-4" /> Export
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="overflow-hidden border-none bg-secondary/20 shadow-none">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Total Crime Detections</p>
                                <h3 className="text-2xl font-bold">{totalCrimes}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-none bg-secondary/20 shadow-none">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Crime Types Tracked</p>
                                <h3 className="text-2xl font-bold">{allCrimeTypes.length}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <Layers className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-none bg-secondary/20 shadow-none">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Most Common Type</p>
                                <h3 className="text-2xl font-bold capitalize">{topCrime?.crimeType || "—"}</h3>
                                {topCrime && <p className="text-xs text-muted-foreground mt-1">{topCrime.count} detections</p>}
                            </div>
                            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="distribution" className="space-y-6">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="distribution" className="gap-2"><Tag className="w-4 h-4" /> Distribution</TabsTrigger>
                    <TabsTrigger value="trends" className="gap-2"><TrendingUp className="w-4 h-4" /> Trends</TabsTrigger>
                    <TabsTrigger value="location" className="gap-2"><MapPin className="w-4 h-4" /> By Location</TabsTrigger>
                    <TabsTrigger value="heatmap" className="gap-2"><Clock className="w-4 h-4" /> Time Heatmap</TabsTrigger>
                </TabsList>

                {/* Distribution */}
                <TabsContent value="distribution" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="glass-card overflow-hidden border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold">Crime Type Distribution</CardTitle>
                                <CardDescription>Breakdown of detections by crime type</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row items-center justify-around gap-4">
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie data={crimeData?.distribution ?? []} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={3} dataKey="count" nameKey="crimeType">
                                                {(crimeData?.distribution ?? []).map((item, i) => (
                                                    <Cell key={i} fill={crimeColorMap[item.crimeType] || CRIME_COLORS[i % CRIME_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2.5 w-full max-w-[220px]">
                                        {(crimeData?.distribution ?? []).map((item, i) => (
                                            <div key={item.crimeType} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: crimeColorMap[item.crimeType] }} />
                                                    <span className="capitalize">{item.crimeType}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{item.count}</span>
                                                    <span className="text-[10px] text-muted-foreground">({totalCrimes > 0 ? Math.round(item.count / totalCrimes * 100) : 0}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card overflow-hidden border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold">Crime by Company</CardTitle>
                                <CardDescription>Crime type distribution across organizations</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={crimeData?.byCompany ?? []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="companyName" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                                            {(crimeData?.byCompany ?? []).map((item, i) => (
                                                <Cell key={i} fill={crimeColorMap[item.crimeType] || CRIME_COLORS[i % CRIME_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Trends */}
                <TabsContent value="trends">
                    <Card className="glass-card overflow-hidden border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <div>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Crime Trends Over Time
                            </CardTitle>
                            <CardDescription>Volume of different crime types over time</CardDescription>
                        </div>
                        <Select value={filters.timeSeries} onValueChange={(v) => setFilters({ ...filters, timeSeries: v })}>
                            <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/50 border-none shadow-none">
                                <Clock className="w-3 h-3 mr-2 opacity-70" />
                                <SelectValue placeholder="Interval" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={trendChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend verticalAlign="top" height={36} />
                                    {allCrimeTypes.map((ct, i) => (
                                        <Line 
                                            key={ct} 
                                            type="monotone" 
                                            dataKey={ct} 
                                            stroke={crimeColorMap[ct] || CRIME_COLORS[i % CRIME_COLORS.length]} 
                                            strokeWidth={3}
                                            dot={{ fill: crimeColorMap[ct] || CRIME_COLORS[i % CRIME_COLORS.length], strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, stroke: crimeColorMap[ct] || CRIME_COLORS[i % CRIME_COLORS.length], strokeWidth: 2 }}
                                            connectNulls={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* By Location */}
                <TabsContent value="location">
                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle>Crime Types by Location</CardTitle>
                            <CardDescription>Which crime types occur at which locations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Total</TableHead>
                                            {allCrimeTypes.map(ct => (
                                                <TableHead key={ct} className="capitalize text-xs">{ct}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {locationTable.map(row => (
                                            <TableRow key={row.location} className="hover:bg-muted/20 transition-colors">
                                                <TableCell className="font-medium">{row.location}</TableCell>
                                                <TableCell className="font-bold">{row.total}</TableCell>
                                                {allCrimeTypes.map(ct => (
                                                    <TableCell key={ct}>
                                                        {row.types[ct] ? (
                                                            <span className="inline-flex items-center justify-center w-8 h-6 rounded text-xs font-semibold" style={{ backgroundColor: `${crimeColorMap[ct]}20`, color: crimeColorMap[ct] }}>
                                                                {row.types[ct]}
                                                            </span>
                                                        ) : <span className="text-muted-foreground">—</span>}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                        {locationTable.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={allCrimeTypes.length + 2} className="text-center py-8 text-muted-foreground">
                                                    No crime type location data available
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Time Heatmap */}
                <TabsContent value="heatmap">
                    <Card className="glass-card overflow-hidden border-border/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold">Time of Day vs Crime Type</CardTitle>
                            <CardDescription>Correlation between detection time and crime type (hourly)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={500}>
                                <BarChart data={heatmapRows} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={50} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend verticalAlign="top" height={36} />
                                    {allCrimeTypes.map((ct, i) => (
                                        <Bar key={ct} dataKey={ct} stackId="a" fill={crimeColorMap[ct]} barSize={16} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AdminLayout>
    );
}
