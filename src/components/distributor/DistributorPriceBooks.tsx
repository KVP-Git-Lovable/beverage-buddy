import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BookOpen, Plus, Calendar, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PriceBook {
  id: string;
  name: string;
  price_book_type: string;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  currency: string;
  entries_count?: number;
}

interface DistributorPriceBook {
  id: string;
  price_book_id: string;
  is_active: boolean;
  assigned_at: string;
  deactivated_at: string | null;
  price_book: PriceBook;
}

interface Props {
  distributorId: string;
}

export const DistributorPriceBooks = ({ distributorId }: Props) => {
  const [assignments, setAssignments] = useState<DistributorPriceBook[]>([]);
  const [availablePriceBooks, setAvailablePriceBooks] = useState<PriceBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPriceBook, setSelectedPriceBook] = useState('');

  useEffect(() => {
    fetchData();
  }, [distributorId]);

  const fetchData = async () => {
    try {
      // Fetch assigned price books
      const { data: assignedData, error: assignedError } = await supabase
        .from('distributor_price_books')
        .select(`
          *,
          price_book:price_books(*)
        `)
        .eq('distributor_id', distributorId)
        .order('assigned_at', { ascending: false });

      if (assignedError) throw assignedError;

      // Fetch all active price books
      const { data: priceBooks, error: pbError } = await supabase
        .from('price_books')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (pbError) throw pbError;

      // Filter out already assigned (active) price books
      const assignedIds = (assignedData || [])
        .filter(a => a.is_active)
        .map(a => a.price_book_id);
      
      const available = (priceBooks || []).filter(pb => !assignedIds.includes(pb.id));

      setAssignments(assignedData || []);
      setAvailablePriceBooks(available);
    } catch (error) {
      console.error('Error fetching price books:', error);
      toast.error('Failed to load price books');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPriceBook) {
      toast.error('Please select a price book');
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();

      // Deactivate current active price book
      const { error: deactivateError } = await supabase
        .from('distributor_price_books')
        .update({ 
          is_active: false, 
          deactivated_at: new Date().toISOString() 
        })
        .eq('distributor_id', distributorId)
        .eq('is_active', true);

      if (deactivateError) throw deactivateError;

      // Assign new price book
      const { error: assignError } = await supabase
        .from('distributor_price_books')
        .insert({
          distributor_id: distributorId,
          price_book_id: selectedPriceBook,
          is_active: true,
          assigned_by: user?.user?.id || null,
        });

      if (assignError) throw assignError;

      toast.success('Price book assigned successfully');
      setIsAssignOpen(false);
      setSelectedPriceBook('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign price book');
    }
  };

  const handleDeactivate = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('distributor_price_books')
        .update({ 
          is_active: false, 
          deactivated_at: new Date().toISOString() 
        })
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Price book deactivated');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate');
    }
  };

  const activeAssignment = assignments.find(a => a.is_active);
  const previousAssignments = assignments.filter(a => !a.is_active);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'bg-primary/10 text-primary';
      case 'territory': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'distributor_category': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'retailer_territory': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Price Books
        </h3>
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Assign Price Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Price Book</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {activeAssignment && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                  <p className="text-yellow-800 dark:text-yellow-300">
                    Note: Assigning a new price book will deactivate the current one ({activeAssignment.price_book.name})
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Price Book</Label>
                <Select value={selectedPriceBook} onValueChange={setSelectedPriceBook}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a price book" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePriceBooks.length === 0 ? (
                      <SelectItem value="none" disabled>No available price books</SelectItem>
                    ) : (
                      availablePriceBooks.map(pb => (
                        <SelectItem key={pb.id} value={pb.id}>
                          {pb.name} ({pb.price_book_type.replace(/_/g, ' ')})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAssign} className="w-full" disabled={!selectedPriceBook}>
                Assign Price Book
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Price Book */}
      {activeAssignment ? (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Active Price Book
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDeactivate(activeAssignment.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Deactivate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-semibold">{activeAssignment.price_book.name}</span>
              <Badge className={getTypeColor(activeAssignment.price_book.price_book_type)}>
                {activeAssignment.price_book.price_book_type.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="outline">{activeAssignment.price_book.currency}</Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Assigned: {format(new Date(activeAssignment.assigned_at), 'dd MMM yyyy')}
              </span>
              {activeAssignment.price_book.effective_from && (
                <span>Valid from: {format(new Date(activeAssignment.price_book.effective_from), 'dd MMM yyyy')}</span>
              )}
              {activeAssignment.price_book.effective_to && (
                <span>to: {format(new Date(activeAssignment.price_book.effective_to), 'dd MMM yyyy')}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No active price book assigned</p>
            <p className="text-sm text-muted-foreground">Assign a price book for this distributor</p>
          </CardContent>
        </Card>
      )}

      {/* Previous Price Books */}
      {previousAssignments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Previous Price Books</h4>
          {previousAssignments.map(assignment => (
            <Card key={assignment.id} className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{assignment.price_book.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {assignment.price_book.price_book_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(assignment.assigned_at), 'dd MMM yyyy')} - {assignment.deactivated_at ? format(new Date(assignment.deactivated_at), 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                  <Badge variant="secondary">Inactive</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};