import React, { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle, startTransition, useCallback } from "react";
import { ProductPickerPopover, type PickerOption } from "@/components/order-entry/ProductPickerPopover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Gift, Package, Search, Check, ChevronsUpDown, Star, Sparkles, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { isFocusedProductActive } from "@/utils/focusedProductChecker";
import { ApplyOfferSection } from "@/components/ApplyOfferSection";
import { OrderEntrySchemesModal } from "@/components/OrderEntrySchemesModal";
import { useOfflineSchemes, ProductScheme } from "@/hooks/useOfflineSchemes";
import { useAppliedSchemes } from "@/hooks/useAppliedSchemes";
import { useSchemePolicies } from "@/hooks/useSchemePolicies";
import { calculateOrderWithSchemes, calculateSchemeDiscountForComparison, SchemeItem, isSchemeActive, isSchemeConditionMet, schemeHasConditions } from "@/utils/schemeEngine";
import { loadProductUnits, type ProductUnit } from "@/lib/uomEngine";
import { UnitSelect } from "@/components/order-entry/UnitControls";
import { Loader2 } from "lucide-react";
import { useProductSearch, type ProductSearchResult } from "@/hooks/useProductSearch";
interface Product {
  id: string;
  sku: string;
  name: string;
  category: { name: string } | null;
  rate: number;
  unit: string;
  base_unit?: string;
  conversion_factor?: number;
  closing_stock: number;
  is_active?: boolean;
  is_focused_product?: boolean;
  focused_type?: string | null;
  focused_due_date?: string | null;
  focused_recurring_config?: any;
  focused_territories?: string[] | null;
  schemes?: { 
    name: string; 
    description: string; 
    is_active: boolean;
    scheme_type: string;
    condition_quantity: number;
    discount_percentage: number;
  }[];
  variants?: {
    id: string;
    variant_name: string;
    sku: string;
    price: number;
    stock_quantity: number;
    discount_amount: number;
    discount_percentage: number;
    is_active: boolean;
    is_focused_product?: boolean;
    focused_type?: string | null;
    focused_due_date?: string | null;
    focused_recurring_config?: any;
    focused_territories?: string[] | null;
  }[];
}

interface OrderRow {
  id: string;
  productCode: string;
  product?: Product;
  variant?: any;
  quantity: number;
  closingStock: number;
  unit: string;
  total: number;
}

interface TableOrderFormProps {
  onCartUpdate: (items: any[]) => void;
  products: Product[];
  loading: boolean;
  onReloadProducts?: () => void;
  onStockUpdate?: (productId: string, stockQuantity: number, productName: string) => void;
}

// Expose this handle type for refs
export interface TableOrderFormHandle {
  applyVoiceAutoFill: (results: VoiceAutoFillResult[]) => void;
}

export interface VoiceAutoFillResult {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unit: string;
  confidence: 'high' | 'medium' | 'low';
  searchTerm: string;
}

export const TableOrderForm = forwardRef<TableOrderFormHandle, TableOrderFormProps>(({ onCartUpdate, products, loading, onReloadProducts, onStockUpdate }, ref) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';

  // PERF: disable noisy logs in hot paths
  const DEV_LOG = false;
  
  // Create storage key for table form persistence FIRST (needed for initial state)
  const validRetailerId = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
  const validVisitId = visitId && visitId.length > 1 ? visitId : null;
  
  const tableFormStorageKey = validVisitId && validRetailerId 
    ? `table_form:${validVisitId}:${validRetailerId}`
    : validRetailerId 
      ? `table_form:temp:${validRetailerId}`
      : 'table_form:fallback';

  // Companion cart key — used to decide whether stale table_form data should
  // be restored. New orders must start blank: only restore the saved rows when
  // a real cart with items exists for this retailer/visit.
  const companionCartStorageKey = validVisitId && validRetailerId
    ? `order_cart:${validVisitId}:${validRetailerId}`
    : validRetailerId
      ? `order_cart:temp:${validRetailerId}`
      : 'order_cart:fallback';

  const hasActiveCompanionCart = (cartKey: string): boolean => {
    try {
      const raw = localStorage.getItem(cartKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  };

  // Load initial order rows from localStorage to prevent data loss on navigation.
  // IMPORTANT: only restore when a non-empty companion cart exists — otherwise a
  // stale `table_form` from a previous abandoned session would pre-fill rows
  // (e.g. "RASALECT 1MG 10-S") for every brand new order.
  const getInitialOrderRows = (): OrderRow[] => {
    try {
      if (!hasActiveCompanionCart(companionCartStorageKey)) {
        // Stale leftover — wipe so it can't resurface later.
        localStorage.removeItem(tableFormStorageKey);
        return [{ id: "1", productCode: "", quantity: 0, closingStock: 0, unit: "", total: 0 }];
      }
      const savedData = localStorage.getItem(tableFormStorageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          DEV_LOG && console.log('[TableOrderForm] Loaded initial rows from storage:', parsedData.length);
          return parsedData;
        }
      }
    } catch (error) {
      console.error('[TableOrderForm] Error loading initial rows:', error);
    }
    return [{ id: "1", productCode: "", quantity: 0, closingStock: 0, unit: "", total: 0 }];
  };

  const [orderRows, setOrderRows] = useState<OrderRow[]>(getInitialOrderRows);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Use ref to always have access to the latest orderRows for addToCart
  const orderRowsRef = useRef<OrderRow[]>(orderRows);
  useEffect(() => {
    orderRowsRef.current = orderRows;
  }, [orderRows]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<string>('');
  const [openComboboxes, setOpenComboboxes] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSchemesModal, setShowSchemesModal] = useState(false);

  // Server-side product search now lives inside <ProductPickerPopover> so
  // typing in the search input never re-renders the cart, totals, or other rows.
  
  // Load schemes with offline support
  const { schemes, loading: schemesLoading, isOnline } = useOfflineSchemes();
  
  // Load scheme policies for enforcement
  const { policies: schemePolicies, loading: policiesLoading } = useSchemePolicies();
  
  // Applied schemes persistence
  const { appliedSchemeIds, applyScheme, removeScheme, clearSchemes, setOnlyScheme } = useAppliedSchemes(visitId, retailerId);
  
  // Track auto-applied schemes to prevent infinite loops
  const autoAppliedSchemesRef = useRef<Set<string>>(new Set());
  // Track schemes the user explicitly removed so they don't instantly auto-apply again
  const suppressedSchemesRef = useRef<Set<string>>(new Set());

  const removeAppliedSchemeById = (schemeId: string) => {
    // Suppress to keep user intent (don’t instantly auto-reapply while conditions remain met)
    suppressedSchemesRef.current.add(schemeId);
    autoAppliedSchemesRef.current.delete(schemeId);
    removeScheme(schemeId);
  };

  // Get unique categories from products (memoized for performance)
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category?.name) set.add(p.category.name);
    });
    return Array.from(set).sort();
  }, [products]);

  // Helper to get cart storage key
  const getCartStorageKey = () => {
    const validRetailerIdForStorage = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
    const validVisitIdForStorage = visitId && visitId.length > 1 ? visitId : null;
    return validVisitIdForStorage && validRetailerIdForStorage 
      ? `order_cart:${validVisitIdForStorage}:${validRetailerIdForStorage}`
      : validRetailerIdForStorage 
        ? `order_cart:temp:${validRetailerIdForStorage}`
        : 'order_cart:fallback';
  };

  // -------- UOM resolution (mapping-driven, no hardcoded KG/grams) --------
  // Per-product cached units (mirrors uomEngine in-memory cache, exposed to
  // synchronous render code so we can compute prices/equivalents inline).
  const [productUnitsMap, setProductUnitsMap] = useState<Record<string, ProductUnit[]>>({});
  const productUnitsMapRef = useRef<Record<string, ProductUnit[]>>({});
  useEffect(() => { productUnitsMapRef.current = productUnitsMap; }, [productUnitsMap]);
  const inflightUnitFetches = useRef<Set<string>>(new Set());

  const ensureUnitsLoaded = (productId: string): ProductUnit[] | null => {
    if (!productId) return null;
    const cached = productUnitsMapRef.current[productId];
    if (cached) return cached;
    if (inflightUnitFetches.current.has(productId)) return null;
    inflightUnitFetches.current.add(productId);
    void loadProductUnits(productId).then((units) => {
      inflightUnitFetches.current.delete(productId);
      setProductUnitsMap((prev) => ({ ...prev, [productId]: units }));
    });
    return null;
  };

  /** Default UOM code for a product: is_default_sales → is_base → first. */
  const getDefaultUnitCode = (productId: string): string => {
    const units = ensureUnitsLoaded(productId);
    if (!units || units.length === 0) return '';
    return (
      units.find((u) => u.isDefaultSales)?.code ||
      units.find((u) => u.isBase)?.code ||
      units[0].code
    );
  };

  /**
   * Per-unit price derived strictly from product_uom_mapping conversion factors.
   *   rate = baseRate × (target.conversionToBase / priceBasis.conversionToBase)
   * baseRate is products.rate (or variant.price), which is the rate of one
   * price-basis unit (or base unit when none flagged).
   *
   * Returns `null` when the product has no UOM mappings or the selected
   * unit isn't part of the mapping — callers must surface an error to the
   * user and refuse to add the row to the cart.
   */
  const getPricePerUnit = (prod: Product, variant?: any, unitCode?: string): number | null => {
    const baseRate = Number(variant ? variant.price : prod.rate) || 0;
    const units = ensureUnitsLoaded(prod.id);
    if (!units || units.length === 0 || !unitCode) return null;
    const target = units.find((u) => u.code.toUpperCase() === unitCode.toUpperCase());
    if (!target) return null;
    const basis =
      units.find((u) => u.isPriceBasis) ??
      units.find((u) => u.isBase) ??
      units[0];
    const basisConv = basis.conversionToBase || 1;
    return baseRate * (target.conversionToBase / basisConv);
  };

  /** True once units for this product have been loaded AND the list is empty. */
  const isProductUnconfigured = (productId?: string): boolean => {
    if (!productId) return false;
    const cached = productUnitsMapRef.current[productId];
    return !!cached && cached.length === 0;
  };

  /** Build the small "(= X CODE)" hint shown under Qty using mapping factors. */
  const getUnitEquivalent = (qty: number, productId: string, unitCode?: string): string => {
    if (!qty || qty <= 0 || !unitCode) return '';
    const units = productUnitsMapRef.current[productId];
    if (!units || units.length === 0) return '';
    const selected = units.find((u) => u.code.toUpperCase() === unitCode.toUpperCase());
    if (!selected) return '';
    const baseQty = qty * selected.conversionToBase;
    // Pick a sibling using mapping order only — no code-name heuristics.
    // Prefer the first non-base sibling, fall back to the base unit itself.
    const others = units.filter((u) => u.uomId !== selected.uomId && u.conversionToBase > 0);
    if (others.length === 0) return '';
    const sib = others.find((u) => !u.isBase) || others.find((u) => u.isBase) || others[0];
    const eq = baseQty / sib.conversionToBase;
    if (!isFinite(eq) || eq <= 0) return '';
    const pretty = eq >= 100 ? Math.round(eq) : Number(eq.toFixed(eq >= 1 ? 2 : 3));
    return `(= ${pretty} ${sib.code})`;
  };

  /** Sync rows to cart using mapping-driven prices and selected unit verbatim. */
  // Debounce flag to avoid spamming the toast on every keystroke.
  const skippedRowsToastRef = useRef<string>('');
  const syncRowsToCart = (rows: OrderRow[]) => {
    const productRows = rows.filter(row => row.product && row.quantity > 0);
    const skipped: string[] = [];
    const pendingLoads: string[] = [];
    const cartItems = productRows.flatMap(row => {
      const productId = row.product!.id;
      // Kick off load if needed — returns null while pending.
      ensureUnitsLoaded(productId);
      const units = productUnitsMapRef.current[productId];
      // If units haven't loaded yet, defer this row silently. A re-sync will
      // happen once productUnitsMap state updates and re-renders the form.
      if (!units) {
        pendingLoads.push(productId);
        return [];
      }
      // STRICT GUARD — refuse to add rows whose product has no UOM mapping
      // or whose selected unit isn't part of the mapping. No silent fallback
      // to the raw rate (would imply a unit we cannot represent).
      const selectedUnit = row.unit || getDefaultUnitCode(productId) || '';
      const ratePerSelectedUnit = getPricePerUnit(row.product!, row.variant, selectedUnit);
      if (units.length === 0 || !selectedUnit || ratePerSelectedUnit == null) {
        skipped.push(row.product!.name);
        return [];
      }
      const displayName = row.variant ? row.variant.variant_name : row.product!.name;
      const stock = row.variant ? row.variant.stock_quantity : row.product!.closing_stock;
      const itemId = row.variant ? `${productId}_variant_${row.variant.id}` : productId;
      const originalRatePerSelectedUnit = ratePerSelectedUnit;
      const baseUnit = units.find((u) => u.isBase)?.code || selectedUnit;

      return [{
        id: itemId,
        name: displayName || 'Unknown Product',
        category: row.product!.category?.name || 'Uncategorized',
        rate: ratePerSelectedUnit,
        original_rate: originalRatePerSelectedUnit,
        unit: selectedUnit,
        base_unit: baseUnit,
        quantity: Number(row.quantity) || 0,
        total: Number(row.total) || 0,
        closingStock: Number(stock) || 0,
        schemes: row.product!.schemes || [],
        display_unit: selectedUnit,
        display_quantity: Number(row.quantity) || 0,
        hsn_code: (row.product as any)?.hsn_code || null
      }];
    });

    if (skipped.length > 0) {
      const key = skipped.sort().join('|');
      if (skippedRowsToastRef.current !== key) {
        skippedRowsToastRef.current = key;
        toast({
          title: 'No unit set for product',
          description: `${skipped.join(', ')} cannot be added until units are configured in Product Master.`,
          variant: 'destructive',
        });
      }
    } else {
      skippedRowsToastRef.current = '';
    }

    onCartUpdate(cartItems);
    localStorage.setItem(getCartStorageKey(), JSON.stringify(cartItems));
    DEV_LOG && console.log('[syncRowsToCart] Synced to cart:', cartItems.length, 'items (mapping-driven UOM); skipped:', skipped.length);
  };

  // Expose applyVoiceAutoFill to parent via ref
  useImperativeHandle(ref, () => ({
    applyVoiceAutoFill: (results: VoiceAutoFillResult[]) => {
      if (results.length === 0) return;
      
      console.log('[TableOrderForm] applyVoiceAutoFill called with:', results);
      
      setOrderRows(prev => {
        let updatedRows = [...prev];
        
        for (const result of results) {
          // Find the product in our products list
          const product = products.find(p => p.id === result.productId);
          if (!product) {
            console.log(`[applyVoiceAutoFill] Product not found: ${result.productId}`);
            continue;
          }
          
          // Find variant if specified
          let variant = undefined;
          if (result.variantId && product.variants) {
            variant = product.variants.find(v => v.id === result.variantId);
          }
          
          // Determine the row key (product ID or product_variant_ID combo)
          const rowKey = variant ? `${product.id}_variant_${variant.id}` : product.id;
          
          // Check if this product/variant already exists in the order
          const existingRowIndex = updatedRows.findIndex(row => {
            if (!row.product) return false;
            const existingKey = row.variant 
              ? `${row.product.id}_variant_${row.variant.id}` 
              : row.product.id;
            return existingKey === rowKey;
          });
          
          // Resolve unit against product UOM mapping. If the spoken unit
          // doesn't exist for this product, fall back to its default sales unit.
          const cachedUnits = productUnitsMapRef.current[product.id];
          if (!cachedUnits) {
            void loadProductUnits(product.id).then((units) => {
              setProductUnitsMap((prev) => ({ ...prev, [product.id]: units }));
            });
          }
          const availableUnits = cachedUnits || [];
          const requested = (result.unit || '').toUpperCase();
          const matched = availableUnits.find((u) => u.code.toUpperCase() === requested);
          const unit =
            matched?.code ||
            availableUnits.find((u) => u.isDefaultSales)?.code ||
            availableUnits.find((u) => u.isBase)?.code ||
            availableUnits[0]?.code ||
            '';

          // Calculate total price (null when product has no UOM mapping)
          const rate = getPricePerUnit(product, variant, unit) ?? 0;
          const total = rate * result.quantity;
          
          if (existingRowIndex >= 0) {
            // Update existing row - add to quantity
            const existingRow = updatedRows[existingRowIndex];
            const newQuantity = existingRow.quantity + result.quantity;
            updatedRows[existingRowIndex] = {
              ...existingRow,
              quantity: newQuantity,
              total: rate * newQuantity
            };
            console.log(`[applyVoiceAutoFill] Updated existing row: ${product.name} → qty=${newQuantity}`);
          } else {
            // Find an empty row to fill, or add a new one
            const emptyRowIndex = updatedRows.findIndex(row => !row.product && row.quantity === 0);
            
            const newRow: OrderRow = {
              id: emptyRowIndex >= 0 ? updatedRows[emptyRowIndex].id : Date.now().toString(),
              productCode: variant?.sku || product.sku,
              product: product,
              variant: variant,
              quantity: result.quantity,
              closingStock: variant ? variant.stock_quantity : product.closing_stock,
              unit: unit,
              total: total
            };
            
            if (emptyRowIndex >= 0) {
              updatedRows[emptyRowIndex] = newRow;
            } else {
              updatedRows.push(newRow);
            }
            console.log(`[applyVoiceAutoFill] Added new row: ${variant?.variant_name || product.name} → qty=${result.quantity}`);
          }
        }
        
        // Sync to cart storage
        syncRowsToCart(updatedRows);
        
        return updatedRows;
      });
      
      // Show success toast
      const displayNames = results.map(r => r.variantName || r.productName);
      toast({
        title: `✓ Added ${results.length} item${results.length > 1 ? 's' : ''} via voice`,
        description: displayNames.join(', '),
      });
    }
  }), [products]);


  useEffect(() => {
    // Reset init so we don't immediately overwrite loaded state
    setHasInitialized(false);

    // Reset auto-apply tracking for the new context
    autoAppliedSchemesRef.current.clear();
    suppressedSchemesRef.current.clear();

    // Load rows for this retailer/visit — but only when a real cart exists.
    let rows: OrderRow[] = [{ id: "1", productCode: "", quantity: 0, closingStock: 0, unit: "", total: 0 }];
    try {
      if (!hasActiveCompanionCart(companionCartStorageKey)) {
        // No active cart for this context → start blank and clear stale form.
        localStorage.removeItem(tableFormStorageKey);
      } else {
        const savedData = localStorage.getItem(tableFormStorageKey);
        const parsedData = savedData ? JSON.parse(savedData) : null;
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          rows = parsedData;
        }
      }
    } catch (error) {
      console.error('[TableOrderForm] Error loading rows for key:', tableFormStorageKey, error);
    }

    setOrderRows(rows);
    syncRowsToCart(rows);
    DEV_LOG && console.log('[TableOrderForm] Context switched, loaded rows:', rows.length, tableFormStorageKey);
  }, [tableFormStorageKey, companionCartStorageKey]);

  // Re-link products from live products array when products load (only once after init)

  useEffect(() => {
    if (products.length === 0 || hasInitialized) return; // Wait for products to load, only run once
    
    // Skip relink when there is no live cart — initial load already wiped stale data.
    const savedData = hasActiveCompanionCart(companionCartStorageKey)
      ? localStorage.getItem(tableFormStorageKey)
      : null;
    if (savedData) {
      try {
        const parsedData: OrderRow[] = JSON.parse(savedData);
        console.log('[TableOrderForm] Re-linking products from live array:', parsedData.length, 'rows');
        
        // Re-link products from live products array to avoid stale data
        const relinkedRows = parsedData.map((row: any) => {
          const productId = row.productId || row.product?.id;
          const variantId = row.variantId || row.variant?.id;
          if (productId) {
            const liveProduct = products.find(p => p.id === productId);
            if (liveProduct) {
              const liveVariant = variantId
                ? liveProduct.variants?.find(v => v.id === variantId)
                : undefined;
              return {
                ...row,
                product: liveProduct,
                variant: liveVariant,
              };
            }
          }
          return row;
        });
        
        setOrderRows(relinkedRows);
        // Immediately sync to cart storage after loading
        syncRowsToCart(relinkedRows);
      } catch (error) {
        console.error('[TableOrderForm] Error re-linking products:', error);
      }
    }
    setHasInitialized(true);
  }, [tableFormStorageKey, products.length, hasInitialized]);

  // Save table form data whenever orderRows change (but only after initialization)
  useEffect(() => {
    if (!hasInitialized) return; // Don't save during initial load
    
    if (orderRows.length > 0) {
      // Persist a slim shape — full product/variant objects are rehydrated from
      // productsById on load. Storing them here was bloating localStorage and
      // throwing QuotaExceededError on large catalogs.
      const slim = orderRows.map(r => ({
        id: r.id,
        productCode: r.productCode,
        productId: r.product?.id,
        variantId: r.variant?.id,
        quantity: r.quantity,
        closingStock: r.closingStock,
        unit: r.unit,
        total: r.total,
      }));
      try {
        localStorage.setItem(tableFormStorageKey, JSON.stringify(slim));
      } catch (e: any) {
        if (e?.name === 'QuotaExceededError') {
          // Best-effort: clear this key and any other table_form:* leftovers, then retry once.
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (k && k.startsWith('table_form:') && k !== tableFormStorageKey) {
                localStorage.removeItem(k);
              }
            }
            localStorage.setItem(tableFormStorageKey, JSON.stringify(slim));
          } catch {
            console.warn('[TableOrderForm] localStorage quota exceeded — skipping persistence');
          }
        } else {
          console.warn('[TableOrderForm] Failed to persist rows:', e);
        }
      }
    }
  }, [orderRows, tableFormStorageKey, hasInitialized]);

  // Auto-apply schemes when conditions are met (respects policy settings)
  useEffect(() => {
    if (!hasInitialized || orderRows.length === 0 || schemes.length === 0 || policiesLoading) return;
    
    // If auto-apply is disabled, don't auto-apply anything
    if (!schemePolicies.autoApplyBestScheme) return;
    
    // Build items for scheme calculation - use variant ID if available for unique identification
    const items: SchemeItem[] = orderRows
      .filter(row => row.product && row.quantity > 0)
      .map(row => {
        const itemId = row.variant?.id || row.product!.id;
        return {
          id: itemId,
          product_id: itemId,
          variant_id: row.variant?.id,
          quantity: row.quantity,
          rate: getPricePerUnit(row.product!, row.variant, row.unit) ?? 0,
          name: row.variant?.variant_name || row.product!.name
        };
      });
    
    if (items.length === 0) return;
    
    const subtotal = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
    const activeSchemes = schemes.filter(s => isSchemeActive(s));
    
    // Get qualifying schemes (meet conditions and not suppressed)
    const qualifyingSchemes = activeSchemes
      .filter(scheme => {
        // Skip pure percentage offers with no conditions - these require manual apply
        if (scheme.scheme_type === 'percentage_discount' && !schemeHasConditions(scheme)) {
          return false;
        }
        // Skip suppressed schemes
        if (suppressedSchemesRef.current.has(scheme.id)) {
          return false;
        }
        return isSchemeConditionMet(scheme, items, subtotal);
      })
      .map(scheme => ({
        scheme,
        discount: calculateSchemeDiscountForComparison(scheme, items, subtotal)
      }))
      .filter(s => s.discount > 0);
    
    // Handle auto-removal of schemes that no longer qualify
    activeSchemes.forEach(scheme => {
      const conditionMet = isSchemeConditionMet(scheme, items, subtotal);
      const isApplied = appliedSchemeIds.includes(scheme.id);
      const wasAutoApplied = autoAppliedSchemesRef.current.has(scheme.id);
      
      // If the user no longer qualifies, clear suppression
      if (!conditionMet) {
        suppressedSchemesRef.current.delete(scheme.id);
      }
      
      // Auto-remove only if it was auto-applied and condition no longer met
      if (!conditionMet && isApplied && wasAutoApplied) {
        autoAppliedSchemesRef.current.delete(scheme.id);
        removeScheme(scheme.id);
        toast({
          title: "Offer Removed",
          description: `${scheme.name} - condition no longer met`,
          duration: 2000,
        });
      }
    });
    
    // If stacking not allowed OR max is 1, only apply the BEST scheme
    if (!schemePolicies.allowSchemeStacking || schemePolicies.maxSchemesPerOrder === 1) {
      if (qualifyingSchemes.length === 0) return;
      
      // Sort by discount and get the best one based on priority resolution
      let bestScheme;
      if (schemePolicies.priorityResolution === 'highest_discount') {
        bestScheme = qualifyingSchemes.sort((a, b) => b.discount - a.discount)[0];
      } else if (schemePolicies.priorityResolution === 'priority') {
        // Use created_at or name as fallback since priority field may not exist
        bestScheme = qualifyingSchemes.sort((a, b) => 
          ((a.scheme as any).priority || 999) - ((b.scheme as any).priority || 999)
        )[0];
      } else {
        bestScheme = qualifyingSchemes[0];
      }
      
      const bestSchemeId = bestScheme.scheme.id;
      const currentAutoApplied = Array.from(autoAppliedSchemesRef.current);
      
      // If the best scheme is already applied, we're good
      if (appliedSchemeIds.includes(bestSchemeId) && appliedSchemeIds.length === 1) {
        return;
      }
      
      // Remove any other auto-applied schemes and set only the best one
      currentAutoApplied.forEach(id => {
        if (id !== bestSchemeId) {
          autoAppliedSchemesRef.current.delete(id);
        }
      });
      
      // Set only the best scheme
      if (!appliedSchemeIds.includes(bestSchemeId) || appliedSchemeIds.length > 1) {
        autoAppliedSchemesRef.current.add(bestSchemeId);
        setOnlyScheme(bestSchemeId);
        console.log('[TableOrderForm] Policy: Applied best scheme only:', bestScheme.scheme.name, 'Discount:', bestScheme.discount);
      }
      
      return;
    }
    
    // Normal multi-scheme behavior with maxSchemesPerOrder limit
    qualifyingSchemes.forEach(({ scheme }) => {
      const isApplied = appliedSchemeIds.includes(scheme.id);
      
      if (!isApplied && appliedSchemeIds.length < schemePolicies.maxSchemesPerOrder) {
        // Check same-type stacking rule
        if (!schemePolicies.sameTypeStacking) {
          const appliedTypes = appliedSchemeIds.map(id => 
            schemes.find(s => s.id === id)?.scheme_type
          ).filter(Boolean);
          
          if (appliedTypes.includes(scheme.scheme_type)) {
            return; // Skip - same type already applied
          }
        }
        
        autoAppliedSchemesRef.current.add(scheme.id);
        applyScheme(scheme.id, scheme, schemePolicies, schemes);
      }
    });
  }, [orderRows, schemes, hasInitialized, appliedSchemeIds, schemePolicies, policiesLoading, applyScheme, removeScheme, setOnlyScheme]);

  const findProductByCode = (code: string): { product: Product; variant?: any } | undefined => {
    // First check base products
    const baseProduct = products.find(p => p.sku.toLowerCase() === code.toLowerCase());
    if (baseProduct) {
      return { product: baseProduct };
    }
    
    // Then check variants
    for (const product of products) {
      if (product.variants) {
        const variant = product.variants.find(v => v.sku.toLowerCase() === code.toLowerCase() && v.is_active);
        if (variant) {
          return { product, variant };
        }
      }
    }
    
    return undefined;
  };

  // Flattened picker options derived from server-side search results.
  // For each matched product we emit the base product + its active variants.
  // The picker no longer iterates the full ~8.4k product list — only ~30 matches.
  // O(1) lookup map for product hydration — avoids products.find() per result on every keystroke.
  const productsById = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  // productOptions removed — now built inside <ProductPickerPopover> so
  // typing/filtering does not re-render this parent.

  // Unit conversion helpers - unified across UI and totals
  const normalizeUnit = (u?: string) => (u || "").toLowerCase().replace(/\./g, "").trim();

  const formatQtyUnit = (u?: string) => {
    const unit = normalizeUnit(u);
    if (!unit) return "";
    if (["g", "gm", "gram", "grams"].includes(unit)) return "grams";
    if (["kg", "kilogram", "kilograms"].includes(unit)) return "kg";
    if (["ml", "milliliter", "milliliters"].includes(unit)) return "ml";
    if (["l", "ltr", "liter", "liters", "litre", "litres"].includes(unit)) return "liters";
    if (["pc", "pcs", "piece", "pieces"].includes(unit)) return "pcs";
    if (["unit", "units"].includes(unit)) return "units";
    return u || "";
  };

  // NOTE: getPricePerUnit and getUnitEquivalent are now mapping-driven and
  // declared above. The legacy KG/grams hardcoded variants were removed.

  const handleProductSelect = useCallback((rowId: string, option: PickerOption) => {
    if (!option) return;
    // Trigger UOM mapping fetch; auto-fill default unit once loaded.
    void loadProductUnits(option.product.id).then((units) => {
      setProductUnitsMap((prev) => ({ ...prev, [option.product.id]: units }));
      setOrderRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId || r.unit) return r;
          const def =
            units.find((u) => u.isDefaultSales)?.code ||
            units.find((u) => u.isBase)?.code ||
            units[0]?.code ||
            '';
          return { ...r, unit: def };
        }),
      );
    });
    setOrderRows(prev =>
      prev.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            productCode: option.sku,
            product: option.product,
            variant: option.variant,
            unit: '',
            total: 0,
          };
        }
        return row;
      })
    );
    setOpenComboboxes(prev => ({ ...prev, [rowId]: false }));
  }, []);

  const addNewRow = () => {
    const newRow: OrderRow = {
      id: Date.now().toString(),
      productCode: "",
      quantity: 0,
      closingStock: 0,
      unit: "",
      total: 0,
    };
    setOrderRows([...orderRows, newRow]);
  };

  // Handle applying a scheme - add product with minimum qualifying quantity and persist scheme
  const handleApplyScheme = (scheme: ProductScheme, product?: Product, quantity?: number) => {
    // User explicitly applied -> allow (unsuppress if previously removed)
    suppressedSchemesRef.current.delete(scheme.id);
    autoAppliedSchemesRef.current.delete(scheme.id);
    applyScheme(scheme.id);

    if (!product) {
      // Order-wide scheme - just persist
      return;
    }
    
    // Check if product already exists in order
    const existingRowIndex = orderRows.findIndex(row => row.product?.id === product.id);
    
    if (existingRowIndex >= 0) {
      // Update existing row quantity if needed
      const existingRow = orderRows[existingRowIndex];
      const newQuantity = Math.max(existingRow.quantity, quantity || 1);
      updateRow(existingRow.id, 'quantity', newQuantity);
    } else {
      // Add new row with the product (UOM will be filled by handleProductSelect-style flow)
      const defUnit = getDefaultUnitCode(product.id);
      // kick off load if not cached
      void loadProductUnits(product.id).then((units) => {
        setProductUnitsMap((prev) => ({ ...prev, [product.id]: units }));
      });
      const newRow: OrderRow = {
        id: Date.now().toString(),
        productCode: product.sku,
        product: product,
        quantity: quantity || 1,
        closingStock: product.closing_stock,
        unit: defUnit,
        total: (getPricePerUnit(product, undefined, defUnit) ?? 0) * (quantity || 1),
      };
      setOrderRows(prev => [...prev, newRow]);
    }
    
  };

  const removeRow = useCallback((id: string) => {
    setOrderRows(prev => {
      const updatedRows = prev.filter(row => row.id !== id);
      // Use helper to sync cart immediately
      syncRowsToCartRef.current(updatedRows);
      return updatedRows;
    });
  }, []);

  const updateRow = useCallback((id: string, field: keyof OrderRow, value: any) => {
    const computeTotal = (prod?: Product, variant?: any, qty?: number, selectedUnit?: string) => {
      if (!prod || !qty) return 0;

      // Price per selected unit using shared helper
      let price = getPricePerUnit(prod, variant, selectedUnit) ?? 0;

      // Apply variant discount if applicable
      if (variant) {
        if (Number(variant.discount_percentage) > 0) {
          price = price - (price * Number(variant.discount_percentage) / 100);
        } else if (Number(variant.discount_amount) > 0) {
          price = price - Number(variant.discount_amount);
        }
      }

      const base = Number(price) * Number(qty);
      const active = prod.schemes?.find(s => s.is_active);
      if (active && active.condition_quantity && active.discount_percentage && qty >= active.condition_quantity) {
        const discountedTotal = base - (base * (Number(active.discount_percentage) / 100));
        return parseFloat(discountedTotal.toFixed(2));
      }
      return parseFloat(base.toFixed(2));
    };

    setOrderRows(prev => {
      const updatedRows = prev.map(row => {
        if (row.id === id) {
          const updatedRow: OrderRow = { ...row, [field]: value } as OrderRow;
          if (field === "productCode") {
            const result = findProductByCode(value);
            if (result) {
              updatedRow.product = result.product;
              updatedRow.variant = result.variant;
              // Trigger UOM mapping fetch; default unit will be applied async.
              void loadProductUnits(result.product.id).then((units) => {
                setProductUnitsMap((prev) => ({ ...prev, [result.product.id]: units }));
                setOrderRows((prev) =>
                  prev.map((r) => {
                    if (r.id !== id || r.unit) return r;
                    const def =
                      units.find((u) => u.isDefaultSales)?.code ||
                      units.find((u) => u.isBase)?.code ||
                      units[0]?.code ||
                      '';
                    return { ...r, unit: def };
                  }),
                );
              });
              updatedRow.unit = '';
              updatedRow.closingStock = result.variant ? result.variant.stock_quantity : result.product.closing_stock;
              updatedRow.total = computeTotal(result.product, result.variant, updatedRow.quantity, updatedRow.unit);
            } else {
              updatedRow.product = undefined;
              updatedRow.variant = undefined;
              updatedRow.closingStock = 0;
              updatedRow.total = 0;
            }
          } else if (field === "quantity") {
            // Use row.unit (current unit) since quantity is being updated
            updatedRow.total = computeTotal(row.product, row.variant, value, row.unit);
          } else if (field === "unit") {
            // Mapping-driven UOM: switching unit does NOT auto-convert the
            // quantity (the value the user typed reflects the new unit).
            updatedRow.total = computeTotal(row.product, row.variant, updatedRow.quantity, value);
          }
          return updatedRow;
        }
        return row;
      });
      
      // Use helper to sync cart immediately
      syncRowsToCartRef.current(updatedRows);
      return updatedRows;
    });
  }, []);

  const addToCart = () => {
    if (isAddingToCart) return;
    
    // ALWAYS use the React state directly (orderRowsRef) as single source of truth
    const currentRows = orderRowsRef.current;
    
    console.log('[addToCart] Using state rows:', currentRows.map(r => ({ 
      unit: r.unit, 
      qty: r.quantity, 
      product: r.product?.name,
      rate: r.product?.rate,
      variantPrice: r.variant?.price
    })));
    
    const validRows = currentRows.filter(row => row.product && row.quantity > 0);
    
    if (validRows.length === 0) {
      toast({
        title: "No Valid Items",
        description: "Please add valid products with quantities",
        variant: "destructive"
      });
      return;
    }

    setIsAddingToCart(true);

    try {
      // Use syncRowsToCart to ensure consistency
      syncRowsToCart(currentRows);
      
      console.log('[addToCart] Cart synced, navigating to cart page');
      
      // Navigate to cart with current parameters
      const params = new URLSearchParams(searchParams);
      navigate(`/cart?${params.toString()}`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add items to cart. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Calculate totals using scheme engine
  const orderCalculation = useMemo(() => {
    const schemeItems: SchemeItem[] = orderRows
      .filter(row => row.product && row.quantity > 0)
      .map(row => {
        // Use variant ID if available for unique identification - each variant is a separate product
        const itemId = row.variant?.id || row.product!.id;
        return {
          id: itemId,
          product_id: itemId,
          variant_id: row.variant?.id,
          quantity: row.quantity,
          rate: getPricePerUnit(row.product!, row.variant, row.unit) ?? 0,
          name: row.variant?.variant_name || row.product!.name
        };
      });
    
    return calculateOrderWithSchemes(schemeItems, schemes, appliedSchemeIds);
  }, [orderRows, schemes, appliedSchemeIds]);

  const getTotalValue = () => {
    return parseFloat(orderCalculation.subtotal.toFixed(2));
  };
  
  const getDiscountValue = () => {
    return parseFloat(orderCalculation.totalDiscount.toFixed(2));
  };
  
  const getFinalTotal = () => {
    return parseFloat(orderCalculation.finalTotal.toFixed(2));
  };

  const hasActiveSchemes = useCallback((product: Product) => {
    return !!(product.schemes && product.schemes.some(scheme => scheme.is_active));
  }, []);

  const getActiveSchemeDetails = (product: Product) => {
    const activeSchemes = product.schemes?.filter(scheme => scheme.is_active);
    if (!activeSchemes || activeSchemes.length === 0) return null;
    
    const scheme = activeSchemes[0];
    return `Buy ${scheme.condition_quantity}+ ${product.unit}s, get ${scheme.discount_percentage}% off`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2">Loading products...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-muted-foreground mb-4">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No products available</p>
          <p className="text-sm">Please contact admin to add products to the system</p>
        </div>
        <Button onClick={() => onReloadProducts?.()} variant="outline">
          Retry Loading Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {/* Category Filter */}
          <div className="px-2 md:px-4 py-2 md:py-3 border-b border-border bg-background">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm w-full md:w-64 bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[300px]">
                <SelectItem value="all" className="text-xs md:text-sm">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category} className="text-xs md:text-sm">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full">
            {/* Table Header - Responsive */}
            <div className="grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 bg-muted/50 border-b border-border">
              <div className="font-semibold text-xs md:text-sm">Product</div>
              <div className="font-semibold text-xs md:text-sm">Unit</div>
              <div className="font-semibold text-xs md:text-sm text-center">Qty</div>
              <div className="font-semibold text-xs md:text-sm text-center">Stock</div>
              <div className="w-8"></div>
            </div>
              
              {/* Table Rows - Responsive */}
              <div className="divide-y divide-border">
                {orderRows.map((row, index) => {
                  // Get the item ID for matching free items (variant ID or product ID)
                  const rowItemId = row.variant?.id || row.product?.id;
                  
                  // Get free items that belong to this product row
                  const freeItemsForRow = rowItemId ? orderCalculation.appliedSchemes
                    .filter(s => s.free_items && s.free_items.length > 0)
                    .flatMap(s => s.free_items!)
                    .filter(freeItem => (freeItem as any).triggering_item_id === rowItemId) : [];
                  
                  return (
                  <React.Fragment key={row.id}>
                  <div 
                  className={cn(
                    "grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 items-start",
                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                >
                    {/* Product Column */}
                    <div className="flex flex-col min-w-0">
                      <ProductPickerPopover
                        rowId={row.id}
                        selectedProduct={row.product}
                        selectedVariant={row.variant}
                        selectedCategory={selectedCategory}
                        products={products}
                        productsById={productsById}
                        hasActiveSchemes={hasActiveSchemes}
                        onSelect={handleProductSelect}
                      />
                      {row.product && (() => {
                        const unconfigured = isProductUnconfigured(row.product.id);
                        const mappingPrice = unconfigured
                          ? null
                          : getPricePerUnit(row.product, row.variant, row.unit);
                        const hintDefault = (row.product as any)?._default_uom_code as string | undefined;
                        const hintAllowed = (row.product as any)?._allowed_uom_codes as string[] | undefined;
                        const baseRate = Number(row.variant ? row.variant.price : row.product.rate) || 0;
                        const effectiveUnit = row.unit || hintDefault || '';
                        // Hint-driven instant render: if mapping isn't loaded yet,
                        // show baseRate at the effective unit so the user sees a
                        // price in the same render frame as product selection.
                        const hintPrice =
                          !unconfigured &&
                          effectiveUnit &&
                          (effectiveUnit === hintDefault || hintAllowed?.includes(effectiveUnit))
                            ? baseRate
                            : null;
                        const displayPrice = mappingPrice ?? hintPrice;
                        return (
                          <>
                            {unconfigured ? (
                              <span className="text-[10px] text-destructive font-medium mt-0.5">
                                No unit set for this product. Configure units in Product Master before ordering.
                              </span>
                            ) : displayPrice == null || !effectiveUnit ? (
                              <span className="text-[9px] text-muted-foreground mt-0.5">
                                Select a unit to see price
                              </span>
                            ) : (
                              <span className="text-[9px] text-muted-foreground mt-0.5">
                                ₹{displayPrice.toFixed(2)} per {effectiveUnit}
                              </span>
                            )}
                            {/* Show applied scheme details */}
                            {(() => {
                              // Use variant ID if available for correct lookup
                              const itemId = row.variant?.id || row.product.id;
                              const itemSchemes = orderCalculation.itemSchemeDetails?.[itemId] || [];

                              if (itemSchemes.length === 0 || row.quantity === 0) return null;

                              return (
                                <div className="mt-0.5 space-y-0.5">
                                  {itemSchemes.map((scheme, idx) => (
                                    <div key={idx} className="flex items-center gap-1 text-[9px] md:text-[10px] text-green-600">
                                      <Gift size={10} className="flex-shrink-0" />
                                      <span className="truncate">
                                        {scheme.schemeType === 'buy_x_get_y_free' || scheme.schemeType === 'buy_get_free' ? (() => {
                                          const freeUnit = schemes.find(s => s.id === scheme.schemeId)?.free_quantity_unit;
                                          const unitLabel = formatQtyUnit(freeUnit);
                                          const unitPart = unitLabel ? `${unitLabel} ` : '';
                                          return <>🎁 {scheme.schemeName}: Get {scheme.freeItemQty} {unitPart}{scheme.freeItemName} FREE</>;
                                        })() : (
                                          <>
                                            {scheme.schemeName}
                                            {scheme.discountPercentage && ` (${scheme.discountPercentage}% off)`}
                                            {scheme.discountAmount > 0 && ` - ₹${scheme.discountAmount.toFixed(2)} saved`}
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* Unit Column — strictly mapping-driven via UnitSelect */}
                    <div>
                      {row.product ? (
                        <UnitSelect
                          productId={row.product.id}
                          baseRate={Number(row.variant ? row.variant.price : row.product.rate) || 0}
                          value={row.unit || undefined}
                          onChange={(value) => updateRow(row.id, "unit", value)}
                          className="h-9 md:h-11 text-xs md:text-sm w-full bg-background px-2"
                          hintAllowedCodes={(row.product as any)?._allowed_uom_codes ?? undefined}
                          hintDefaultCode={(row.product as any)?._default_uom_code ?? undefined}
                        />
                      ) : (
                        <Select disabled value="">
                          <SelectTrigger className="h-9 md:h-11 text-xs md:text-sm w-full bg-background px-2">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                        </Select>
                      )}
                    </div>
                    
                    {/* Qty Column */}
                    <div className="flex flex-col">
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.quantity || ""}
                        onChange={(e) => updateRow(row.id, "quantity", parseFloat(e.target.value) || 0)}
                        step="any"
                        className="h-9 md:h-11 text-xs md:text-sm text-center bg-background px-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        disabled={!row.product || (!!row.product && isProductUnconfigured(row.product.id))}
                      />
                      {row.quantity > 0 && row.product && (
                        <span className="text-[9px] text-muted-foreground text-center mt-0.5">
                          {getUnitEquivalent(row.quantity, row.product.id, row.unit)}
                        </span>
                      )}
                    </div>
                    
                    {/* Stock Column */}
                    <div>
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.closingStock === 0 ? "" : row.closingStock}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateRow(row.id, "closingStock", value === "" ? 0 : parseInt(value) || 0);
                        }}
                        className={cn(
                          "h-9 md:h-11 text-xs md:text-sm text-center bg-background px-1",
                          row.closingStock === 0 && "text-muted-foreground"
                        )}
                        disabled={!row.product}
                      />
                    </div>
                    
                    {/* Delete Button */}
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={orderRows.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Free Items for this product - render directly under the product row */}
                  {freeItemsForRow.map((freeItem, freeIdx) => (
                    <div 
                      key={`free-${row.id}-${freeIdx}`} 
                      className="grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-2 md:px-4 py-1.5 md:py-2 items-center bg-green-50 border-l-4 border-l-green-500"
                    >
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        <Gift size={14} className="text-green-600 shrink-0" />
                        <span className="text-xs font-medium text-green-700 truncate">{freeItem.product_name}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] px-1 py-0 shrink-0">FREE</Badge>
                      </div>
                      <div className="text-xs text-green-600">{formatQtyUnit(freeItem.unit) || 'pcs'}</div>
                      <div className="text-center text-xs font-medium text-green-700">{freeItem.quantity}</div>
                      <div className="text-center text-xs text-muted-foreground">-</div>
                      <div className="text-right text-xs font-bold text-green-600 pr-2">₹0.00</div>
                    </div>
                  ))}
                  </React.Fragment>
                );
                })}
              </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={addNewRow}
          className="flex items-center gap-2"
        >
          <Plus size={14} />
          Add Row
        </Button>
        
        <div className="text-right space-y-1">
          <div className="flex justify-end items-center gap-2">
            <p className="text-sm text-muted-foreground">Subtotal:</p>
            <p className="text-sm font-medium">₹{getTotalValue().toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
          
          {getDiscountValue() > 0 && (
            <div className="flex justify-end items-center gap-2">
              <div className="flex items-center gap-1 text-green-600">
                <Tag size={12} />
                <p className="text-sm">Discount:</p>
              </div>
              <p className="text-sm font-medium text-green-600">-₹{getDiscountValue().toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              <button
                className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => {
                  appliedSchemeIds.forEach(id => removeAppliedSchemeById(id));
                  toast({
                    title: "Offers Removed",
                    description: "All applied offers have been removed",
                  });
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
          
          <div className="flex justify-end items-center gap-2 pt-1 border-t border-border">
            <p className="text-sm font-semibold">Total:</p>
            <p className="text-lg font-bold">₹{getFinalTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            (incl. GST: ₹{(getFinalTotal() * 1.05).toLocaleString('en-IN', { maximumFractionDigits: 2 })})
          </p>
        </div>
      </div>

      {/* Apply Offers Section - Flipkart style */}
      <ApplyOfferSection
        schemes={schemes}
        orderRows={orderRows}
        onClick={() => setShowSchemesModal(true)}
        loading={schemesLoading}
      />

      {/* Save Stock button - visible when there are stock-only rows */}
      {onStockUpdate && orderRows.some(row => row.product && row.closingStock > 0) && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const stockRows = orderRows.filter(row => row.product && row.closingStock > 0);
            stockRows.forEach(row => {
              const productName = row.variant ? row.variant.variant_name : row.product!.name;
              const productId = row.variant ? `${row.product!.id}_variant_${row.variant.id}` : row.product!.id;
              onStockUpdate(productId, row.closingStock, productName);
            });
            toast({
              title: "Stock Updated",
              description: `Stock quantities saved for ${stockRows.length} item(s).`,
            });
          }}
        >
          <Package className="h-4 w-4 mr-2" />
          Save Stock ({orderRows.filter(row => row.product && row.closingStock > 0).length})
        </Button>
      )}

      <Button
        onClick={addToCart}
        className="w-full"
        disabled={getTotalValue() === 0 || isAddingToCart}
      >
        {isAddingToCart ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </>
        ) : (
          "Preview Order"
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border">
        <strong>Note:</strong> Available units come from the Product Master (UOM mapping). Prices auto-convert using the per-product conversion factors defined in the UOM Master.
      </p>

      {/* Schemes Modal */}
      <OrderEntrySchemesModal
        isOpen={showSchemesModal}
        onClose={() => setShowSchemesModal(false)}
        schemes={schemes}
        loading={schemesLoading}
        isOnline={isOnline}
        orderRows={orderRows}
        products={products}
        appliedSchemeIds={appliedSchemeIds}
        schemePolicies={schemePolicies}
        onApplyScheme={handleApplyScheme}
        onRemoveScheme={(schemeId) => {
          removeScheme(schemeId);
        }}
      />
    </div>
  );
});

TableOrderForm.displayName = 'TableOrderForm';
