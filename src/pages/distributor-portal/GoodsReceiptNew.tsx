import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Package, CheckCircle2, AlertTriangle, Truck,
  FileCheck, ClipboardCheck, RotateCcw, Warehouse
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useWarehouses } from '@/hooks/useWarehouses';

interface GRNItem {
  id: string;
  order_item_id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  ordered_quantity: number;
  received_quantity: number;
  returned_quantity: number;
  conversion_to_base: number;
  ordered_base_qty: number;
  return_reason: string;
  damaged_quantity: number;
  batch_number: string;
  expiry_date: string;
  unit: string;
  uom_id?: string;
  uom_code?: string;
  unit_price: number;
}

const RETURN_REASONS = [
  'damaged', 'expired', 'wrong_product', 'excess', 'quality_issue', 'short_supply', 'other'
];

const GoodsReceiptNew = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<GRNItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const distributorId = localStorage.getItem('distributor_id');
  const { warehouses, defaultWarehouse, loading: whLoading } = useWarehouses(distributorId);

  useEffect(() => {
    if (defaultWarehouse && !selectedWarehouseId) {
      setSelectedWarehouseId(defaultWarehouse.id);
    }
  }, [defaultWarehouse, selectedWarehouseId]);

  useEffect(() => {
    if (!distributorId) { navigate('/distributor-portal/login'); return; }
    if (orderId) loadOrderDetails();
  }, [orderId, distributorId]);

  const loadOrderDetails = async () => {
    try {
      const [{ data: orderData, error: orderError }, { data: itemsData, error: itemsError }] = await Promise.all([
        supabase.from('primary_orders').select('*').eq('id', orderId).single(),
        supabase.from('primary_order_items').select('*').eq('order_id', orderId),
      ]);
      if (orderError) throw orderError;
      if (itemsError) throw itemsError;

      setOrder(orderData);
      setItems(itemsData?.map(item => ({
        conversion_to_base: Number(item.conversion_to_base || 1),
        id: crypto.randomUUID(),
        order_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        variant_id: item.variant_id || undefined,
        variant_name: item.variant_name || undefined,
        ordered_quantity: Number((item as any).ordered_qty || item.quantity || 0),
        received_quantity: Number((item as any).ordered_qty || item.quantity || 0),
        returned_quantity: 0,
        ordered_base_qty: Number((item as any).base_qty || (Number(item.quantity || 0) * Number(item.conversion_to_base || 1))),
        return_reason: '',
        damaged_quantity: 0,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || '',
        unit: item.uom_code || item.unit,
        uom_id: item.uom_id || undefined,
        uom_code: item.uom_code || item.unit,
        unit_price: item.unit_price,
      })) || []);
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order details');
      navigate('/distributor-portal/goods-receipt');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (itemId: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item, [field]: value };
      // Ensure received + returned doesn't exceed ordered
      if (field === 'received_quantity') {
        updated.received_quantity = Math.max(0, Math.min(updated.ordered_quantity, Number(value) || 0));
      }
      if (field === 'returned_quantity') {
        updated.returned_quantity = Math.max(0, Math.min(updated.ordered_quantity - updated.received_quantity, Number(value) || 0));
      }
      return updated;
    }));
  };

  /**
   * Update a quantity field using the ordered UOM. Base conversion is applied only
   * when writing inventory, preventing unintended KG/gram double conversion.
   */
  const updateItemDisplayQty = (
    itemId: string,
    field: 'received_quantity' | 'returned_quantity',
    displayValue: any
  ) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const display = Number(displayValue);
      const enteredQty = Number.isFinite(display) ? display : 0;
      const updated = { ...item };
      if (field === 'received_quantity') {
        updated.received_quantity = Math.max(0, Math.min(updated.ordered_quantity, enteredQty));
      } else {
        updated.returned_quantity = Math.max(
          0,
          Math.min(updated.ordered_quantity - updated.received_quantity, enteredQty)
        );
      }
      return updated;
    }));
  };

  const handleConfirmGRN = async () => {
    if (!order || !distributorId) return;
    if (!selectedWarehouseId) {
      toast.error('Please select a warehouse before confirming GRN');
      return;
    }
    setSaving(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;

      // Generate GRN number
      const { data: grnNumData } = await supabase.rpc('generate_grn_number');
      const grnNumber = grnNumData || `GRN-${Date.now()}`;

      const allFullyReceived = items.every(i => i.received_quantity >= i.ordered_quantity && i.returned_quantity === 0);
      const receiptType = allFullyReceived ? 'full' : 'partial';

      // 1. Create GRN header
      const { data: grn, error: grnError } = await supabase
        .from('goods_receipt_notes')
        .insert({
          grn_number: grnNumber,
          order_id: orderId,
          distributor_id: distributorId,
          receipt_type: receiptType,
          status: 'confirmed',
          received_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          notes,
        })
        .select('id')
        .single();

      if (grnError) throw grnError;

      // 2. Create GRN line items
      const grnItems = items.map(item => ({
        received_base_qty: item.received_quantity * item.conversion_to_base,
        returned_base_qty: item.returned_quantity * item.conversion_to_base,
        conversion_to_base: item.conversion_to_base,
        uom_code: item.uom_code || item.unit,
        uom_id: item.uom_id || null,
        grn_id: grn.id,
        order_item_id: item.order_item_id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        variant_name: item.variant_name || null,
        ordered_quantity: item.ordered_quantity,
        received_quantity: item.received_quantity,
        returned_quantity: item.returned_quantity,
        return_reason: item.return_reason || null,
        damaged_quantity: item.damaged_quantity,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
        unit: item.unit,
        unit_price: item.unit_price,
      }));

      const { error: grnItemsError } = await supabase.from('grn_items').insert(grnItems);
      if (grnItemsError) throw grnItemsError;

      // 3. Update order items with received quantities
      for (const item of items) {
        await supabase.from('primary_order_items').update({
          received_quantity: item.received_quantity,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null,
        }).eq('id', item.order_item_id);
      }

      // 4. Update inventory atomically via execute_stock_action RPC
      // This handles distributor_inventory + inventory_batches + ledger in one transaction
      let inventoryErrors = 0;
      for (const item of items) {
        // Inward (accepted) stock
        if (item.received_quantity > 0) {
          const receivedBaseQty = item.received_quantity * item.conversion_to_base;
          const { data, error } = await supabase.rpc('execute_stock_action_numeric' as any, {
            p_distributor_id: distributorId,
            p_product_id: item.product_id,
            p_action: 'GRN',
            p_quantity: receivedBaseQty,
            p_notes: `GRN ${grnNumber} from order ${order.order_number}`,
            p_created_by: userId,
            p_warehouse_id: selectedWarehouseId,
            p_batch_no: item.batch_number || null,
            p_expiry_date: item.expiry_date || null,
            p_reference_id: grn.id,
            p_reference_number: grnNumber,
          });
          if (error) {
            console.error('GRN inventory update failed for', item.product_name, error);
            inventoryErrors++;
          } else {
            const result = typeof data === 'string' ? JSON.parse(data) : data;
            if (!result?.success) {
              console.error('GRN RPC returned error for', item.product_name, result?.error);
              inventoryErrors++;
            }
          }
        }

        // Damaged portion of received stock
        if (item.damaged_quantity > 0) {
          const { error } = await supabase.rpc('execute_stock_action_numeric' as any, {
            p_distributor_id: distributorId,
            p_product_id: item.product_id,
            p_action: 'MARK_DAMAGED',
            p_quantity: item.damaged_quantity * item.conversion_to_base,
            p_notes: `Damaged on GRN ${grnNumber}`,
            p_created_by: userId,
            p_warehouse_id: selectedWarehouseId,
            p_batch_no: item.batch_number || null,
            p_reference_id: grn.id,
            p_reference_number: grnNumber,
          });
          if (error) console.error('MARK_DAMAGED failed for', item.product_name, error);
        }
      }

      // 5. Create return note if any items returned
      const returnedItems = items.filter(i => i.returned_quantity > 0);
      if (returnedItems.length > 0) {
        const { data: retNumData } = await supabase.rpc('generate_return_number');
        const returnNumber = retNumData || `RET-${Date.now()}`;

        const totalReturnValue = returnedItems.reduce((sum, i) => sum + (i.returned_quantity * i.unit_price), 0);

        const { data: returnNote } = await supabase.from('primary_return_notes').insert({
          return_number: returnNumber,
          order_id: orderId,
          grn_id: grn.id,
          distributor_id: distributorId,
          status: 'submitted',
          total_return_value: totalReturnValue,
          notes: `Auto-created from GRN ${grnNumber}`,
        }).select('id').single();

        if (returnNote) {
          await supabase.from('primary_return_items').insert(
            returnedItems.map(i => ({
              return_note_id: returnNote.id,
              product_id: i.product_id,
              variant_id: i.variant_id || null,
              product_name: i.product_name,
              variant_name: i.variant_name || null,
              quantity: i.returned_quantity,
              unit: i.unit,
              unit_price: i.unit_price,
              return_reason: i.return_reason || 'other',
              batch_number: i.batch_number || null,
              condition: i.return_reason || 'damaged',
            }))
          );
        }
      }

      // 6. Update order status
      const anyReceived = items.some(i => i.received_quantity > 0);
      let newStatus = order.status;
      if (allFullyReceived) newStatus = 'delivered';
      else if (anyReceived) newStatus = 'partially_delivered';

      await supabase.from('primary_orders').update({
        status: newStatus,
        actual_delivery_date: new Date().toISOString().split('T')[0],
      }).eq('id', orderId);

      // 7. Log status change
      await supabase.from('primary_order_status_history').insert({
        order_id: orderId!,
        status: newStatus,
        notes: `GRN ${grnNumber} confirmed. ${receiptType} receipt.`,
      });

      if (inventoryErrors > 0) {
        toast.warning(`GRN ${grnNumber} confirmed with ${inventoryErrors} inventory issue(s). Check inventory tab.`);
      } else {
        toast.success(`GRN ${grnNumber} confirmed! Inventory updated.`);
      }
      navigate('/distributor-portal/goods-receipt');
    } catch (error) {
      console.error('Error confirming GRN:', error);
      toast.error('Failed to confirm GRN');
    } finally {
      setSaving(false);
    }
  };

  const totalOrdered = items.reduce((sum, i) => sum + i.ordered_quantity, 0);
  const totalReceived = items.reduce((sum, i) => sum + i.received_quantity, 0);
  const totalReturned = items.reduce((sum, i) => sum + i.returned_quantity, 0);
  const allMatch = items.every(i => i.received_quantity === i.ordered_quantity && i.returned_quantity === 0);

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
      <header className="sticky-header-safe z-50 bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/distributor-portal/goods-receipt')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-foreground flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  Create GRN
                </h1>
                <p className="text-xs text-muted-foreground">
                  {order.order_number} • {format(new Date(order.order_date), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-700">
              <Truck className="w-3 h-3 mr-1" />
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Warehouse Selection */}
        {!whLoading && warehouses.length === 0 ? (
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-4 text-center space-y-2">
              <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto" />
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
                  <SelectTrigger className="w-[260px] h-9 text-sm">
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

        {/* Summary */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Items</p>
                <p className="text-lg font-bold">{items.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ordered</p>
                <p className="text-lg font-bold">{totalOrdered}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Received</p>
                <p className={`text-lg font-bold ${allMatch ? 'text-green-600' : 'text-orange-600'}`}>{totalReceived}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Returned</p>
                <p className={`text-lg font-bold ${totalReturned > 0 ? 'text-destructive' : ''}`}>{totalReturned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        {allMatch ? (
          <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">Full receipt — order will be marked as delivered.</span>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-700 dark:text-orange-400">Partial receipt — order will be marked accordingly.</span>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Verify & Receive Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => {
              const displayUnit = item.uom_code || item.unit;
              const orderedDisplay = item.ordered_quantity;
              const receivedDisplay = item.received_quantity;
              const returnedDisplay = item.returned_quantity;
              const remainingDisplay = item.ordered_quantity - item.received_quantity;
              const fmt = (n: number) =>
                Number.isInteger(n) ? n.toString() : Number(n.toFixed(3)).toString();

              return (
              <div key={item.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.product_name}</p>
                    {item.variant_name && <p className="text-sm text-muted-foreground">{item.variant_name}</p>}
                  </div>
                  <Badge variant="outline">Ordered: {fmt(orderedDisplay)} {displayUnit}</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Received Qty ({displayUnit})
                    </label>
                    <Input
                      type="number" min={0} max={orderedDisplay} step="any"
                      value={receivedDisplay}
                      onChange={(e) => updateItemDisplayQty(item.id, 'received_quantity', e.target.value)}
                      className={item.received_quantity !== item.ordered_quantity ? 'border-orange-300' : ''}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Returned Qty ({displayUnit})
                    </label>
                    <Input
                      type="number" min={0} max={remainingDisplay} step="any"
                      value={returnedDisplay}
                      onChange={(e) => updateItemDisplayQty(item.id, 'returned_quantity', e.target.value)}
                      className={item.returned_quantity > 0 ? 'border-destructive' : ''}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Batch No.</label>
                    <Input
                      placeholder="Batch"
                      value={item.batch_number}
                      onChange={(e) => updateItem(item.id, 'batch_number', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Expiry Date</label>
                    <Input
                      type="date"
                      value={item.expiry_date}
                      onChange={(e) => updateItem(item.id, 'expiry_date', e.target.value)}
                    />
                  </div>
                </div>

                {item.returned_quantity > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      <RotateCcw className="w-3 h-3 inline mr-1" />
                      Return Reason
                    </label>
                    <Select value={item.return_reason} onValueChange={(v) => updateItem(item.id, 'return_reason', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {RETURN_REASONS.map(r => (
                          <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(item.received_quantity !== item.ordered_quantity || item.returned_quantity > 0) && (
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Ordered {fmt(orderedDisplay)} {displayUnit}, receiving {fmt(receivedDisplay)} {displayUnit}
                    {item.returned_quantity > 0 && `, returning ${fmt(returnedDisplay)} ${displayUnit}`}
                  </p>
                )}
              </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium block mb-2">GRN Notes</label>
            <Textarea
              placeholder="Any remarks about this receipt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/distributor-portal/goods-receipt')}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirmGRN}
            disabled={saving || totalReceived === 0 || !selectedWarehouseId || warehouses.length === 0}
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

export default GoodsReceiptNew;
