import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History as HistoryIcon, Search, Filter, User, Car, Eye, Clock, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useHistory } from "@/hooks/use-history";
import { useState } from "react";

const categoryIcons = { person: User, vehicle: Car };

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { data: historyItems = [] } = useHistory();

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "monitoring": return <Eye className="w-4 h-4 text-primary" />;
      case "detected": return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "closed": return <CheckCircle className="w-4 h-4 text-success" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <AppLayout title="History" subtitle="View logs of detection requests">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><HistoryIcon className="w-5 h-5 text-primary" />Activity History</CardTitle>
              <CardDescription>Complete log of all detection requests and system activities</CardDescription>
            </div>
            <Button variant="outline" className="gap-2 w-fit"><Download className="w-4 h-4" />Export Log</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="detection">Detections</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="detected">Detected</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const CategoryIcon = item.type === "detection" ? categoryIcons[item.category as keyof typeof categoryIcons] : null;
                  return (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {CategoryIcon ? <CategoryIcon className="w-4 h-4 text-muted-foreground" /> : <HistoryIcon className="w-4 h-4 text-muted-foreground" />}
                          <span className="capitalize text-xs">{item.category || "Alert"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground max-w-[300px] truncate">{item.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <Badge variant="outline" className={`capitalize ${item.status === "detected" ? "border-destructive/50 text-destructive" : item.status === "closed" ? "border-success/50 text-success" : item.status === "monitoring" ? "border-primary/50 text-primary" : ""}`}>
                            {item.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">{new Date(item.timestamp).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <HistoryIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No matching records found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
