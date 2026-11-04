import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Company } from "@/data/adminMockData";
import { useAdminCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from "@/hooks/use-admin";
import { Plus, Pencil, Trash2, Search, CornerDownRight, Network, List as ListIcon, BarChart3, ChevronRight, ChevronDown, Building2, MapPin, Maximize2 } from "lucide-react";
import React, { Suspense } from "react";

const LocationPicker = React.lazy(() => import("@/components/admin/LocationPicker"));

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface TreeNodeProps {
  company: Company;
  onEdit: (c: Company) => void;
  onViewData: (id: string) => void;
  children?: Company[];
  level: number;
}

const Node = ({ company, onEdit, onViewData, children = [], level }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const childrenRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col items-center relative gap-12">
      {/* Node Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className="relative z-20"
      >
        <div 
          className="group relative flex flex-col items-center w-64 p-5 bg-white border-2 border-border/40 rounded-3xl shadow-sm hover:shadow-2xl hover:border-primary/50 transition-all duration-500 cursor-default"
          style={{ borderTop: `6px solid hsl(${level * 60}, 70%, 50%)` }}
        >
          {/* Status Glow */}
          <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-30 ${
            company.status === 'active' ? 'bg-emerald-500 shadow-emerald-200' : 
            company.status === 'suspended' ? 'bg-rose-500 shadow-rose-200' : 'bg-slate-400'
          }`} />

          <div className="flex flex-col items-center text-center gap-3 w-full">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
              <Network className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg tracking-tight text-slate-800">{company.name}</h3>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{company.status}</span>
              </div>
            </div>

            {/* Actions overlay */}
            <div className="flex items-center gap-2 pt-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onViewData(company.id)}
                    className="h-8 text-[11px] font-bold px-3 hover:bg-primary/10 hover:text-primary rounded-xl"
                >
                    <BarChart3 className="w-3.5 h-3.5 mr-1" /> Data
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(company)}
                    className="w-8 h-8 rounded-xl hover:bg-primary hover:text-white"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </Button>
            </div>
          </div>

          {children.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-border/50 rounded-full flex items-center justify-center hover:border-primary hover:text-primary transition-all z-30 shadow-sm"
            >
              <div className={`w-2 h-2 border-b-2 border-r-2 border-current transform transition-transform duration-300 ${isExpanded ? 'rotate-[-135deg] translate-y-0.5' : 'rotate-45 -translate-y-0.5'}`} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Children Section */}
      <AnimatePresence>
        {isExpanded && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-16 relative pt-4"
          >
            {/* SVG Connector Lines */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-10" style={{ marginTop: '-32px' }}>
              {children.map((child, idx) => (
                <Connector 
                    key={child.id} 
                    count={children.length} 
                    index={idx}
                />
              ))}
            </svg>
            
                {children.map((child) => (
              <Node 
                key={child.id} 
                company={child} 
                onEdit={onEdit} 
                onViewData={onViewData}
                children={(child as any).children}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Connector = ({ count, index }: { count: number; index: number }) => {
    // If only one child, just a straight line
    if (count === 1) {
        return <line x1="50%" y1="0" x2="50%" y2="32" stroke="currentColor" className="text-border/40" strokeWidth="2" />;
    }

    const isFirst = index === 0;
    const isLast = index === count - 1;
    const offset = `${(index / (count - 1)) * 100}%`;

    return (
        <g>
            {/* Vertical line from parent */}
            {index === 0 && <line x1="50%" y1="0" x2="50%" y2="16" stroke="currentColor" className="text-border/40" strokeWidth="2" />}
            
            {/* Horizontal line */}
            <line 
                x1={isFirst ? "50%" : "0"} 
                x2={isLast ? "50%" : "100%"} 
                y1="16" 
                y2="16" 
                stroke="currentColor" 
                className="text-border/40" 
                strokeWidth="2" 
                style={{ left: offset }}
            />
            
            {/* Vertical line to child */}
            <line x1="50%" y1="16" x2="50%" y2="32" stroke="currentColor" className="text-border/40" strokeWidth="2" style={{ left: offset }} />
        </g>
    );
};

// Updated HierarchyTree with relative positioning logic
function HierarchyTree({ companies, onEdit, onViewData }: { 
    companies: Company[]; 
    onEdit: (c: Company) => void; 
    onViewData: (id: string) => void;
}) {
    const treeData = useMemo(() => {
        const map = new Map<string, Company & { children: Company[] }>();
        const roots: (Company & { children: Company[] })[] = [];

        companies.forEach(c => map.set(c.id, { ...c, children: [] }));
        
        companies.forEach(c => {
            if (c.parentId && c.parentId !== "none") {
                const parent = map.get(c.parentId);
                if (parent) {
                    parent.children.push(map.get(c.id)!);
                } else {
                    roots.push(map.get(c.id)!);
                }
            } else {
                roots.push(map.get(c.id)!);
            }
        });

        return roots;
    }, [companies]);

    return (
        <div className="flex flex-col items-center gap-20 py-12">
            {treeData.map((root) => (
                <Node 
                    key={root.id} 
                    company={root} 
                    onEdit={onEdit} 
                    onViewData={onViewData} 
                    children={root.children}
                    level={0}
                />
            ))}
        </div>
    );
}

export default function CompanyManagement() {
  const { toast } = useToast();
  const { user, refreshProfile } = useAuthContext();
  const { data: companies = [], isLoading } = useAdminCompanies();
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "tree">("tree");
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ 
    name: "", 
    adminEmail: "", 
    status: "active" as Company["status"],
    features: { detections: "full", fingerprint: "full" } as any,
    parentId: "none" as string,
    companyType: "general" as "general" | "traffic_police",
    lat: undefined as number | undefined,
    lng: undefined as number | undefined
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [initialFeatures, setInitialFeatures] = useState<any>(null);
  const [showCascadePrompt, setShowCascadePrompt] = useState(false);

  const filtered = useMemo(() => {
    return companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [companies, search]);

  // Build tree structure for both Tree and List views
  const treeData = useMemo(() => {
    const map = new Map<string, Company & { children: any[] }>();
    const roots: any[] = [];

    companies.forEach(c => map.set(c.id, { ...c, children: [] }));
    
    companies.forEach(c => {
        if (c.parentId && c.parentId !== "none") {
            const parent = map.get(c.parentId);
            if (parent) {
                parent.children.push(map.get(c.id)!);
            } else {
                roots.push(map.get(c.id)!);
            }
        } else {
            roots.push(map.get(c.id)!);
        }
    });

    return roots;
  }, [companies]);

  // Hierarchically flattened list for the table
  const visibleRows = useMemo(() => {
    const result: { item: Company; depth: number; hasChildren: boolean }[] = [];
    
    const searchLower = search.toLowerCase();
    
    // Check if a node or any of its descendants match search
    const matchesSearch = (node: any): boolean => {
      if (node.name.toLowerCase().includes(searchLower)) return true;
      return node.children.some((child: any) => matchesSearch(child));
    };

    const traverse = (nodes: any[], depth: number) => {
      nodes.forEach(node => {
        const isMatch = !search || matchesSearch(node);
        if (!isMatch) return;

        const hasChildren = node.children.length > 0;
        result.push({ item: node, depth, hasChildren });

        // If searching, expandedNodes is ignored and we show all matches
        // If not searching, only recurse if expanded
        const shouldExpand = search ? true : expandedNodes.has(node.id);
        
        if (shouldExpand && hasChildren) {
          traverse(node.children, depth + 1);
        }
      });
    };

    traverse(treeData, 0);
    return result;
  }, [treeData, expandedNodes, search]);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const openCreate = () => { 
    setEditingCompany(null); 
    setForm({ 
      name: "", 
      adminEmail: "", 
      status: "active", 
      features: { detections: "full", fingerprint: "full" }, 
      parentId: "none",
      companyType: "general",
      lat: undefined,
      lng: undefined
    }); 
    setShowModal(true); 
  };
  
  const openEdit = (c: Company) => { 
    setEditingCompany(c); 
    const feats = c.features || { detections: "full", fingerprint: "full" };
    setInitialFeatures(JSON.parse(JSON.stringify(feats)));
    setForm({ 
      ...c, 
      features: JSON.parse(JSON.stringify(feats)),
      parentId: c.parentId || "none",
      companyType: c.companyType || "general",
      lat: c.lat,
      lng: c.lng
    }); 
    setShowModal(true); 
  };

  const handleSave = async (cascade?: boolean) => {
    if (!form.name || !form.adminEmail) return;

    // Detection for feature propagation prompt
    if (editingCompany && cascade === undefined) {
      const featuresChanged = JSON.stringify(form.features) !== JSON.stringify(initialFeatures);
      const hasChildren = companies.some(c => c.parentId === editingCompany.id);
      
      if (featuresChanged && hasChildren) {
        setShowCascadePrompt(true);
        return;
      }
    }

    try {
      const payload = { ...form };
      if (payload.parentId === "none") {
        delete (payload as any).parentId;
      }

      if (editingCompany) {
        await updateMutation.mutateAsync({ 
          id: editingCompany.id, 
          updates: { ...payload, cascadeFeatures: cascade } 
        });
        toast({ title: "Company updated" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Company created", description: "Company Admin account auto-generated." });
      }
      setShowModal(false);
      setShowCascadePrompt(false);
      refreshProfile();
    } catch (error) {
      toast({ title: "Action failed", description: "Could not save company.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Company deleted", variant: "destructive" });
      refreshProfile();
    } catch (error) {
      toast({ title: "Delete failed", description: "Could not delete company.", variant: "destructive" });
    }
  };

  const parentCompany = form.parentId !== "none" ? companies.find(c => c.id === form.parentId) : null;
  const parentFeatures = parentCompany?.features || { detections: "full", fingerprint: "full" };
  const getDisabled = (feature: string, option: string) => {
    const pVal = parentFeatures[feature as keyof typeof parentFeatures] || "full";
    if (pVal === "none") return option !== "none";
    if (pVal === "view") return option === "full";
    return false;
  };

  return (
    <AdminLayout title="Company Management" subtitle="Create, edit, and manage companies">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search companies..." 
              className="pl-9 w-72 bg-card/50 border-border/50 rounded-xl focus:ring-primary/20" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          
          <div className="flex p-1 bg-muted/40 rounded-xl border border-border/50 backdrop-blur-sm">
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("list")}
              className={`gap-2 rounded-lg px-4 ${viewMode === "list" ? "shadow-sm bg-white border border-border/20" : ""}`}
            >
              <ListIcon className="w-4 h-4" /> List
            </Button>
            <Button 
              variant={viewMode === "tree" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("tree")}
              className={`gap-2 rounded-lg px-4 ${viewMode === "tree" ? "shadow-sm bg-white border border-border/20" : ""}`}
            >
              <Network className="w-4 h-4" /> Family Tree
            </Button>
          </div>
        </div>

        <Button onClick={openCreate} className="gap-2 h-10 px-5 rounded-xl shadow-lg border-b-4 border-primary/20 active:border-b-0 active:translate-y-1 transition-all">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/50 shadow-xl">
        {isLoading ? (
          <div className="p-20 text-center text-muted-foreground flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="font-medium animate-pulse">Loading company architecture...</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="font-bold py-4">Company</TableHead>
                  <TableHead className="font-bold">Admin Email</TableHead>
                  <TableHead className="font-bold">Users</TableHead>
                  <TableHead className="font-bold">Cameras</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map(({ item: c, depth, hasChildren }) => {
                  const isExpanded = search ? true : expandedNodes.has(c.id);

                  return (
                    <TableRow key={c.id} className="hover:bg-primary/5 transition-colors border-border/40 group">
                      <TableCell className="font-semibold py-4">
                        <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                          <div className="w-6 flex items-center justify-center">
                            {hasChildren && !search && (
                              <button 
                                onClick={(e) => toggleNode(c.id, e)}
                                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                            {depth > 0 && !hasChildren && (
                              <div className="w-4 h-4 border-l-2 border-b-2 border-border/40 rounded-bl-md ml-2 -translate-y-2 opacity-50" />
                            )}
                          </div>
                          <div className={`flex items-center gap-2 p-1.5 rounded-lg transition-all ${depth === 0 ? 'bg-primary/5 text-primary border border-primary/10 px-3' : ''}`}>
                            {depth === 0 && <Building2 className="w-3.5 h-3.5 opacity-70" />}
                            {c.name}
                          </div>
                        </div>
                      </TableCell>
                    <TableCell className="text-muted-foreground font-medium">{c.adminEmail}</TableCell>
                    <TableCell className="font-bold">{c.usersCount}</TableCell>
                    <TableCell className="font-bold">{c.camerasCount}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : c.status === "suspended" ? "destructive" : "secondary"} className="capitalize font-bold">
                        {c.status}
                      </Badge>
                      {c.companyType === "traffic_police" && (
                        <Badge variant="outline" className="ml-2 text-xs border-primary/50 text-primary">Traffic Police</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap pr-6">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/analytics/companies?companyId=${c.id}`)} className="gap-2 h-8 rounded-lg">
                        <BarChart3 className="w-3.5 h-3.5" />View Data
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(c)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                      No companies match your search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 bg-muted/5 min-h-[600px] relative overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
                <Network className="w-16 h-16 opacity-10" />
                <p className="font-medium">No company structure found.</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center">
                <div className="mb-6 flex items-center gap-4 bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-sm z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Organization Root</span>
                  </div>
                  <div className="w-px h-4 bg-border/50" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Active</span>
                  </div>
                  <div className="w-px h-4 bg-border/50" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Suspended</span>
                  </div>
                </div>
                
                <div className="relative w-full overflow-x-auto pb-10 custom-scrollbar">
                  <div className="flex justify-center min-w-max p-4">
                    <HierarchyTree 
                        companies={companies} 
                        onEdit={openEdit} 
                        onViewData={(id) => navigate(`/admin/analytics/companies?companyId=${id}`)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-border/50 shadow-2xl rounded-2xl">
          <div className="bg-primary p-6 text-primary-foreground relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {editingCompany ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                {editingCompany ? "Edit Organization" : "New Organization"}
              </DialogTitle>
              <p className="text-primary-foreground/70 text-sm font-medium">Configure company details and hierarchical permissions.</p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">General Info</Label>
                <div className="space-y-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter company name" className="rounded-xl mt-1.5 focus:ring-primary/20" />
                  </div>
                  <div>
                    <Label>Admin Email</Label>
                    <Input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder="admin@company.com" className="rounded-xl mt-1.5 focus:ring-primary/20" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Deployment Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Company["status"] }))}>
                      <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active" className="text-green-600 font-bold">● Active</SelectItem>
                        <SelectItem value="suspended" className="text-red-600 font-bold">● Suspended</SelectItem>
                        <SelectItem value="inactive" className="text-muted-foreground font-bold">● Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Company Type</Label>
                    <Select value={form.companyType} onValueChange={v => setForm(f => ({ ...f, companyType: v as any }))}>
                      <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general" className="font-bold">General Company</SelectItem>
                        <SelectItem value="traffic_police" className="font-bold">Traffic Police</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[10px]">Latitude</Label>
                        <Input 
                          value={form.lat?.toFixed(6) || ""} 
                          readOnly 
                          placeholder="0.000000" 
                          className="h-8 text-xs bg-background/50" 
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Longitude</Label>
                        <Input 
                          value={form.lng?.toFixed(6) || ""} 
                          readOnly 
                          placeholder="0.000000" 
                          className="h-8 text-xs bg-background/50" 
                        />
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full gap-2 text-xs h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => setShowLocationPicker(prev => !prev)}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {showLocationPicker ? "Hide Map" : form.lat ? "Change Location on Map" : "Select Location on Map"}
                    </Button>
                  </div>
                  {showLocationPicker && (
                    <div className="mt-4">
                      <Suspense fallback={<div className="h-[300px] w-full bg-muted animate-pulse rounded-xl" />}>
                        <LocationPicker 
                          initialLat={form.lat} 
                          initialLng={form.lng} 
                          onSelect={(lat, lng) => setForm(f => ({ ...f, lat, lng }))} 
                        />
                      </Suspense>
                      <p className="text-[10px] text-muted-foreground mt-2 italic">
                        Click anywhere on the map to set the company's precise location marker.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {(user?.role === "Super Admin" || user?.role?.toLowerCase().includes("super")) && (
              <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                <Label className="font-bold flex items-center gap-2 mb-3">
                  <Network className="w-4 h-4 text-primary" />
                  Parent Organization
                </Label>
                <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                  <SelectTrigger className="rounded-xl bg-background shadow-sm border-border/50">
                    <SelectValue placeholder="No parent (Root level)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="none" className="font-bold">None (Top Level Organization)</SelectItem>
                    {companies.filter(c => c.id !== editingCompany?.id).map(c => (
                      <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-2 italic flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  Child organizations inherit their maximum permission levels from the selected parent.
                </p>
              </div>
            )}
            
            <div className="pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 block">Feature Granularity</Label>
              <div className="space-y-3">
                {[
                  { id: "detections", label: "Real-time Detections", desc: "AI analytics and live alerts" },
                  { id: "fingerprint", label: "Biometric Search", desc: "Fingerprint ID and matching" }
                ].map((feat) => (
                  <div key={feat.id} className="flex items-center justify-between p-3 bg-card border border-border/40 rounded-xl hover:shadow-sm transition-all">
                    <div>
                      <Label className="font-bold text-sm">{feat.label}</Label>
                      <p className="text-[10px] text-muted-foreground leading-tight">{feat.desc}</p>
                    </div>
                    <Select 
                      value={form.features?.[feat.id] || "full"} 
                      onValueChange={v => setForm(f => ({ ...f, features: { ...f.features, [feat.id]: v } }))}
                    >
                      <SelectTrigger className="w-36 h-9 text-xs rounded-lg font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full" disabled={getDisabled(feat.id, "full")}>Full Access</SelectItem>
                        {feat.id !== "fingerprint" && <SelectItem value="view" disabled={getDisabled(feat.id, "view")}>Read-Only</SelectItem>}
                        <SelectItem value="none">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t border-border/50 gap-3">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="rounded-xl font-bold h-11 px-6">Cancel</Button>
            <Button onClick={() => handleSave()} className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20 min-w-32">
              {editingCompany ? "Save Changes" : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCascadePrompt} onOpenChange={setShowCascadePrompt}>
        <AlertDialogContent className="rounded-2xl border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <Network className="w-6 h-6 text-primary" />
              Apply to child organizations?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium pt-2">
              You have modified the feature granularities for this organization. 
              Would you like to apply these same restrictions to all child organizations in the hierarchy?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel 
              onClick={() => handleSave(false)}
              className="rounded-xl border-border/50 hover:bg-slate-50 font-bold"
            >
              Only this company
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleSave(true)}
              className="rounded-xl font-bold bg-primary shadow-lg shadow-primary/20"
            >
              Apply to all children
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

