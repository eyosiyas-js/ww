import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CaseFormTemplate, FormField } from "@/data/adminMockData";
import { useAdminFormTemplates, useCreateFormTemplate, useUpdateFormTemplate, useDeleteFormTemplate } from "@/hooks/use-admin";
import { Plus, Pencil, Trash2, FileEdit, GripVertical, Eye, User, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fieldTypes = ["text", "textarea", "select", "date", "file", "number", "checkbox"] as const;

export default function FormBuilder() {
  const { toast } = useToast();
  const { data: displayTemplates = [] } = useAdminFormTemplates();
  const createMutation = useCreateFormTemplate();
  const updateMutation = useUpdateFormTemplate();
  const deleteMutation = useDeleteFormTemplate();

  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState<CaseFormTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CaseFormTemplate | null>(null);
  const [form, setForm] = useState({ name: "", description: "", isActive: true, detectionType: "person" as "person" | "vehicle", fields: [] as FormField[] });

  const openCreate = () => { setEditingTemplate(null); setForm({ name: "", description: "", isActive: true, detectionType: "person", fields: [] }); setShowModal(true); };
  const openEdit = (t: CaseFormTemplate) => { setEditingTemplate(t); setForm({ name: t.name, description: t.description, isActive: t.isActive, detectionType: t.detectionType || "person", fields: [...t.fields] }); setShowModal(true); };
  const addField = () => setForm(f => ({ ...f, fields: [...f.fields, { id: `f-${Date.now()}`, label: "", type: "text", required: false, placeholder: "" }] }));
  const updateField = (id: string, updates: Partial<FormField>) => setForm(f => ({ ...f, fields: f.fields.map(field => field.id === id ? { ...field, ...updates } : field) }));
  const removeField = (id: string) => setForm(f => ({ ...f, fields: f.fields.filter(field => field.id !== id) }));

  const handleSave = async () => {
    if (!form.name) return;
    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({ id: editingTemplate.id, updates: form });
        toast({ title: "Form template updated" });
      }
      else {
        await createMutation.mutateAsync(form);
        toast({ title: "Form template created" });
      }
      setShowModal(false);
    } catch {
      toast({ title: "Error saving form template", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Template deleted", variant: "destructive" });
    } catch {
      toast({ title: "Error deleting template", variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, currentIsActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, updates: { isActive: !currentIsActive } });
    } catch {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const personTemplates = displayTemplates.filter(t => (t.detectionType || "person") === "person");
  const vehicleTemplates = displayTemplates.filter(t => t.detectionType === "vehicle");

  const renderTemplateCard = (t: any) => (
    <Card key={t.id} className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-primary" />{t.name}
            </CardTitle>
            <CardDescription className="text-xs mt-1">{t.description}</CardDescription>
          </div>
          <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t.id, t.isActive)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">{t.fields.length} fields</span>
          <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Active" : "Inactive"}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">{t.fields.map(f => <Badge key={f.id} variant="outline" className="text-[10px]">{f.label || f.type}</Badge>)}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setShowPreview(t)}><Eye className="w-3.5 h-3.5" />Preview</Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" />Edit</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="Detection Form Builder" subtitle="Create and manage dynamic detection forms per detection type">
      <div className="flex justify-end mb-6"><Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />New Form Template</Button></div>

      {/* Person Detection Forms */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-blue-500/10"><User className="w-4 h-4 text-blue-500" /></div>
          <h3 className="text-lg font-semibold">Person Detection Forms</h3>
          <Badge variant="outline" className="text-xs">{personTemplates.length} template{personTemplates.length !== 1 ? "s" : ""}</Badge>
        </div>
        {personTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personTemplates.map(renderTemplateCard)}
          </div>
        ) : (
          <Card className="glass-card"><CardContent className="py-8 text-center text-sm text-muted-foreground">No person detection forms yet. Create one to get started.</CardContent></Card>
        )}
      </div>

      {/* Vehicle Detection Forms */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-amber-500/10"><Car className="w-4 h-4 text-amber-500" /></div>
          <h3 className="text-lg font-semibold">Vehicle Detection Forms</h3>
          <Badge variant="outline" className="text-xs">{vehicleTemplates.length} template{vehicleTemplates.length !== 1 ? "s" : ""}</Badge>
        </div>
        {vehicleTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicleTemplates.map(renderTemplateCard)}
          </div>
        ) : (
          <Card className="glass-card"><CardContent className="py-8 text-center text-sm text-muted-foreground">No vehicle detection forms yet. Create one to get started.</CardContent></Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTemplate ? "Edit Form Template" : "Create Form Template"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Template Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Detection Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button type="button" onClick={() => setForm(f => ({ ...f, detectionType: "person" }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-sm font-medium ${form.detectionType === "person" ? "border-blue-500 bg-blue-500/10 text-blue-600" : "border-border hover:border-blue-500/50 text-muted-foreground"}`}>
                    <User className="w-4 h-4" />Person
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, detectionType: "vehicle" }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-sm font-medium ${form.detectionType === "vehicle" ? "border-amber-500 bg-amber-500/10 text-amber-600" : "border-border hover:border-amber-500/50 text-muted-foreground"}`}>
                    <Car className="w-4 h-4" />Vehicle
                  </button>
                </div>
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} /><Label>Active</Label></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3"><Label>Form Fields</Label><Button variant="outline" size="sm" onClick={addField} className="gap-1"><Plus className="w-3.5 h-3.5" />Add Field</Button></div>
              <div className="space-y-3">
                {form.fields.map((field) => (
                  <div key={field.id} className="flex gap-3 items-start p-3 rounded-lg border border-border bg-muted/20">
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 cursor-grab" />
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Input placeholder="Field label" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} />
                      <Select value={field.type} onValueChange={v => updateField(field.id, { type: v as FormField["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fieldTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select>
                      <Input placeholder="Placeholder" value={field.placeholder || ""} onChange={e => updateField(field.id, { placeholder: e.target.value })} />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs mt-2.5 whitespace-nowrap"><Checkbox checked={field.required} onCheckedChange={v => updateField(field.id, { required: !!v })} />Req</label>
                    <Button variant="ghost" size="icon" className="h-8 w-8 mt-1" onClick={() => removeField(field.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                ))}
                {form.fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No fields yet. Add your first field above.</p>}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave}>{editingTemplate ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Preview: {showPreview?.name}
              <Badge variant="outline" className="text-xs capitalize">{showPreview?.detectionType || "person"}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showPreview?.fields.map(field => (
              <div key={field.id}>
                <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                {field.type === "text" && <Input placeholder={field.placeholder} disabled />}
                {field.type === "textarea" && <Textarea placeholder={field.placeholder} disabled />}
                {field.type === "number" && <Input type="number" placeholder={field.placeholder} disabled />}
                {field.type === "date" && <Input type="date" disabled />}
                {field.type === "file" && <Input type="file" disabled />}
                {field.type === "checkbox" && <div className="flex items-center gap-2 mt-1"><Checkbox disabled /><span className="text-sm text-muted-foreground">{field.placeholder || field.label}</span></div>}
                {field.type === "select" && <Select disabled><SelectTrigger><SelectValue placeholder={field.placeholder || "Select..."} /></SelectTrigger><SelectContent>{field.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>}
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPreview(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
