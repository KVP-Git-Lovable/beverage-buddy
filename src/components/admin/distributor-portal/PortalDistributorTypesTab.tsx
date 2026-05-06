import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { DistributorTypeFormDialog } from './DistributorTypeFormDialog';

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
  searchQuery: string;
}

export const PortalDistributorTypesTab = ({ searchQuery }: Props) => {
  const [types, setTypes] = useState<DistributorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DistributorType | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<DistributorType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('distributor_types')
      .select('*')
      .order('sort_order');
    if (error) {
      toast.error('Failed to load types');
    } else {
      setTypes((data as DistributorType[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadTypes(); }, []);

  const resolveParentName = (parentCode: string | null) => {
    if (!parentCode) return '-';
    const parent = types.find(t => t.code === parentCode);
    return parent ? parent.name : parentCode;
  };

  const handleToggleActive = async (type: DistributorType) => {
    if (type.is_active) {
      // Deactivating — check for distributors using this type
      setTogglingId(type.id);
      const { count, error } = await supabase
        .from('distributors')
        .select('*', { count: 'exact', head: true })
        .eq('type_id', type.id);
      if (error) {
        toast.error('Failed to check distributors');
        setTogglingId(null);
        return;
      }
      if (count && count > 0) {
        toast.error(`Cannot deactivate: ${count} distributor(s) use this type`);
        setTogglingId(null);
        return;
      }
    }

    setTogglingId(type.id);
    const { error } = await supabase
      .from('distributor_types')
      .update({ is_active: !type.is_active })
      .eq('id', type.id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Type ${type.is_active ? 'deactivated' : 'activated'}`);
      loadTypes();
    }
    setTogglingId(null);
  };

  const handleEdit = (type: DistributorType) => {
    setEditingType(type);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingType(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    setDeleteLoading(true);
    
    // Check if distributors use this type
    const { count, error: checkError } = await supabase
      .from('distributors')
      .select('*', { count: 'exact', head: true })
      .eq('type_id', deletingType.id);
    if (checkError) {
      toast.error('Failed to check distributors');
      setDeleteLoading(false);
      return;
    }
    if (count && count > 0) {
      toast.error(`Cannot delete: ${count} distributor(s) use this type`);
      setDeleteLoading(false);
      setDeletingType(null);
      return;
    }

    const { error } = await supabase
      .from('distributor_types')
      .delete()
      .eq('id', deletingType.id);
    if (error) {
      toast.error('Failed to delete type');
    } else {
      toast.success('Type deleted');
      loadTypes();
    }
    setDeleteLoading(false);
    setDeletingType(null);
  };

  const filtered = types.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Distributor Types</CardTitle>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Type
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No types found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Parent Type</TableHead>
                  <TableHead>Parent Allowed</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{t.code}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.level}</TableCell>
                    <TableCell>{resolveParentName(t.parent_type_code)}</TableCell>
                    <TableCell>
                      <Badge variant={t.parent_allowed ? 'default' : 'secondary'}>
                        {t.parent_allowed ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {types.some(other => other.parent_type_code === t.code && other.is_active) ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Primary Packing
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={t.is_active}
                        onCheckedChange={() => handleToggleActive(t)}
                        disabled={togglingId === t.id}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingType(t)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DistributorTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingType={editingType}
        allTypes={types}
        onSaved={loadTypes}
      />

      <AlertDialog open={!!deletingType} onOpenChange={(open) => !open && setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Distributor Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingType?.name} ({deletingType?.code})</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
