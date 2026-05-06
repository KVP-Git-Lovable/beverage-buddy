import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  Save,
  Send,
  Package,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProductUnit } from '@/lib/uomEngine';

interface Category {
  id: string;
  name: string;
}

interface PriceBookEntry {
  product_id: string;
  variant_id: string | null;
  final_price: number;
  list_price: number;
}

interface Product {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  unit?: string;
  price?: number;
  priceBookPrice?: number;
  variants?: any[];
}

interface OrderItem {
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  base_qty: number;
  unit: string;
  uom_id?: string;
  uom_code?: string;
  conversion_to_base?: number;
  price_basis_uom_code?: string;
  price_basis_conversion_to_base?: number;
  unit_price: number;
  line_total: number;
}

const CreatePrimaryOrder = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [priceBookEntries, setPriceBookEntries] = useState<PriceBookEntry[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedUomCode, setSelectedUomCode] = useState<string>('');
  const [productUnits, setProductUnits] = useState<Record<string, ProductUnit[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [priceBookName, setPriceBookName] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [outstanding, setOutstanding] = useState<number>(0);
  const [creditChecked, setCreditChecked] = useState(false);
  const [orderToLabel, setOrderToLabel] = useState<string>('');
  const [targetDistributorId, setTargetDistributorId] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  
  const distributorId = localStorage.getItem('distributor_id');

  useEffect(() => {
    if (!distributorId) {
      navigate('/distributor-portal/login');
      return;
    }
    loadData();
    loadCreditInfo();
  }, [distributorId, navigate]);

  const loadCreditInfo = async () => {
    if (!distributorId) return;
    try {
      const [creditRes, ordersRes] = await Promise.all([
        supabase
          .from('distributor_credit_limits')
          .select('credit_limit')
          .eq('distributor_id', distributorId)
          .maybeSingle(),
        supabase
          .from('primary_orders')
          .select('total_amount')
          .eq('distributor_id', distributorId)
          .not('status', 'in', '("cancelled","delivered")'),
      ]);
      setCreditLimit(Number(creditRes.data?.credit_limit || 0));
      const totalOutstanding = (ordersRes.data || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      setOutstanding(totalOutstanding);
      setCreditChecked(true);
    } catch (err) {
      console.error('Credit check failed:', err);
    }
  };

  // Filter products when category changes
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category_id === selectedCategory));
    }
    setSelectedProduct(''); // Reset product selection when category changes
  }, [selectedCategory, products]);

  const loadData = async () => {
    try {
      // Load categories
      const { data: categoriesData } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');
      
      setCategories(categoriesData || []);

      // Load distributor's active price book
      const { data: priceBookData } = await supabase
        .from('distributor_price_books')
        .select(`
          price_book_id,
          price_books (
            id,
            name
          )
        `)
        .eq('distributor_id', distributorId)
        .eq('is_active', true)
        .single();

      let priceEntries: PriceBookEntry[] = [];
      
      if (priceBookData?.price_book_id) {
        const priceBook = priceBookData.price_books as any;
        setPriceBookName(priceBook?.name || '');
        
        // Load price book entries
        const { data: entriesData } = await supabase
          .from('price_book_entries')
          .select('product_id, variant_id, final_price, list_price')
          .eq('price_book_id', priceBookData.price_book_id)
          .eq('is_active', true);
        
        priceEntries = entriesData || [];
        setPriceBookEntries(priceEntries);
      }

      // Load products with category info
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (id, name),
          product_variants(*)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Enrich products with price book prices and category info
      const enrichedProducts = (productsData || []).map(product => {
        const priceEntry = priceEntries.find(
          e => e.product_id === product.id && e.variant_id === null
        );
        
        return {
          ...product,
          category_id: product.product_categories?.id,
          category_name: product.product_categories?.name,
          priceBookPrice: priceEntry?.final_price,
        };
      });

      setProducts(enrichedProducts);
      setFilteredProducts(enrichedProducts);

      const unitEntries = await Promise.all(
        enrichedProducts.map(async (product) => {
          const { data } = await supabase.rpc('get_product_units', { p_product_id: product.id });
          const units = ((data as any[]) || []).map((r) => ({
            mappingId: r.mapping_id,
            uomId: r.uom_id,
            code: r.code,
            name: r.name,
            category: r.category,
            conversionToBase: Number(r.conversion_to_base || 1),
            isBase: !!r.is_base,
            isDefaultSales: !!r.is_default_sales,
            isPriceBasis: !!r.is_price_basis,
          })) as ProductUnit[];
          return [product.id, units] as const;
        })
      );
      setProductUnits(Object.fromEntries(unitEntries));

      // Load distributor type + parent for order routing
      const { data: distInfo } = await supabase
        .from('distributors')
        .select(`
          id, name, type_id, parent_id, distribution_level,
          distributor_types!type_id ( code ),
          parent:distributors!parent_id ( id, name )
        `)
        .eq('id', distributorId)
        .single();

      if (distInfo) {
        // Resolve type code (with legacy fallback)
        let typeCode = (distInfo.distributor_types as any)?.code || '';
        if (!typeCode && distInfo.distribution_level) {
          const { data: legacyType } = await supabase
            .from('distributor_types')
            .select('code')
            .eq('legacy_mapping', distInfo.distribution_level)
            .single();
          typeCode = legacyType?.code || '';
        }

        // Routing logic
        if (typeCode === 'USS') {
          if (distInfo.parent_id && (distInfo as any).parent) {
            setTargetDistributorId(distInfo.parent_id);
            setOrderToLabel((distInfo as any).parent.name || 'Parent Distributor');
            setRoutingError(null);
          } else {
            setRoutingError('Cannot create order: no parent distributor assigned. Please contact admin.');
            setOrderToLabel('');
          }
        } else {
          // DD or SS → route to Company
          setTargetDistributorId(null);
          setOrderToLabel('Company');
          setRoutingError(null);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  const getProductPrice = (product: Product): number => {
    // First check price book price, then fall back to product price
    return product.priceBookPrice ?? product.price ?? 0;
  };

  const getPriceBasisUnit = (productId: string) => {
    const units = productUnits[productId] || [];
    return units.find(u => u.isPriceBasis) || units.find(u => u.isDefaultSales) || units.find(u => u.isBase) || null;
  };

  const getSelectedUnit = (productId: string) => {
    const units = productUnits[productId] || [];
    return units.find(u => u.code === selectedUomCode) || units.find(u => u.isDefaultSales) || units.find(u => u.isBase) || null;
  };

  const formatQty = (n: number) => Number.isInteger(n) ? n.toString() : Number(n.toFixed(3)).toString();

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedUomCode('');
      return;
    }
    const u = getSelectedUnit(selectedProduct);
    setSelectedUomCode(u?.code || '');
  }, [selectedProduct, productUnits]);

  const addItem = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const selectedUnit = getSelectedUnit(product.id);
    const priceBasisUnit = getPriceBasisUnit(product.id);
    if (!selectedUnit || !priceBasisUnit) {
      toast.error('This product has no valid UOM mapping');
      return;
    }

    const basePrice = getProductPrice(product);
    const unitPrice = basePrice * (selectedUnit.conversionToBase / priceBasisUnit.conversionToBase);
    const baseQty = quantity * selectedUnit.conversionToBase;
    const existingIndex = orderItems.findIndex(item => item.product_id === selectedProduct && item.uom_code === selectedUnit.code);
    
    if (existingIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingIndex].quantity += quantity;
      updatedItems[existingIndex].base_qty += baseQty;
      updatedItems[existingIndex].line_total = updatedItems[existingIndex].quantity * updatedItems[existingIndex].unit_price;
      setOrderItems(updatedItems);
    } else {
      const newItem: OrderItem = {
        product_id: product.id,
        product_name: product.name,
        quantity,
        base_qty: baseQty,
        unit: selectedUnit.code,
        uom_id: selectedUnit.uomId,
        uom_code: selectedUnit.code,
        conversion_to_base: selectedUnit.conversionToBase,
        price_basis_uom_code: priceBasisUnit.code,
        price_basis_conversion_to_base: priceBasisUnit.conversionToBase,
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
      };
      setOrderItems([...orderItems, newItem]);
    }

    setSelectedProduct('');
    setQuantity(1);
    toast.success('Item added');
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedItems = [...orderItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].base_qty = newQuantity * (updatedItems[index].conversion_to_base || 1);
    updatedItems[index].line_total = newQuantity * updatedItems[index].unit_price;
    setOrderItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.line_total, 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const saveOrder = async (submit = false) => {
    if (routingError) {
      toast.error(routingError);
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const { subtotal, tax, total } = calculateTotals();

    // Credit limit enforcement on submit
    if (submit && creditLimit > 0) {
      const newOutstanding = outstanding + total;
      if (newOutstanding > creditLimit) {
        toast.error(
          `Credit limit exceeded! Limit: ₹${creditLimit.toLocaleString('en-IN')}, Outstanding + this order: ₹${newOutstanding.toLocaleString('en-IN')}. Cannot submit.`,
          { duration: 6000 }
        );
        return;
      }
    }

    setLoading(true);
    
    // Generate order number
    const orderNumber = `PO-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('primary_orders')
        .insert([{
          order_number: orderNumber,
          distributor_id: distributorId,
          source_distributor_id: distributorId,
          target_distributor_id: targetDistributorId,
          expected_delivery_date: expectedDeliveryDate || null,
          notes,
          status: submit ? 'submitted' : 'draft',
          subtotal,
          tax_amount: tax,
          total_amount: total,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const itemsToInsert = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        variant_name: item.variant_name || null,
        quantity: item.quantity,
        ordered_qty: item.quantity,
        base_qty: item.base_qty,
        unit: item.unit,
        uom_id: item.uom_id || null,
        uom_code: item.uom_code || item.unit,
        conversion_to_base: item.conversion_to_base || 1,
        unit_price: item.unit_price,
        line_total: item.line_total,
      }));

      const { error: itemsError } = await supabase
        .from('primary_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Log initial status in order history
      await supabase
        .from('primary_order_status_history')
        .insert({
          order_id: order.id,
          status: submit ? 'submitted' : 'draft',
          notes: 'Order created',
        });

      toast.success(submit ? 'Order submitted successfully!' : 'Order saved as draft');
      navigate('/distributor-portal/primary-orders');
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast.error(error.message || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-background pb-32 standalone-page">
      {/* Header */}
      <header className="sticky-header-safe z-50 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/distributor-portal/primary-orders')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">New Primary Order</h1>
              <p className="text-xs text-muted-foreground">
                {orderItems.length} items added
                {priceBookName && <span className="ml-2">• Price Book: {priceBookName}</span>}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Credit Limit Warning */}
        {creditChecked && creditLimit > 0 && (
          <Card className={`border-l-4 ${outstanding > creditLimit ? 'border-l-destructive bg-destructive/5' : outstanding > creditLimit * 0.8 ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-green-500 bg-green-50'}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {outstanding > creditLimit ? '⚠️ Credit Limit Exceeded' : 'Credit Status'}
                </span>
                <span>
                  ₹{outstanding.toLocaleString('en-IN')} / ₹{creditLimit.toLocaleString('en-IN')}
                </span>
              </div>
              {outstanding > creditLimit && (
                <p className="text-xs text-destructive mt-1">Order submission is blocked until outstanding is cleared.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Product Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Selection */}
              <div>
                <Label>Select Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : filteredProducts.length === 0 ? (
                      <SelectItem value="none" disabled>No products in this category</SelectItem>
                    ) : (
                      filteredProducts.map(product => {
                        const price = getProductPrice(product);
                        const hasPriceBookPrice = product.priceBookPrice !== undefined;
                        return (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}/{product.unit || 'pc'}
                            {hasPriceBookPrice && <span className="text-primary ml-1">★</span>}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Unit</Label>
                <Select value={selectedUomCode} onValueChange={setSelectedUomCode} disabled={!selectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {(productUnits[selectedProduct] || []).map(u => (
                      <SelectItem key={u.uomId} value={u.code}>{u.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div>
                <Label>Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            {selectedProduct && getSelectedUnit(selectedProduct) && getPriceBasisUnit(selectedProduct) && (
              <p className="text-xs text-muted-foreground">
                1 {getSelectedUnit(selectedProduct)?.code} = {formatQty((getSelectedUnit(selectedProduct)?.conversionToBase || 1) / (getPriceBasisUnit(selectedProduct)?.conversionToBase || 1))} {getPriceBasisUnit(selectedProduct)?.code}
                {' '}= {formatQty(getSelectedUnit(selectedProduct)?.conversionToBase || 1)} base units
              </p>
            )}
            <Button onClick={addItem} className="w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add to Order
            </Button>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Order Items ({orderItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No items added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.unit_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / {item.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Base qty: {formatQty(item.base_qty)} • 1 {item.unit} = {formatQty(item.conversion_to_base || 1)} base
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-12 text-center font-medium">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-right min-w-20">
                      <p className="font-semibold">₹{item.line_total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order To (routing) */}
            {routingError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{routingError}</AlertDescription>
              </Alert>
            ) : orderToLabel ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Order To:</span>
                <span className="text-sm font-medium text-foreground">{orderToLabel}</span>
              </div>
            ) : null}

            <div>
              <Label>Expected Delivery Date</Label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label>Notes / Special Instructions</Label>
              <Textarea
                placeholder="Any special requirements or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Fixed Bottom Summary */}
      {orderItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-auto space-y-1 text-sm">
                <div className="flex justify-between gap-8">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-muted-foreground">Tax (18%):</span>
                  <span className="font-medium">₹{tax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between gap-8 text-lg font-bold border-t pt-1">
                  <span>Total:</span>
                  <span className="text-primary">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button 
                  variant="outline" 
                  onClick={() => saveOrder(false)}
                  disabled={loading}
                  className="flex-1 md:flex-none"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button 
                  onClick={() => saveOrder(true)}
                  disabled={loading}
                  className="flex-1 md:flex-none"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePrimaryOrder;
