import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, ShieldCheck, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminRoles, useAllPermissions, useCreateRole, useUpdateRole, useDeleteRole } from "@/hooks/use-admin";

export default function RoleManagement() {
  const { toast } = useToast();
  const { data: roles = [], isLoading: isLoadingRoles } = useAdminRoles();
  const { data: permissions = [] } = useAllPermissions();

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: [] as string[] });

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: "", description: "", permissions: [] });
    setShowModal(true);
  };

  const openEdit = (r: any) => {
    setEditingRole(r);
    setForm({ name: r.name, description: r.description, permissions: [...r.permissions] });
    setShowModal(true);
  };

  const togglePermission = (perm: string) =>
    setForm(f => ({ ...f, permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm] }));

  const handleSave = async () => {
    if (!form.name) return;

    try {
      if (editingRole) {
        await updateRoleMutation.mutateAsync({ id: editingRole.id, updates: form });
        toast({ title: "Role updated successfully" });
      } else {
        await createRoleMutation.mutateAsync(form);
        toast({ title: "Role created successfully" });
      }
      setShowModal(false);
    } catch (error) {
      toast({ title: "Operation failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    const role = roles.find((r: any) => r.id === id);
    if (role?.isSystem) {
      toast({ title: "Cannot delete system role", variant: "destructive" });
      return;
    }

    try {
      await deleteRoleMutation.mutateAsync(id);
      toast({ title: "Role deleted successfully" });
    } catch (error) {
      toast({ title: "Delete failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const isSaving = createRoleMutation.isPending || updateRoleMutation.isPending;

  const permGroups = permissions.reduce((acc, p) => { const [cat] = p.split("."); if (!acc[cat]) acc[cat] = []; acc[cat].push(p); return acc; }, {} as Record<string, string[]>);

  return (
    <AdminLayout title="Roles & Permissions" subtitle="Manage access control">
      <div className="flex justify-end mb-6"><Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />Create Role</Button></div>
      {isLoadingRoles ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role: any) => (
            <Card key={role.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />{role.name}{role.isSystem && <Lock className="w-3 h-3 text-muted-foreground" />}</CardTitle>
                    <CardDescription className="text-xs mt-1">{role.description}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(role)}><Pencil className="w-3.5 h-3.5" /></Button>
                    {!role.isSystem && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(role.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted-foreground">{role.permissions.length} permissions</span><Badge variant="outline" className="text-xs">{role.usersCount} users</Badge></div>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 6).map(p => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)}
                  {role.permissions.length > 6 && <Badge variant="secondary" className="text-[10px]">+{role.permissions.length - 6} more</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Role Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <Label className="block">Permissions</Label>
              <p className="text-xs text-muted-foreground mb-3">
                <strong>Manage</strong> — allows create, update, and delete actions.<br />
                <strong>View</strong> — allows read-only access.
              </p>
              <div className="space-y-4">
                {Object.entries(permGroups).map(([cat, perms]) => (
                  <div key={cat}><p className="text-xs font-medium text-muted-foreground uppercase mb-2">{cat}</p>
                    <div className="grid grid-cols-2 gap-2">{perms.map(p => <label key={p} className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={form.permissions.includes(p)} onCheckedChange={() => togglePermission(p)} />{p.split(".")[1].charAt(0).toUpperCase() + p.split(".")[1].slice(1)}</label>)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRole ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
