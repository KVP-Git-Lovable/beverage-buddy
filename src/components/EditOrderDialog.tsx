import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditOrderDialogProps {
  orderId: string;
  retailerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface OrderItem {
  id?: string;
  product_name: string;
  quantity: number;
  rate: number;
  unit: string;
  total: number;
  originalUnit?: string;
  originalRate?: number;
}

export default function EditOrderDialog({ orderId, retailerName, open, onOpenChange, onSaved }: EditOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    if (open && orderId) {
      loadOrderData();
    }
  }, [open, orderId]);

  const loadOrderData = async () => {
    setLoading(true);
    try {
      // Load order header
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Load order items
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      setOrderData(order);
      setDiscountAmount(order.discount_amount || 0);
      setItems(
        (orderItems || []).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          rate: item.rate,
          unit: item.unit || "Piece",
          total: item.total || item.quantity * item.rate,
          originalUnit: item.unit || "Piece",
          originalRate: item.rate,
        }))
      );
    } catch (error: any) {
      console.error("Error loading order data:", error);
      toast.error("Failed to load order data");
    } finally {
      setLoading(false);
    }
  };

  // Unit conversion factors - rate per unit conversion
  // If original is ₹209.52/KG, converting to Gram means ₹209.52/1000 = ₹0.21/gram
  const getUnitConversionFactor = (fromUnit: string, toUnit: string): number => {
    // Define unit sizes (how many base units)
    const weightInGrams: Record<string, number> = {
      "Gram": 1,
      "KG": 1000,
    };
    const volumeInML: Record<string, number> = {
      "ML": 1,
      "Liter": 1000,
    };
    
    // Check if both units are in the same category
    // Rate conversion: if from KG to Gram, divide by (KG/Gram) = 1000
    if (weightInGrams[fromUnit] !== undefined && weightInGrams[toUnit] !== undefined) {
      return weightInGrams[toUnit] / weightInGrams[fromUnit];
    }
    if (volumeInML[fromUnit] !== undefined && volumeInML[toUnit] !== undefined) {
      return volumeInML[toUnit] / volumeInML[fromUnit];
    }
    
    // No conversion available
    return 1;
  };

  const updateItemTotal = (item: OrderItem): OrderItem => {
    return {
      ...item,
      total: item.quantity * item.rate,
    };
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    
    if (field === "unit" && currentItem.originalRate !== undefined) {
      // Convert rate based on unit change
      const conversionFactor = getUnitConversionFactor(currentItem.originalUnit || "Piece", value);
      const newRate = currentItem.originalRate * conversionFactor;
      
      newItems[index] = { 
        ...currentItem, 
        unit: value,
        rate: parseFloat(newRate.toFixed(4)),
      };
    } else {
      newItems[index] = { ...currentItem, [field]: value };
    }
    
    newItems[index] = updateItemTotal(newItems[index]);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        product_name: "",
        quantity: 1,
        rate: 0,
        unit: "Piece",
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    // Validate items
    const invalidItems = items.filter(item => !item.product_name.trim());
    if (invalidItems.length > 0) {
      toast.error("All items must have a product name");
      return;
    }

    setSaving(true);
    try {
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const totalAmount = subtotal - discountAmount;

      // Get existing product_id/category from old items BEFORE deleting
      const { data: existingItems } = await supabase
        .from("order_items")
        .select("product_id, category")
        .eq("order_id", orderId)
        .limit(1);

      const defaultProductId = existingItems?.[0]?.product_id || orderId;
      const defaultCategory = existingItems?.[0]?.category || "General";

      // Update order header
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          subtotal: subtotal,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Delete existing order items
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (deleteError) throw deleteError;

      // Insert updated order items
      const itemsToInsert = items.map((item) => ({
        order_id: orderId,
        product_id: defaultProductId,
        product_name: item.product_name,
        quantity: item.quantity,
        rate: item.rate,
        unit: item.unit || "Piece",
        total: item.total,
        category: defaultCategory,
      }));

      const { error: insertError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      toast.success("Order updated successfully!");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving order:", error);
      toast.error("Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = subtotal - discountAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Order: {retailerName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Order Items</Label>
                <Button size="sm" onClick={addItem} variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Product Name</TableHead>
                      <TableHead className="w-[100px]">Quantity</TableHead>
                      <TableHead className="w-[100px]">Unit</TableHead>
                      <TableHead className="w-[120px]">Rate (₹)</TableHead>
                      <TableHead className="w-[120px]">Total (₹)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.product_name}
                            onChange={(e) => handleItemChange(index, "product_name", e.target.value)}
                            placeholder="Product name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unit}
                            onValueChange={(value) => handleItemChange(index, "unit", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Piece">Piece</SelectItem>
                              <SelectItem value="KG">KG</SelectItem>
                              <SelectItem value="Gram">Gram</SelectItem>
                              <SelectItem value="Liter">Liter</SelectItem>
                              <SelectItem value="ML">ML</SelectItem>
                              <SelectItem value="Box">Box</SelectItem>
                              <SelectItem value="Case">Case</SelectItem>
                              <SelectItem value="Pack">Pack</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) =>
                              handleItemChange(index, "rate", parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell className="font-medium">₹{item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(index)}
                            className="h-8 w-8 p-0"
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Summary Section */}
            <div className="flex justify-end">
              <div className="space-y-2 min-w-[250px]">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <Label className="text-sm">Discount:</Label>
                  <Input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-28"
                  />
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
