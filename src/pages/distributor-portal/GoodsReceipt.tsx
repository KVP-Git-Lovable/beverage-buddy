import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Package, 
  CheckCircle2,
  AlertTriangle,
  Truck,
  FileCheck,
  ClipboardCheck,
  ScanLine,
  Warehouse
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useWarehouses } from '@/hooks/useWarehouses';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  batch_number?: string;
  expiry_date?: string;
}

const GoodsReceipt = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanQuery, setScanQuery] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const distributorId = localStorage.getItem('distributor_id');
  const { warehouses, defaultWarehouse, loading: whLoading } = useWarehouses(distributorId);

  useEffect(() => {
    if (defaultWarehouse && !selectedWarehouseId) {
      setSelectedWarehouseId(defaultWarehouse.id);
    }
  }, [defaultWarehouse, selectedWarehouseId]);

  useEffect(() => {
    if (!distributorId) {
      navigate('/distributor-portal/login');
      return;
    }
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId, distributorId]);

  const loadOrderDetails = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('primary_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('primary_order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      setOrder(orderData);
      setItems(itemsData?.map(item => ({
        ...item,
        received_quantity: item.received_quantity ?? item.quantity,
        accepted_quantity: item.received_quantity ?? item.quantity,
        rejected_quantity: 0,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || '',
      })) || []);
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order details');
      navigate('/distributor-portal/primary-orders');
    } finally {
      setLoading(false);
    }
  };

  const updateReceivedQty = (itemId: string, qty: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const received = Math.max(0, qty);
      return {
        ...item,
        received_quantity: received,
        accepted_quantity: Math.min(item.accepted_quantity, received),
        rejected_quantity: received - Math.min(item.accepted_quantity, received),
      };
    }));
  };

  const updateAcceptedQty = (itemId: string, qty: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const accepted = Math.max(0, Math.min(qty, item.received_quantity));
      return {
        ...item,
        accepted_quantity: accepted,
        rejected_quantity: item.received_quantity - accepted,
      };
    }));
  };

  const updateBatchNumber = (itemId: string, batch: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, batch_number: batch } : item
    ));
  };

  const updateExpiryDate = (itemId: string, date: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, expiry_date: date } : item
    ));
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanQuery.trim()) return;
    const query = scanQuery.trim().toLowerCase();
    const match = items.find(
      item =>
        item.product_name.toLowerCase().includes(query) ||
        item.product_id.toLowerCase().includes(query) ||
        (item.batch_number && item.batch_number.toLowerCase().includes(query))
    );
    if (match) {
      setHighlightedItemId(match.id);
      setTimeout(() => setHighlightedItemId(null), 3000);
      const el = document.getElementById(`grn-item-${match.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleConfirmGRN = async () => {
    if (!order || !distributorId) return;

    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;

      // 1. Update order items with received quantities
      for (const item of items) {
        await supabase
          .from('primary_order_items')
          .update({ 
            received_quantity: item.received_quantity,
            batch_number: item.batch_number || null,
            expiry_date: item.expiry_date || null,
          })
          .eq('id', item.id);
      }

      // 2. Process each item through the ledger RPC
      let errors = 0;
      for (const item of items) {
        // Process accepted quantity via GRN action
        if (item.accepted_quantity > 0) {
          const { data, error } = await supabase.rpc('execute_stock_action', {
            p_distributor_id: distributorId,
            p_product_id: item.product_id,
            p_action: 'GRN',
            p_quantity: item.accepted_quantity,
            p_notes: `GRN from primary order ${order.order_number}`,
            p_created_by: userId,
            p_batch_no: item.batch_number || null,
            p_expiry_date: item.expiry_date || null,
            p_reference_id: orderId!,
            p_reference_number: order.order_number,
            p_warehouse_id: selectedWarehouseId || null,
          });
          if (error) {
            console.error('GRN error for', item.product_name, error);
            errors++;
          } else {
            const result = typeof data === 'string' ? JSON.parse(data) : data;
            if (!result?.success) {
              console.error('GRN failed for', item.product_name, result?.error);
              errors++;
            }
          }
        }

        // Process rejected quantity as damaged
        if (item.rejected_quantity > 0) {
          // First ensure the product exists in inventory (the GRN above should have created it)
          // Then mark rejected as damaged
          const { data, error } = await supabase.rpc('execute_stock_action', {
            p_distributor_id: distributorId,
            p_product_id: item.product_id,
            p_action: 'MARK_DAMAGED',
            p_quantity: item.rejected_quantity,
            p_notes: `Rejected during GRN from ${order.order_number}`,
            p_created_by: userId,
            p_batch_no: item.batch_number || null,
            p_expiry_date: null,
            p_reference_id: orderId!,
            p_reference_number: order.order_number,
            p_warehouse_id: selectedWarehouseId || null,
          });
          if (error) {
            console.error('MARK_DAMAGED error for', item.product_name, error);
          }
        }
      }

      // 3. Update order status
      const allFullyReceived = items.every(item => item.received_quantity >= item.quantity);
      const anyReceived = items.some(item => item.received_quantity > 0);

      let newStatus = order.status;
      if (allFullyReceived) {
        newStatus = 'delivered';
      } else if (anyReceived) {
        newStatus = 'partially_delivered';
      }

      await supabase
        .from('primary_orders')
        .update({ 
          status: newStatus,
          received_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (errors > 0) {
        toast.warning(`GRN completed with ${errors} issue(s). Check inventory.`);
      } else {
        toast.success('GRN confirmed! Inventory updated via ledger.');
      }
      navigate('/distributor-portal/primary-orders');
    } catch (error) {
      console.error('Error confirming GRN:', error);
      toast.error('Failed to confirm GRN');
    } finally {
      setSaving(false);
    }
  };

  const totalOrdered = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalReceived = items.reduce((sum, i) => sum + i.received_quantity, 0);
  const totalAccepted = items.reduce((sum, i) => sum + i.accepted_quantity, 0);
  const totalRejected = items.reduce((sum, i) => sum + i.rejected_quantity, 0);
  const allMatch = items.every(i => i.received_quantity === i.quantity && i.rejected_quantity === 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Order not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background standalone-page">
      {/* Header */}
      <header className="sticky-header-safe z-50 bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/distributor-portal/primary-orders')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-foreground flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  Goods Receipt Note
                </h1>
                <p className="text-xs text-muted-foreground">
                  {order.order_number} • {format(new Date(order.order_date), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700">
              <Truck className="w-3 h-3 mr-1" />
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Warehouse Selection */}
        {!whLoading && warehouses.length === 0 ? (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="font-medium text-foreground">No Warehouses Available</p>
              <p className="text-sm text-muted-foreground">Please create a warehouse in Inventory before processing a GRN.</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/distributor-portal/inventory')}>
                Go to Inventory
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Warehouse className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Receive into Warehouse <span className="text-destructive">*</span></p>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger className="w-[250px] h-9 text-sm">
                  <SelectValue placeholder={whLoading ? 'Loading...' : 'Select warehouse'} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.is_default ? '(Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Summary Card */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Items</p>
                <p className="text-xl font-bold">{items.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ordered</p>
                <p className="text-xl font-bold">{totalOrdered}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accepted</p>
                <p className="text-xl font-bold text-green-600">{totalAccepted}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rejected</p>
                <p className={`text-xl font-bold ${totalRejected > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {totalRejected}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Indicator */}
        {!allMatch && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-700">
                Some items have discrepancies. Rejected items will be marked as damaged stock.
              </span>
            </CardContent>
          </Card>
        )}

        {allMatch && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                All items match ordered quantities. Order will be marked as delivered.
              </span>
            </CardContent>
          </Card>
        )}

        {/* Items List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Verify Received Items
            </CardTitle>
            <form onSubmit={handleScan} className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Scan barcode / SKU / product name..."
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={!scanQuery.trim()}>
                Find
              </Button>
            </form>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div 
                id={`grn-item-${item.id}`}
                key={item.id}
                className={`p-4 rounded-lg space-y-3 transition-colors ${highlightedItemId === item.id ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/50'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    Ordered: {item.quantity} {item.unit}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Received Quantity
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={item.received_quantity}
                      onChange={(e) => updateReceivedQty(item.id, parseInt(e.target.value) || 0)}
                      className={item.received_quantity !== item.quantity ? 'border-orange-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Accepted Quantity
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={item.received_quantity}
                      value={item.accepted_quantity}
                      onChange={(e) => updateAcceptedQty(item.id, parseInt(e.target.value) || 0)}
                      className={item.rejected_quantity > 0 ? 'border-red-300' : ''}
                    />
                    {item.rejected_quantity > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        {item.rejected_quantity} rejected → damaged stock
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Batch Number
                    </label>
                    <Input
                      placeholder="Enter batch"
                      value={item.batch_number || ''}
                      onChange={(e) => updateBatchNumber(item.id, e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Expiry Date
                    </label>
                    <Input
                      type="date"
                      value={item.expiry_date || ''}
                      onChange={(e) => updateExpiryDate(item.id, e.target.value)}
                    />
                  </div>
                </div>

                {item.received_quantity !== item.quantity && (
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Quantity mismatch: ordered {item.quantity}, receiving {item.received_quantity}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate('/distributor-portal/primary-orders')}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1"
            onClick={handleConfirmGRN}
            disabled={saving || totalReceived === 0 || !selectedWarehouseId}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <FileCheck className="w-4 h-4 mr-2" />
            )}
            Confirm GRN & Update Inventory
          </Button>
        </div>
      </main>
    </div>
  );
};

export default GoodsReceipt;
