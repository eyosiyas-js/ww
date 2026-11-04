import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanyComparison } from "@/hooks/use-admin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { useState, useMemo } from "react";
import { Download, Filter, Building2, TrendingUp, CheckCircle2, Clock, AlertTriangle, Scale } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
};

const COMPANY_COLORS = [
    "hsl(199, 89%, 48%)", "hsl(152, 69%, 41%)", "hsl(38, 92%, 50%)", 
    "hsl(0, 72%, 51%)", "hsl(270, 60%, 55%)", "hsl(330, 70%, 55%)",
    "hsl(180, 60%, 45%)", "hsl(20, 80%, 50%)"
];

export function CompanyComparison() {
    const [searchParams] = useSearchParams();
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        timeSeries: "monthly",
    });
    // For now, we fetch default companies (children of current user's org, or top 10 if super admin)
    // A future enhancement could be a multi-select dropdown for specific companies
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
    
    const { data: comparisonData, isLoading } = useCompanyComparison(selectedCompanyIds, filters);

    // Color map for companies
    const companyColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        (comparisonData?.companies ?? []).forEach((c, i) => {
            map[c.companyName] = COMPANY_COLORS[i % COMPANY_COLORS.length];
        });
        return map;
    }, [comparisonData?.companies]);

    // Format trend data for LineChart: period -> { companyName: count }
    const trendChartData = useMemo(() => {
        if (!comparisonData?.trends) return [];
        const periodMap: Record<string, Record<string, number>> = {};
        for (const t of comparisonData.trends) {
            if (!periodMap[t.period]) periodMap[t.period] = {};
            periodMap[t.period][t.companyName] = t.detections;
        }
        return Object.entries(periodMap).map(([period, companies]) => ({
            period,
            ...companies,
        }));
    }, [comparisonData?.trends]);

    const companyNames = Object.keys(companyColorMap);

    if (isLoading) return <div className="p-8 text-center flex flex-col items-center gap-4">
        <Scale className="w-8 h-8 animate-pulse text-muted-foreground" />
        <p>Loading Company Comparison Analytics...</p>
    </div>;

    const companies = comparisonData?.companies ?? [];

    return (
        <AdminLayout title="Company Comparison" subtitle="Benchmarking detection handling performance across organizations">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-xl mb-6 border border-border/50">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <Input type="date" className="h-9 w-[140px]" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} placeholder="Start" />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input type="date" className="h-9 w-[140px]" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} placeholder="End" />
                </div>

                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Download className="w-4 h-4" /> Export Report
                </Button>
            </div>

            <Tabs defaultValue="performance" className="space-y-6">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="performance" className="gap-2"><Scale className="w-4 h-4" /> Performance Metrics</TabsTrigger>
                    <TabsTrigger value="volume" className="gap-2"><TrendingUp className="w-4 h-4" /> Volume & Trends</TabsTrigger>
                </TabsList>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="glass-card overflow-hidden border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Resolution Rate Comparison
                                </CardTitle>
                                <CardDescription>% of assigned detections resolved successfully</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={companies} layout="vertical" margin={{ left: 50 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                        <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                                        <YAxis type="category" dataKey="companyName" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, 'Resolution Rate']} />
                                        <Bar dataKey="resolutionRate" fill="hsl(152, 69%, 41%)" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="glass-card overflow-hidden border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                    Avg Resolution Time (Hours)
                                </CardTitle>
                                <CardDescription>Time to resolve from creation</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={companies} layout="vertical" margin={{ left: 50 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} unit="h" />
                                        <YAxis type="category" dataKey="companyName" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value ? `${value.toFixed(1)}h` : 'N/A', 'Avg Resolution Time']} />
                                        <Bar dataKey="avgResolutionTimeHours" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle>Performance Ranking</CardTitle>
                            <CardDescription>Detailed KPI table for compared organizations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Organization</TableHead>
                                            <TableHead className="text-right">Total Registrations</TableHead>
                                            <TableHead className="text-right">Resolution Rate</TableHead>
                                            <TableHead className="text-right">SLA Compliance</TableHead>
                                            <TableHead className="text-right">Avg Response Time</TableHead>
                                            <TableHead className="text-right">Avg Resolution Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...companies].sort((a, b) => b.resolutionRate - a.resolutionRate).map((row) => (
                                            <TableRow key={row.companyId} className="hover:bg-muted/20 transition-colors">
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: companyColorMap[row.companyName] }} />
                                                    {row.companyName}
                                                </TableCell>
                                                <TableCell className="text-right">{row.totalDetections}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-semibold ${row.resolutionRate >= 80 ? 'text-emerald-500' : row.resolutionRate < 50 ? 'text-rose-500' : ''}`}>
                                                        {row.resolutionRate}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">{row.slaComplianceRate}%</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{row.avgResponseTimeHours != null ? `${row.avgResponseTimeHours}h` : '—'}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{row.avgResolutionTimeHours != null ? `${row.avgResolutionTimeHours}h` : '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Volume Tab */}
                <TabsContent value="volume" className="space-y-6">
                    <Card className="glass-card overflow-hidden border-border/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <div>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" />
                                    Detection Volume Trends
                                </CardTitle>
                                <CardDescription>Comparative detection volumes over time</CardDescription>
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
                                    {companyNames.map(cn => (
                                        <Line key={cn} type="monotone" dataKey={cn} stroke={companyColorMap[cn]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </AdminLayout>
    );
}
