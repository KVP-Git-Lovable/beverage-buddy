import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trash2, Edit2, Eye, Loader2, List, MapPin } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RetailerList {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  item_count: number;
}

interface ListItem {
  id: string;
  external_retailer_id: number;
  pincode: string | null;
  created_at: string;
  retailer?: {
    company_name: string;
    city: string;
    mobile: string | null;
    category: string | null;
  };
}

const RetailerListsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasAdminAccess, loading: authLoading } = useAdminAccess();
  const [lists, setLists] = useState<RetailerList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<RetailerList | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [renameDialog, setRenameDialog] = useState<RetailerList | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<RetailerList | null>(null);

  useEffect(() => {
    if (hasAdminAccess) fetchLists();
  }, [hasAdminAccess]);

  const fetchLists = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: listsData } = await supabase
      .from('external_retailer_lists')
      .select('id, name, description, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (!listsData) { setLoading(false); return; }

    // Get item counts
    const listsWithCounts: RetailerList[] = [];
    for (const list of listsData) {
      const { count } = await supabase
        .from('external_retailer_list_items')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', list.id);
      listsWithCounts.push({ ...list, item_count: count || 0 });
    }
    setLists(listsWithCounts);
    setLoading(false);
  };

  const fetchListItems = async (list: RetailerList) => {
    setSelectedList(list);
    setItemsLoading(true);
    const { data } = await supabase
      .from('external_retailer_list_items')
      .select('id, external_retailer_id, pincode, created_at')
      .eq('list_id', list.id)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      // Fetch retailer details
      const retailerIds = data.map(d => d.external_retailer_id);
      const { data: retailers } = await supabase
        .from('retailer_external_db')
        .select('id, company_name, city, mobile, category')
        .in('id', retailerIds);

      const retailerMap = new Map((retailers || []).map(r => [r.id, r]));
      setListItems(data.map(item => ({
        ...item,
        retailer: retailerMap.get(item.external_retailer_id) as any
      })));
    } else {
      setListItems([]);
    }
    setItemsLoading(false);
  };

  const handleRename = async () => {
    if (!renameDialog || !newName.trim()) return;
    const { error } = await supabase
      .from('external_retailer_lists')
      .update({ name: newName.trim() })
      .eq('id', renameDialog.id);
    if (error) { toast.error('Failed to rename'); return; }
    toast.success('List renamed');
    setRenameDialog(null);
    fetchLists();
    if (selectedList?.id === renameDialog.id) {
      setSelectedList({ ...selectedList, name: newName.trim() });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    const { error } = await supabase
      .from('external_retailer_lists')
      .delete()
      .eq('id', deleteDialog.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('List deleted');
    setDeleteDialog(null);
    if (selectedList?.id === deleteDialog.id) {
      setSelectedList(null);
      setListItems([]);
    }
    fetchLists();
  };

  const handleRemoveItem = async (itemId: string) => {
    const { error } = await supabase
      .from('external_retailer_list_items')
      .delete()
      .eq('id', itemId);
    if (error) { toast.error('Failed to remove'); return; }
    toast.success('Retailer removed from list');
    setListItems(prev => prev.filter(i => i.id !== itemId));
    // Update count
    if (selectedList) {
      setSelectedList({ ...selectedList, item_count: selectedList.item_count - 1 });
      setLists(prev => prev.map(l => l.id === selectedList.id ? { ...l, item_count: l.item_count - 1 } : l));
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hasAdminAccess) return <Navigate to="/dashboard" replace />;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/admin/pincode-master')} variant="ghost" size="sm" className="p-2">
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">My Retailer Lists</h1>
              <p className="text-muted-foreground text-sm">View and manage your saved external retailer lists</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lists sidebar */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Lists ({lists.length})</h2>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : lists.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No lists created yet. Go to a PIN code detail page and select retailers to create a list.
                </CardContent></Card>
              ) : (
                lists.map(list => (
                  <Card 
                    key={list.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedList?.id === list.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => fetchListItems(list)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{list.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{list.item_count} retailers</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(list.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); setNewName(list.name); setRenameDialog(list); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteDialog(list); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* List details */}
            <div className="lg:col-span-2">
              {!selectedList ? (
                <Card><CardContent className="py-16 text-center">
                  <List className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Select a list to view its retailers</p>
                </CardContent></Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{selectedList.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedList.item_count} retailers</p>
                  </CardHeader>
                  <CardContent>
                    {itemsLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : listItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">This list is empty.</p>
                    ) : (
                      <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                        {listItems.map(item => (
                          <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-foreground truncate">
                                {item.retailer?.company_name || `Retailer #${item.external_retailer_id}`}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                                {item.retailer?.city && <span>{item.retailer.city}</span>}
                                {item.pincode && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3" /> {item.pincode}
                                  </span>
                                )}
                                {item.retailer?.mobile && <span>📞 {item.retailer.mobile}</span>}
                                {item.retailer?.category && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.retailer.category}</Badge>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={open => !open && setRenameDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename List</DialogTitle></DialogHeader>
          <Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={open => !open && setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete List</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete "{deleteDialog?.name}"? This will remove all items in the list.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default RetailerListsPage;
