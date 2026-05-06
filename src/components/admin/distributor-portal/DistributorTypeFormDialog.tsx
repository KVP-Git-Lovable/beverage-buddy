import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DistributorType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  level: number;
  parent_allowed: boolean;
  parent_type_code: string | null;
  is_active: boolean;
  sort_order: number;
  legacy_mapping: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingType: DistributorType | null;
  allTypes: DistributorType[];
  onSaved: () => void;
}

const hasCircular = (selectedParentCode: string, allTypes: DistributorType[], selfCode: string): boolean => {
  let current = selectedParentCode;
  const visited = new Set<string>();
  while (current) {
    if (current === selfCode) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    const parent = allTypes.find(t => t.code === current);
    current = parent?.parent_type_code || '';
  }
  return false;
};

export const DistributorTypeFormDialog = ({ open, onOpenChange, editingType, allTypes, onSaved }: Props) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(1);
  const [sortOrder, setSortOrder] = useState(0);
  const [parentAllowed, setParentAllowed] = useState(false);
  const [parentTypeCode, setParentTypeCode] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = !!editingType;

  useEffect(() => {
    if (editingType) {
      setName(editingType.name);
      setCode(editingType.code);
      setDescription(editingType.description || '');
      setLevel(editingType.level);
      setSortOrder(editingType.sort_order);
      setParentAllowed(editingType.parent_allowed);
      setParentTypeCode(editingType.parent_type_code);
      setIsActive(editingType.is_active);
    } else {
      setName('');
      setCode('');
      setDescription('');
      setLevel(1);
      setSortOrder(0);
      setParentAllowed(false);
      setParentTypeCode(null);
      setIsActive(true);
    }
  }, [editingType, open]);

  const parentOptions = allTypes.filter(t => {
    if (isEdit && t.code === editingType?.code) return false;
    return true;
  });

  const handleSave = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedName) { toast.error('Name is required'); return; }
    if (!trimmedCode) { toast.error('Code is required'); return; }
    if (parentAllowed && !parentTypeCode) { toast.error('Parent type is required when parent is allowed'); return; }

    if (parentAllowed && parentTypeCode) {
      if (hasCircular(parentTypeCode, allTypes, trimmedCode)) {
        toast.error('Circular parent relationship detected');
        return;
      }
    }

    setSaving(true);
    try {
      if (!isEdit) {
        // Check unique code
        const { count } = await supabase
          .from('distributor_types')
          .select('*', { count: 'exact', head: true })
          .eq('code', trimmedCode);
        if (count && count > 0) {
          toast.error('A type with this code already exists');
          setSaving(false);
          return;
        }
      }

      const payload = {
        name: trimmedName,
        code: trimmedCode,
        description: description.trim() || null,
        level,
        sort_order: sortOrder,
        parent_allowed: parentAllowed,
        parent_type_code: parentAllowed ? parentTypeCode : null,
        is_active: isActive,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('distributor_types')
          .update(payload)
          .eq('id', editingType.id);
        if (error) throw error;
        toast.success('Type updated');
      } else {
        const { error } = await supabase
          .from('distributor_types')
          .insert(payload);
        if (error) throw error;
        toast.success('Type created');
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving type:', error);
      toast.error(error.message || 'Failed to save type');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Add'} Distributor Type</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Super Stockist" />
          </div>

          <div className="space-y-2">
            <Label>Code *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SS"
              disabled={isEdit}
            />
            {isEdit && <p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Level *</Label>
              <Input type="number" value={level} onChange={(e) => setLevel(Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Parent Allowed</Label>
            <Switch checked={parentAllowed} onCheckedChange={(checked) => {
              setParentAllowed(checked);
              if (!checked) setParentTypeCode(null);
            }} />
          </div>

          {parentAllowed && (
            <div className="space-y-2">
              <Label>Parent Type *</Label>
              <Select value={parentTypeCode || ''} onValueChange={(v) => setParentTypeCode(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent type" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((t) => (
                    <SelectItem key={t.code} value={t.code}>{t.name} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
