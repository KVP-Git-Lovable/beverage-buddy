import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

interface AddToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRetailerIds: number[];
  pincode: string;
  onDone: () => void;
}

interface RetailerList {
  id: string;
  name: string;
}

export const AddToListDialog: React.FC<AddToListDialogProps> = ({
  open, onOpenChange, selectedRetailerIds, pincode, onDone,
}) => {
  const [lists, setLists] = useState<RetailerList[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'select' | 'create'>('select');

  useEffect(() => {
    if (open) {
      fetchLists();
      setSelectedListId('');
      setNewListName('');
      setMode('select');
    }
  }, [open]);

  const fetchLists = async () => {
    const { data } = await supabase
      .from('external_retailer_lists')
      .select('id, name')
      .order('created_at', { ascending: false });
    setLists((data as RetailerList[]) || []);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let listId = selectedListId;

      if (mode === 'create') {
        if (!newListName.trim()) {
          toast.error('Please enter a list name');
          setLoading(false);
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('external_retailer_lists')
          .insert({ name: newListName.trim(), created_by: user.id })
          .select('id')
          .single();
        if (error) throw error;
        listId = data.id;
      }

      if (!listId) {
        toast.error('Please select or create a list');
        setLoading(false);
        return;
      }

      const items = selectedRetailerIds.map(id => ({
        list_id: listId,
        external_retailer_id: id,
        pincode,
      }));

      // Insert with conflict handling
      let insertedCount = 0;
      for (const item of items) {
        const { error } = await supabase
          .from('external_retailer_list_items')
          .insert(item);
        if (!error) insertedCount++;
        // duplicate constraint errors are silently skipped
      }

      toast.success(`Added ${insertedCount} retailer${insertedCount !== 1 ? 's' : ''} to list`);
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add to list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {selectedRetailerIds.length} Retailer{selectedRetailerIds.length !== 1 ? 's' : ''} to List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === 'select' ? (
            <>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an existing list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setMode('create')} className="flex items-center gap-1 text-xs">
                <Plus className="h-3 w-3" /> Create new list
              </Button>
            </>
          ) : (
            <>
              <Input
                placeholder="Enter list name"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                autoFocus
              />
              {lists.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setMode('select')} className="text-xs">
                  Select existing list instead
                </Button>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Add to List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
