import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Filter,
    Download,
    MoreVertical,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Eye,
    UserPlus,
    RefreshCw,
    Fingerprint,
    Calendar,
    MapPin,
    Briefcase,
    Edit,
    Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

import { API_ENDPOINTS } from '@/api/config';
import { authStorage } from '@/lib/auth';
import { useDeleteNationalIdProfile, useUpdateNationalIdProfile } from '@/hooks/use-national-id';

interface CitizenProfile {
    id: string;
    national_id_number: string;
    full_name: string;
    gender: string;
    date_of_birth: string;
    city: string;
    region: string;
    status: string;
    has_biometric: boolean;
    registration_date: string;
    is_verified: boolean;
}

const RegisteredCitizens = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [citizens, setCitizens] = useState<CitizenProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Dialog states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCitizen, setSelectedCitizen] = useState<CitizenProfile | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<CitizenProfile>>({});

    // Mutations
    const updateProfile = useUpdateNationalIdProfile();
    const deleteProfile = useDeleteNationalIdProfile();

    const fetchCitizens = async () => {
        setLoading(true);
        try {
            // In a real app, we'd use an axios instance with auth headers
            const token = authStorage.getToken();
            const response = await fetch(API_ENDPOINTS.nationalId.profiles, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch citizens');

            const data = await response.json();
            setCitizens(data);
        } catch (error) {
            console.error("Error fetching citizens:", error);
            toast({
                title: "Error",
                description: "Failed to load citizens database",
                variant: "destructive"
            });
            // Fallback to empty if API fails for now
            setCitizens([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCitizens();
    }, []);

    const handleDelete = async () => {
        if (!selectedCitizen) return;

        try {
            await deleteProfile.mutateAsync(selectedCitizen.id);
            setCitizens(prev => prev.filter(c => c.id !== selectedCitizen.id));
            setDeleteDialogOpen(false);
            setSelectedCitizen(null);
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const handleUpdate = async () => {
        if (!selectedCitizen) return;

        try {
            await updateProfile.mutateAsync({
                profileId: selectedCitizen.id,
                profileData: editFormData
            });
            // Refresh local state or just let the mutation invalidate query
            // Since we are using local fetch for now, let's refresh locally
            setCitizens(prev => prev.map(c =>
                c.id === selectedCitizen.id ? { ...c, ...editFormData } as CitizenProfile : c
            ));
            setEditDialogOpen(false);
            setSelectedCitizen(null);
        } catch (error) {
            console.error("Update failed:", error);
        }
    };

    const openEditDialog = (citizen: CitizenProfile) => {
        setSelectedCitizen(citizen);
        setEditFormData({
            full_name: citizen.full_name,
            city: citizen.city,
            region: citizen.region,
            status: citizen.status
        });
        setEditDialogOpen(true);
    };

    const openDeleteDialog = (citizen: CitizenProfile) => {
        setSelectedCitizen(citizen);
        setDeleteDialogOpen(true);
    };

    const filteredCitizens = citizens.filter(citizen => {
        const matchesSearch =
            citizen.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            citizen.national_id_number.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || citizen.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>;
            case 'inactive':
                return <Badge variant="secondary">Inactive</Badge>;
            case 'suspended':
                return <Badge variant="destructive">Suspended</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Registered Citizens
                    </h1>
                    <p className="text-muted-foreground">
                        Manage and verify Ethiopian National ID profiles and biometric data.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="glass-button"
                        onClick={fetchCitizens}
                        disabled={loading}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => navigate('/admin/national-id/register')}
                        className="bg-primary hover:bg-primary/90 transition-all duration-300 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        New Registration
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glass-card border-white/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Users size={48} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Registered</CardDescription>
                        <CardTitle className="text-2xl font-bold">{citizens.length}</CardTitle>
                    </CardHeader>
                </Card>

                <Card className="glass-card border-white/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10 text-emerald-500">
                        <CheckCircle2 size={48} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription>Verified Profiles</CardDescription>
                        <CardTitle className="text-2xl font-bold text-emerald-500">
                            {citizens.filter(c => c.is_verified).length}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="glass-card border-white/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10 text-blue-500">
                        <Fingerprint size={48} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription>Biometrics Enrolled</CardDescription>
                        <CardTitle className="text-2xl font-bold text-blue-500">
                            {citizens.filter(c => c.has_biometric).length}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card className="glass-card border-white/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-500">
                        <AlertCircle size={48} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription>Pending Actions</CardDescription>
                        <CardTitle className="text-2xl font-bold text-amber-500">
                            {citizens.filter(c => !c.is_verified || !c.has_biometric).length}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card className="glass-card border-white/10">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle>Citizen Database</CardTitle>
                            <CardDescription>Browse and search through all registered national identity profiles.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative w-full sm:w-[300px]">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or ID..."
                                    className="pl-9 glass-input"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="glass-button">
                                <Filter className="mr-2 h-4 w-4" />
                                Filter
                            </Button>
                            <Button variant="outline" className="glass-button">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-white/5 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead className="font-semibold">Citizen / National ID</TableHead>
                                    <TableHead className="font-semibold text-center">Biometrics</TableHead>
                                    <TableHead className="font-semibold">Location</TableHead>
                                    <TableHead className="font-semibold">Reg. Date</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse border-white/5">
                                            <TableCell><div className="h-4 w-32 bg-white/10 rounded"></div></TableCell>
                                            <TableCell><div className="h-4 w-12 bg-white/10 rounded mx-auto"></div></TableCell>
                                            <TableCell><div className="h-4 w-24 bg-white/10 rounded"></div></TableCell>
                                            <TableCell><div className="h-4 w-20 bg-white/10 rounded"></div></TableCell>
                                            <TableCell><div className="h-4 w-16 bg-white/10 rounded"></div></TableCell>
                                            <TableCell><div className="h-4 w-8 bg-white/10 rounded ml-auto"></div></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredCitizens.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground border-white/5">
                                            {searchQuery ? "No citizens found matching your search." : "No registered citizens found."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCitizens.map((citizen) => (
                                        <TableRow key={citizen.id} className="hover:bg-white/5 transition-colors border-white/5">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">{citizen.full_name}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{citizen.national_id_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center">
                                                    {citizen.has_biometric ? (
                                                        <div className="flex items-center text-emerald-500 gap-1 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                            <Fingerprint className="h-3 w-3" />
                                                            <span>Enrolled</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center text-amber-500 gap-1 text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                            <AlertCircle className="h-3 w-3" />
                                                            <span>Missing</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-balance">
                                                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                    <span>{citizen.city}, {citizen.region}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                    <span>{new Date(citizen.registration_date).toLocaleDateString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(citizen.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="glass-card border-white/10 text-white">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => openEditDialog(citizen)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Update Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-400" onClick={() => openDeleteDialog(citizen)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        <DropdownMenuItem className="text-red-400">
                                                            <XCircle className="mr-2 h-4 w-4" /> Suspend ID
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="glass-card border-white/10 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Update Citizen Profile</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Make changes to the citizen profile here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right text-sm">Full Name</Label>
                            <Input
                                id="name"
                                value={editFormData.full_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                className="col-span-3 glass-input"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="city" className="text-right text-sm">City</Label>
                            <Input
                                id="city"
                                value={editFormData.city || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                className="col-span-3 glass-input"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="region" className="text-right text-sm">Region</Label>
                            <Input
                                id="region"
                                value={editFormData.region || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, region: e.target.value })}
                                className="col-span-3 glass-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="glass-button" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={updateProfile.isPending}>
                            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="glass-card border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            This action cannot be undone. This will permanently delete the profile for
                            <span className="font-bold text-white px-1">{selectedCitizen?.full_name}</span>
                            ({selectedCitizen?.national_id_number}) from the National ID database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="glass-button">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                        >
                            Delete Profile
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .glass-button {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
        }
        .glass-button:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .glass-input {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
        }
        .glass-input:focus {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--primary);
        }
      `}</style>
        </div>
    );
};

export default RegisteredCitizens;
