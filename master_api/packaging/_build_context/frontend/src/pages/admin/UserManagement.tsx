import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminUser } from "@/data/adminMockData";
import { useAdminUsers, useAdminCompanies, useAdminRoles, useCreateAdminUser, useUpdateAdminUser, useDeleteAdminUser } from "@/hooks/use-admin";
import { Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuthContext();
  const { data: users = [], isLoading } = useAdminUsers();
  const { data: companies = [] } = useAdminCompanies();
  const { data: roles = [] } = useAdminRoles();

  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();

  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    companyId: isSuperAdmin ? "" : currentUser?.organizationId || "",
    role: "",
    status: "active" as AdminUser["status"]
  });

  const filtered = users.filter(u => {
    // If not super admin, backend already filters, but we ensure consistency
    if (!isSuperAdmin && u.companyId !== currentUser?.organizationId) return false;
    if (isSuperAdmin && filterCompany !== "all" && u.companyId !== filterCompany) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      name: "",
      email: "",
      companyId: isSuperAdmin ? "" : currentUser?.organizationId || "",
      role: "",
      status: "active"
    });
    setShowModal(true);
  };
  const openEdit = (u: AdminUser) => { setEditingUser(u); setForm({ name: u.name, email: u.email, companyId: u.companyId, role: u.role, status: u.status }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.email) return;

    try {
      if (editingUser) {
        await updateMutation.mutateAsync({ id: editingUser.id, updates: form });
        toast({ title: "User updated" });
      } else {
        await createMutation.mutateAsync(form);
        toast({ title: "User created" });
      }
      setShowModal(false);
    } catch (error) {
      toast({ title: "Action failed", description: "Could not save user.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "User deleted", variant: "destructive" });
    } catch (error) {
      toast({ title: "Delete failed", description: "Could not delete user.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout title="User Management" subtitle="Manage all platform users">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search users..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
          {isSuperAdmin && (
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="All Companies" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Companies</SelectItem>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />Add User</Button>
      </div>
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading users...</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.companyName}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell><Badge variant={u.status === "active" ? "default" : u.status === "suspended" ? "destructive" : "secondary"} className="capitalize">{u.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No users found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            {isSuperAdmin && (
              <div><Label>Company</Label><Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v }))}><SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            )}
            <div><Label>Role</Label><Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as AdminUser["status"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave}>{editingUser ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
