import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { moveToRecycleBin } from '@/utils/recycleBinUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, Tag, Search, Grid3X3, Camera, Loader2, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductFormFields } from './ProductFormFields';
import { VariantFocusedFields } from './VariantFocusedFields';
import { ProductDataImportButton } from './ProductDataImportButton';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { migrateProducts } from '@/utils/productMigration';
import {
  ProductUnitsEditor,
  emptyProductUnitsEditorValue,
  type ProductUnitsEditorValue,
} from '@/components/admin/uom/ProductUnitsEditor';
import { useNavigate } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { clearUomCache, deriveProductMappings, loadPriceList, clearPriceListCache } from '@/lib/uomEngine';
import { useQueryClient } from '@tanstack/react-query';
import { loadEnabledUnits } from '@/lib/uomEngine';

interface ProductCategory {
  id: string;
  name: string;
  description: string;
}

interface Product {
  id: string;
  sku: string;
  product_number?: string;
  name: string;
  description: string;
  category_id: string;
  category?: ProductCategory;
  rate: number;
  unit: string;
  base_unit: string;
  conversion_factor: number;
  closing_stock: number;
  is_active: boolean;
  is_focused_product?: boolean;
  focused_due_date?: string;
  focused_target_quantity?: number;
  focused_territories?: string[];
  barcode?: string;
  qr_code?: string;
}


interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  discount_percentage: number;
  discount_amount: number;
  is_active: boolean;
  is_focused_product?: boolean;
  focused_due_date?: string;
  focused_target_quantity?: number;
  focused_territories?: string[];
  barcode?: string;
  qr_code?: string;
}

interface Territory {
  id: string;
  name: string;
  region: string;
}

const PRODUCT_FETCH_BATCH_SIZE = 1000;

const ProductManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uomEditorValue, setUomEditorValue] = useState<ProductUnitsEditorValue>(
    emptyProductUnitsEditorValue(),
  );
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<string>('');
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [isVariantsViewOpen, setIsVariantsViewOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: 'product' | 'category' | 'variant' | 'all-products' | null;
    id: string;
    name: string;
  }>({ open: false, type: null, id: '', name: '' });

  // Form states
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', description: '' });
const [productForm, setProductForm] = useState({
  id: '',
  sku: '',
  product_number: '',
  name: '',
  description: '',
  category_id: '',
  is_focused_product: false,
  focused_type: undefined as 'fixed_date' | 'recurring' | 'keep_open' | undefined,
  focused_due_date: '',
  focused_target_quantity: 0,
  focused_territories: [] as string[],
  focused_recurring_config: undefined as {
    days_of_week?: string[];
    weeks_of_month?: string[];
    months_of_year?: string[];
  } | undefined,
  rate: 0,
  unit: 'piece',
  base_unit: 'kg',
  conversion_factor: 1,
  closing_stock: 0,
  is_active: true,
  sku_image_url: '',
  barcode: '',
  barcode_image_url: '',
  qr_code: '',
  hsn_code: '',
  gst_percentage: null as number | null
});
  
  const [variantForm, setVariantForm] = useState({
    id: '',
    product_id: '',
    variant_name: '',
    sku: '',
    product_number: '',
    description: '',
    base_unit: 'kg',
    unit: 'piece',
    conversion_factor: 1,
    price: 0,
    stock_quantity: 0,
    hsn_code: '90230',
    discount_percentage: 0,
    discount_amount: 0,
    is_active: true,
    is_focused_product: false,
    focused_type: undefined,
    focused_due_date: '',
    focused_target_quantity: 0,
    focused_territories: [] as string[],
    focused_recurring_config: undefined,
    barcode: '',
    qr_code: ''
  } as any);

  const executeDeleteAllProducts = async () => {
    try {
      toast.loading('Deleting all products and related data...');
      
      // Delete in order: child tables first, then parent
      await supabase.from('van_live_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('van_inward_grn_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('van_closing_stock_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('van_return_grn_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('van_order_fulfillment').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_schemes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      const { error } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      
      toast.dismiss();
      toast.success('All products and related data deleted successfully');
      fetchData();
      setDeleteConfirm({ open: false, type: null, id: '', name: '' });
    } catch (error) {
      toast.dismiss();
      console.error('Error deleting products:', error);
      toast.error('Failed to delete products. Check console for details.');
    }
  };


  const handleConfirmAction = () => {
    if (deleteConfirm.type === 'product') {
      executeDeleteProduct(deleteConfirm.id);
    } else if (deleteConfirm.type === 'category') {
      executeDeleteCategory(deleteConfirm.id);
    } else if (deleteConfirm.type === 'variant') {
      executeDeleteVariant(deleteConfirm.id);
    } else if (deleteConfirm.type === 'all-products') {
      executeDeleteAllProducts();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync UOM editor value with the dialog: load on edit, reset on add, clear on close.
  useEffect(() => {
    if (!isProductDialogOpen) {
      setUomEditorValue(emptyProductUnitsEditorValue());
      return;
    }
    if (!productForm.id) {
      setUomEditorValue(emptyProductUnitsEditorValue()); // editor auto-seeds PIECE
      return;
    }
    let cancelled = false;
    (async () => {
      // Each fetch is independent — wrap individually so a single failure
      // doesn't blank the whole form. (Phase 0: edit-load hardening.)
      let units: any[] = [];
      let prod: any = null;
      let priceList: Awaited<ReturnType<typeof loadPriceList>> = [];

      try {
        const unitsRes = await supabase.rpc('get_product_units', { p_product_id: productForm.id });
        if (unitsRes.error) throw unitsRes.error;
        units = (unitsRes.data as any[]) || [];
      } catch (e) {
        console.warn('[ProductMaster] get_product_units failed', e);
      }

      try {
        const productRes = await supabase
          .from('products')
          .select(
            'net_weight_g, net_volume_ml, base_unit_category, price_basis_uom_id, default_sales_uom_id, default_purchase_uom_id',
          )
          .eq('id', productForm.id)
          .maybeSingle();
        if (productRes.error) throw productRes.error;
        prod = productRes.data;
      } catch (e) {
        console.warn('[ProductMaster] product row load failed', e);
      }

      try {
        priceList = await loadPriceList(productForm.id);
      } catch (e) {
        console.warn('[ProductMaster] price list load failed', e);
      }

      if (cancelled) return;

      // Resolve category: prefer the explicit column; else derive from the base mapping.
      const baseRow = units.find((r) => r.is_base);
      const baseCategory: 'Weight' | 'Volume' | 'Quantity' =
        prod?.base_unit_category ||
        baseRow?.category ||
        'Weight';

      const physical =
        baseCategory === 'Weight'
          ? Number(prod?.net_weight_g ?? baseRow?.conversion_to_base ?? 0)
          : baseCategory === 'Volume'
            ? Number(prod?.net_volume_ml ?? baseRow?.conversion_to_base ?? 0)
            : 1;

      // Re-create packaging rows from the saved mapping. Only "Quantity"-category
      // entries become packaging rows in the new editor; sibling base-category
      // siblings (KG, LITRE) are auto-injected at save time and don't appear here.
      const packagingRows = units
        .filter((r) => r.category === 'Quantity')
        .map((r) => {
          const conv = Number(r.conversion_to_base) || 0;
          const qty =
            baseCategory === 'Quantity'
              ? Math.max(1, Math.round(conv))
              : physical > 0
                ? Math.max(1, Math.round(conv / physical))
                : 1;
          return {
            uomId: r.uom_id,
            code: r.code,
            name: r.name,
            category: 'Quantity' as const,
            qtyPerPiece: qty,
            conversionToBase: conv,
            isBase: !!r.is_base,
            isDefaultSales: !!r.is_default_sales,
            isPriceBasis: !!r.is_price_basis || !!r.is_default_sales,
            isDefaultPurchase: !!r.is_default_purchase,
          };
        });

      const priceOverrides = priceList.map((p) => {
        const match = units.find((u) => u.uom_id === p.uomId);
        return {
          uomId: p.uomId,
          code: match?.code ?? '',
          name: match?.name ?? match?.code ?? 'Unit',
          rate: p.rate,
          isDefaultPrice: p.isDefaultPrice,
          notes: p.notes ?? null,
        };
      });

      const priceBasisRow =
        units.find((r) => r.is_price_basis) ||
        units.find((r) => r.is_default_sales) ||
        (prod?.price_basis_uom_id
          ? units.find((r) => r.uom_id === prod.price_basis_uom_id)
          : null) ||
        baseRow;
      const defaultSalesRow =
        units.find((r) => r.is_default_sales) ||
        (prod?.default_sales_uom_id
          ? units.find((r) => r.uom_id === prod.default_sales_uom_id)
          : null) ||
        priceBasisRow ||
        baseRow;
      // Default Purchase fallback chain (per approved Q3): explicit flag →
      // saved column → default sales → base.
      const defaultPurchaseRow =
        units.find((r) => r.is_default_purchase) ||
        (prod?.default_purchase_uom_id
          ? units.find((r) => r.uom_id === prod.default_purchase_uom_id)
          : null) ||
        defaultSalesRow ||
        baseRow;

      setUomEditorValue({
        baseCategory,
        netWeightG: baseCategory === 'Weight' ? (physical > 0 ? physical : null) : null,
        netVolumeMl: baseCategory === 'Volume' ? (physical > 0 ? physical : null) : null,
        rows: packagingRows,
        priceOverrides,
        priceBasisCode: priceBasisRow?.code ?? null,
        defaultSalesCode: defaultSalesRow?.code ?? null,
        defaultPurchaseCode: defaultPurchaseRow?.code ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isProductDialogOpen, productForm.id]);


  // Auto-uncheck focused products when due date passes or target is met
  useEffect(() => {
    const checkFocusedProducts = async () => {
      const now = new Date();
      
      try {
        // Check products
        const productsToUpdate = products.filter(p => 
          p.is_focused_product && p.focused_due_date && new Date(p.focused_due_date) < now
        );
        
        for (const product of productsToUpdate) {
          await supabase
            .from('products')
            .update({ is_focused_product: false })
            .eq('id', product.id);
        }
        
        // Check variants
        const variantsToUpdate = variants.filter(v => 
          v.is_focused_product && v.focused_due_date && new Date(v.focused_due_date) < now
        );
        
        for (const variant of variantsToUpdate) {
          await supabase
            .from('product_variants')
            .update({ is_focused_product: false })
            .eq('id', variant.id);
        }
        
        if (productsToUpdate.length > 0 || variantsToUpdate.length > 0) {
          fetchData(); // Refresh data if any updates were made
        }
      } catch (error) {
        console.error('Error checking focused products:', error);
      }
    };
    
    checkFocusedProducts();
    const interval = setInterval(checkFocusedProducts, 3600000); // Check hourly
    return () => clearInterval(interval);
  }, [products, variants]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchProducts(), fetchVariants(), fetchTerritories()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTerritories = async () => {
    const { data, error } = await supabase
      .from('territories')
      .select('id, name, region')
      .order('name');
    
    if (error) throw error;
    setTerritories(data || []);
  };

  // Generate QR code content
  const generateQRCode = (type: 'product' | 'variant', sku: string, name: string) => {
    return `${type}:${sku}:${name}`;
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setCategories(data || []);
  };

  const fetchProducts = async () => {
    const allProducts: Product[] = [];
    let from = 0;

    while (true) {
      const to = from + PRODUCT_FETCH_BATCH_SIZE - 1;
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(*)
        `)
        .order('name', { ascending: true })
        .range(from, to);
      
      if (error) {
        console.error('Error fetching products in ProductManagement:', error);
        throw error;
      }

      const batch = (data || []) as Product[];
      allProducts.push(...batch);

      if (batch.length < PRODUCT_FETCH_BATCH_SIZE) break;
      from += PRODUCT_FETCH_BATCH_SIZE;
    }

    console.log('Fetched products in ProductManagement:', allProducts.length);
    setProducts(allProducts);
  };


  const fetchVariants = async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .order('variant_name');
    
    if (error) throw error;
    setVariants(data || []);
  };

  const handleVariantSubmit = async () => {
    try {
      // Auto-generate SKU if empty
      let variantSku = variantForm.sku.trim();
      if (!variantSku) {
        // Generate unique SKU based on product and variant name
        const baseProduct = products.find(p => p.id === variantForm.product_id);
        const productSku = baseProduct?.sku || 'PROD';
        const variantNameClean = variantForm.variant_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        variantSku = `${productSku}_${variantNameClean}_${Date.now().toString().slice(-6)}`;
      }

      // Generate QR code if not exists
      const qrCode = variantForm.qr_code || generateQRCode('variant', variantSku, variantForm.variant_name);

      if (variantForm.id) {
        const { error } = await supabase
          .from('product_variants')
          .update({
            product_id: variantForm.product_id,
            variant_name: variantForm.variant_name,
            sku: variantSku,
            price: variantForm.price,
            stock_quantity: variantForm.stock_quantity,
            discount_percentage: variantForm.discount_percentage,
            discount_amount: variantForm.discount_amount,
            is_active: variantForm.is_active,
            is_focused_product: variantForm.is_focused_product,
            focused_type: (variantForm as any).focused_type || null,
            focused_due_date: variantForm.focused_due_date || null,
            focused_target_quantity: variantForm.focused_target_quantity || 0,
            focused_territories: variantForm.focused_territories || [],
            focused_recurring_config: (variantForm as any).focused_recurring_config || null,
            barcode: variantForm.barcode || null,
            qr_code: qrCode
          })
          .eq('id', variantForm.id);
        
        if (error) throw error;
        toast.success('Variant updated successfully');
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert({
            product_id: variantForm.product_id,
            variant_name: variantForm.variant_name,
            sku: variantSku,
            price: variantForm.price,
            stock_quantity: variantForm.stock_quantity,
            discount_percentage: variantForm.discount_percentage,
            discount_amount: variantForm.discount_amount,
            is_active: variantForm.is_active,
            is_focused_product: variantForm.is_focused_product,
            focused_type: (variantForm as any).focused_type || null,
            focused_due_date: variantForm.focused_due_date || null,
            focused_target_quantity: variantForm.focused_target_quantity || 0,
            focused_territories: variantForm.focused_territories || [],
            focused_recurring_config: (variantForm as any).focused_recurring_config || null,
            barcode: variantForm.barcode || null,
            qr_code: qrCode
          });
        
        if (error) throw error;
        toast.success('Variant created successfully');
      }
      
      setIsVariantDialogOpen(false);
      setVariantForm({
        id: '',
        product_id: '',
        variant_name: '',
        sku: '',
        product_number: '',
        description: '',
        base_unit: 'kg',
        unit: 'piece',
        conversion_factor: 1,
        price: 0,
        stock_quantity: 0,
        hsn_code: '90230',
        discount_percentage: 0,
        discount_amount: 0,
        is_active: true,
        is_focused_product: false,
        focused_type: undefined,
        focused_due_date: '',
        focused_target_quantity: 0,
        focused_territories: [],
        focused_recurring_config: undefined,
        barcode: '',
        qr_code: ''
      } as any);
      fetchVariants();
    } catch (error) {
      console.error('Error saving variant:', error);
      toast.error('Failed to save variant');
    }
  };

  const handleDeleteVariant = async (id: string) => {
    setDeleteConfirm({ open: true, type: 'variant', id, name: 'this variant' });
  };

  const executeDeleteVariant = async (id: string) => {
    try {
      const variantData = variants.find(v => v.id === id);
      if (variantData) {
        await moveToRecycleBin({
          tableName: 'product_variants',
          recordId: id,
          recordData: variantData,
          moduleName: 'Product Variants',
          recordName: variantData.variant_name || 'Variant'
        });
      }
      
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Variant moved to recycle bin');
      fetchVariants();
      setDeleteConfirm({ open: false, type: null, id: '', name: '' });
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast.error('Failed to delete variant');
    }
  };

  const handleCategorySubmit = async () => {
    try {
      if (categoryForm.id) {
        const { error } = await supabase
          .from('product_categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description
          })
          .eq('id', categoryForm.id);
        
        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description
          });
        
        if (error) throw error;
        toast.success('Category created successfully');
      }
      
      setIsCategoryDialogOpen(false);
      setCategoryForm({ id: '', name: '', description: '' });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  /**
   * Returns the product-level columns (net_weight_g / net_volume_ml /
   * base_unit_category / price_basis_uom_id / default_sales_uom_id) so the
   * caller can persist them on the products row in the same transaction.
   */
  const persistProductUnits = async (
    productId: string,
  ): Promise<{
    base_unit_category: 'Weight' | 'Volume' | 'Quantity';
    net_weight_g: number | null;
    net_volume_ml: number | null;
    price_basis_uom_id: string | null;
    default_sales_uom_id: string | null;
    default_purchase_uom_id: string | null;
  } | null> => {
    if (!productId || uomEditorValue.rows.length === 0) return null;

    const baseCatUnits = await loadEnabledUnits(uomEditorValue.baseCategory);

    const derived = deriveProductMappings({
      category: uomEditorValue.baseCategory,
      netWeightG: uomEditorValue.netWeightG,
      netVolumeMl: uomEditorValue.netVolumeMl,
      baseCategoryUnits: baseCatUnits.map((u) => ({
        uomId: u.uomId,
        code: u.code,
        name: u.name,
      })),
      packagingRows: uomEditorValue.rows.map((r) => ({
        uomId: r.uomId,
        code: r.code,
        name: r.name,
        qtyPerPiece: r.qtyPerPiece,
        isDefaultSales: r.isDefaultSales,
        isPriceBasis: r.isPriceBasis,
        isDefaultPurchase: r.isDefaultPurchase,
      })),
      priceBasisCode: uomEditorValue.priceBasisCode ?? null,
      defaultSalesCode: uomEditorValue.defaultSalesCode ?? null,
      defaultPurchaseCode: uomEditorValue.defaultPurchaseCode ?? null,
    });

    if (!derived.some((r) => r.isBase)) {
      throw new Error('Exactly one base unit is required');
    }
    if (!derived.some((r) => r.isDefaultSales)) {
      throw new Error('Choose the unit this product is sold/priced as');
    }

    const { error: delErr } = await supabase
      .from('product_uom_mapping')
      .delete()
      .eq('product_id', productId);
    if (delErr) throw delErr;

    const payload = derived.map((r) => ({
      product_id: productId,
      uom_id: r.uomId,
      conversion_to_base: r.conversionToBase,
      is_base: r.isBase,
      is_default_sales: r.isDefaultSales,
      is_price_basis: r.isPriceBasis,
      is_default_purchase: r.isDefaultPurchase,
    }));
    const { error: insErr } = await supabase
      .from('product_uom_mapping')
      .insert(payload as any);
    if (insErr) throw insErr;

    clearUomCache(productId);
    queryClient.invalidateQueries({ queryKey: ['uom', 'product', productId] });

    const defaultRow = derived.find((r) => r.isDefaultSales) ?? derived[0];
    const priceRow = derived.find((r) => r.isPriceBasis) ?? defaultRow;
    const purchaseRow = derived.find((r) => r.isDefaultPurchase) ?? defaultRow;

    return {
      base_unit_category: uomEditorValue.baseCategory as 'Weight' | 'Volume' | 'Quantity',
      net_weight_g:
        uomEditorValue.baseCategory === 'Weight' ? uomEditorValue.netWeightG : null,
      net_volume_ml:
        uomEditorValue.baseCategory === 'Volume' ? uomEditorValue.netVolumeMl : null,
      price_basis_uom_id: priceRow?.uomId ?? null,
      default_sales_uom_id: defaultRow?.uomId ?? null,
      default_purchase_uom_id: purchaseRow?.uomId ?? null,
    };
  };

  /**
   * Phase 2 — persist optional per-UOM price overrides.
   * Strategy: wipe-then-write (overrides are a small list, ≤10 rows in practice).
   * Empty list → all overrides removed → product falls back to derived pricing.
   */
  const persistPriceOverrides = async (productId: string) => {
    const overrides = uomEditorValue.priceOverrides ?? [];

    const { error: delErr } = await supabase
      .from('product_price_list')
      .delete()
      .eq('product_id', productId);
    if (delErr) throw delErr;

    if (overrides.length > 0) {
      // Enforce: at most one default. If user picked none, the first row wins.
      const hasDefault = overrides.some((o) => o.isDefaultPrice);
      const payload = overrides.map((o, idx) => ({
        product_id: productId,
        uom_id: o.uomId,
        rate: Number(o.rate) || 0,
        is_default_price: hasDefault ? !!o.isDefaultPrice : idx === 0,
        notes: o.notes ?? null,
      }));
      const { error: insErr } = await supabase
        .from('product_price_list')
        .insert(payload as any);
      if (insErr) throw insErr;
    }

    clearPriceListCache(productId);
    queryClient.invalidateQueries({ queryKey: ['price-list', productId] });
  };


  const handleProductSubmit = async () => {
    try {
      // Generate QR code if not exists
      const qrCode = productForm.qr_code || generateQRCode('product', productForm.sku, productForm.name);

      let savedProductId = productForm.id;

      if (productForm.id) {
        const { error } = await supabase
          .from('products')
          .update({
            sku: productForm.sku,
            product_number: productForm.product_number || null,
            name: productForm.name,
            description: productForm.description,
            category_id: productForm.category_id || null,
            rate: productForm.rate,
            unit: productForm.unit,
            conversion_factor: productForm.conversion_factor,
            closing_stock: productForm.closing_stock,
            is_active: productForm.is_active,
            sku_image_url: productForm.sku_image_url || null,
            is_focused_product: productForm.is_focused_product,
            focused_due_date: productForm.focused_due_date || null,
            focused_target_quantity: productForm.focused_target_quantity || 0,
            focused_territories: productForm.focused_territories || [],
            barcode: productForm.barcode || null,
            qr_code: qrCode,
            hsn_code: productForm.hsn_code || null,
            gst_percentage: productForm.gst_percentage ?? null
          })
          .eq('id', productForm.id);
        
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { data: inserted, error } = await supabase
          .from('products')
          .insert({
            sku: productForm.sku,
            product_number: productForm.product_number || null,
            name: productForm.name,
            description: productForm.description,
            category_id: productForm.category_id || null,
            rate: productForm.rate,
            unit: productForm.unit,
            
            conversion_factor: productForm.conversion_factor,
            closing_stock: productForm.closing_stock,
            is_active: productForm.is_active,
            sku_image_url: productForm.sku_image_url || null,
            is_focused_product: productForm.is_focused_product,
            focused_due_date: productForm.focused_due_date || null,
            focused_target_quantity: productForm.focused_target_quantity || 0,
            focused_territories: productForm.focused_territories || [],
            barcode: productForm.barcode || null,
            qr_code: qrCode,
            hsn_code: productForm.hsn_code || null,
            gst_percentage: productForm.gst_percentage ?? null
          })
          .select('id')
          .single();
        
        if (error) throw error;
        savedProductId = inserted?.id ?? '';
        toast.success('Product created successfully');
      }

      try {
        if (savedProductId) {
          const productCols = await persistProductUnits(savedProductId);
          // Patch the new physical-size + UOM-id columns onto the products row.
          if (productCols) {
            const { error: patchErr } = await supabase
              .from('products')
              .update(productCols as any)
              .eq('id', savedProductId);
            if (patchErr) throw patchErr;
          }
        }
      } catch (uomErr: any) {
        toast.error(`Saved product, but unit mappings failed: ${uomErr.message ?? uomErr}`);
      }

      // Phase 2 — persist optional per-UOM price overrides (additive layer)
      try {
        if (savedProductId) {
          await persistPriceOverrides(savedProductId);
        }
      } catch (priceErr: any) {
        toast.error(`Saved product, but price overrides failed: ${priceErr.message ?? priceErr}`);
      }

      setIsProductDialogOpen(false);
      setProductForm({
        id: '',
        sku: '',
        product_number: '',
        name: '',
        description: '',
        category_id: '',
        is_focused_product: false,
        focused_type: undefined,
        focused_due_date: '',
        focused_target_quantity: 0,
        focused_territories: [],
        focused_recurring_config: {
          days_of_week: [],
          weeks_of_month: [],
          months_of_year: []
        },
        rate: 0,
        unit: 'piece',
        base_unit: 'kg',
        conversion_factor: 1,
        closing_stock: 0,
        is_active: true,
        sku_image_url: '',
        barcode: '',
        barcode_image_url: '',
        qr_code: '',
        hsn_code: '',
        gst_percentage: null
      });
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      const msg =
        error?.message ||
        error?.details ||
        error?.hint ||
        (typeof error === 'string' ? error : JSON.stringify(error));
      toast.error(`Failed to save product: ${msg}`);
    }
  };

  const processProductPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-photos')
        .getPublicUrl(filePath);

      setProductForm(prev => ({ ...prev, sku_image_url: publicUrl }));
      toast.success('Product photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading product photo:', error);
      toast.error('Failed to upload product photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSkuImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processProductPhoto(file);
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        await processProductPhoto(file);
      }
    };
    input.click();
    setShowPhotoOptions(false);
  };

  const handleGalleryUpload = () => {
    const input = document.getElementById('sku-image') as HTMLInputElement;
    input?.click();
    setShowPhotoOptions(false);
  };


  const handleDeleteCategory = async (id: string, name: string) => {
    setDeleteConfirm({ open: true, type: 'category', id, name });
  };

  const executeDeleteCategory = async (id: string) => {
    try {
      const categoryData = categories.find(c => c.id === id);
      if (categoryData) {
        await moveToRecycleBin({
          tableName: 'product_categories',
          recordId: id,
          recordData: categoryData,
          moduleName: 'Product Categories',
          recordName: categoryData.name
        });
      }
      
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Category moved to recycle bin');
      fetchCategories();
      setDeleteConfirm({ open: false, type: null, id: '', name: '' });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    setDeleteConfirm({ open: true, type: 'product', id, name });
  };

  const executeDeleteProduct = async (id: string) => {
    try {
      const productData = products.find(p => p.id === id);
      if (productData) {
        await moveToRecycleBin({
          tableName: 'products',
          recordId: id,
          recordData: productData,
          moduleName: 'Products',
          recordName: productData.name
        });
      }
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Product moved to recycle bin');
      fetchProducts();
      setDeleteConfirm({ open: false, type: null, id: '', name: '' });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };


  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const productsPagination = usePagination(filteredProducts, { pageSize: 15 });

  // Reset to first page whenever the search query changes so results aren't
  // hidden behind a stale page index from before the filter was applied.
  useEffect(() => {
    productsPagination.goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Management
          </CardTitle>
          <CardDescription>
            Manage your product catalog, categories, SKUs, and promotional schemes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products & SKUs
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border bg-card/50 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="relative flex-1 min-w-0 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products or SKUs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 rounded-lg w-full"
                    />
                  </div>
                  <Badge variant="secondary" className="h-8 px-3 text-xs font-medium whitespace-nowrap rounded-full">
                    Total: {filteredProducts.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/uom-master')}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    UoM Master
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.loading('Syncing products...');
                      fetchData();
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync
                  </Button>
                  <ProductDataImportButton onImported={() => fetchData()} />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirm({ open: true, type: 'all-products', id: 'all', name: 'ALL products and related data' })}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All
                  </Button>
                  <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setProductForm({
                        id: '',
                        sku: '',
                        product_number: '',
                        name: '',
                        description: '',
                        category_id: '',
                        is_focused_product: false,
                        focused_type: undefined,
                        focused_due_date: '',
                        focused_target_quantity: 0,
                        focused_territories: [],
                        focused_recurring_config: undefined,
                        rate: 0,
                        unit: 'piece',
                        base_unit: 'kg',
                        conversion_factor: 1,
                        closing_stock: 0,
                        is_active: true,
                        sku_image_url: '',
                        barcode: '',
                        barcode_image_url: '',
                        qr_code: '',
                        hsn_code: '',
                        gst_percentage: null
                      })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>{productForm.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                      <DialogDescription>
                        {productForm.id ? 'Update product details' : 'Add a new product to your catalog'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto -mx-6 px-6">
                      <div className="space-y-4 py-2">
                        <ProductFormFields
                          form={productForm}
                          categories={categories}
                          territories={territories}
                          onFormChange={(updates) => setProductForm({ ...productForm, ...updates })}
                        />
                        <ProductUnitsEditor
                          value={uomEditorValue}
                          onChange={setUomEditorValue}
                          productRate={Number(productForm.rate) || 0}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleProductSubmit}>
                        {productForm.id ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="h-[400px] rounded-md border overflow-auto [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                <table className="w-full caption-bottom text-sm min-w-[1200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rate per Unit</TableHead>
                      <TableHead>Rate per KG</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>HSN/SAC</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsPagination.paginatedItems.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {(product as any).sku_image_url ? (
                            <img 
                              src={(product as any).sku_image_url} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                setProductForm({
                                  id: '',
                                  sku: '',
                                  product_number: '',
                                  name: '',
                                  description: '',
                                  category_id: '',
                                  rate: 0,
                                  unit: 'kg',
                                  base_unit: 'kg',
                                  conversion_factor: 1,
                                  closing_stock: 0,
                                  is_active: true,
                                  sku_image_url: '',
                                  is_focused_product: false,
                                  focused_type: undefined,
                                  focused_due_date: '',
                                  focused_target_quantity: 0,
                                  focused_territories: [],
                                  focused_recurring_config: undefined,
                                  barcode: '',
                                  barcode_image_url: '',
                                  qr_code: '',
                                  hsn_code: '',
                                  gst_percentage: null
                                });
                                setIsProductDialogOpen(true);
                              }}
                            />
                          ) : (
                            <div 
                              className="w-12 h-12 bg-muted rounded border flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                              onClick={() => {
                                setProductForm({
                                  id: '',
                                  sku: '',
                                  product_number: '',
                                  name: '',
                                  description: '',
                                  category_id: '',
                                  rate: 0,
                                  unit: 'kg',
                                  base_unit: 'kg',
                                  conversion_factor: 1,
                                  closing_stock: 0,
                                  is_active: true,
                                  sku_image_url: '',
                                  is_focused_product: false,
                                  focused_type: undefined,
                                  focused_due_date: '',
                                  focused_target_quantity: 0,
                                  focused_territories: [],
                                  focused_recurring_config: undefined,
                                  barcode: '',
                                  barcode_image_url: '',
                                  qr_code: '',
                                  hsn_code: '',
                                  gst_percentage: null
                                });
                                setIsProductDialogOpen(true);
                              }}
                            >
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{product.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {product.is_focused_product && (
                              <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                                Focused
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.category?.name}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">₹{(product.rate * (product.conversion_factor || 1)).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">per {product.unit}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">₹{product.rate.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">per {product.base_unit || 'kg'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell className="font-mono text-sm">{(product as any).hsn_code || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {variants.filter(v => v.product_id === product.id).length} variants
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProductForVariants(product.id);
                                setIsVariantsViewOpen(true);
                              }}
                            >
                              <Grid3X3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setProductForm({
                                  id: product.id,
                                  sku: product.sku,
                                  product_number: product.product_number || '',
                                  name: product.name,
                                  description: product.description || '',
                                  category_id: product.category_id || '',
                                  is_focused_product: product.is_focused_product || false,
                                  focused_type: (product as any).focused_type || undefined,
                                  focused_due_date: product.focused_due_date || '',
                                  focused_target_quantity: product.focused_target_quantity || 0,
                                  focused_territories: product.focused_territories || [],
                                  focused_recurring_config: (product as any).focused_recurring_config || undefined,
                                  rate: product.rate,
                                  unit: product.unit,
                                  base_unit: (product as any).base_unit || 'kg',
                                  conversion_factor: (product as any).conversion_factor || 1,
                                  closing_stock: product.closing_stock,
                                  is_active: product.is_active,
                                  sku_image_url: (product as any).sku_image_url || '',
                                  barcode: (product as any).barcode || '',
                                  barcode_image_url: (product as any).barcode_image_url || '',
                                  qr_code: (product as any).qr_code || '',
                                  hsn_code: (product as any).hsn_code || '',
                                  gst_percentage: (product as any).gst_percentage ?? null
                                });
                                setIsProductDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </table>
              </div>
              <PaginationControls
                currentPage={productsPagination.currentPage}
                totalPages={productsPagination.totalPages}
                startIndex={productsPagination.startIndex}
                endIndex={productsPagination.endIndex}
                totalItems={productsPagination.totalItems}
                hasNextPage={productsPagination.hasNextPage}
                hasPrevPage={productsPagination.hasPrevPage}
                onNextPage={productsPagination.nextPage}
                onPrevPage={productsPagination.prevPage}
                onGoToPage={productsPagination.goToPage}
              />
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Product Categories</h3>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setCategoryForm({ id: '', name: '', description: '' })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{categoryForm.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                      <DialogDescription>
                        {categoryForm.id ? 'Update category details' : 'Create a new product category'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="categoryName">Name</Label>
                        <Input
                          id="categoryName"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          placeholder="Enter category name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryDescription">Description</Label>
                        <Textarea
                          id="categoryDescription"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          placeholder="Enter category description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCategorySubmit}>
                        {categoryForm.id ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.description}</TableCell>
                        <TableCell>
                          {products.filter(p => p.category_id === category.id).length} products
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCategoryForm({
                                  id: category.id,
                                  name: category.name,
                                  description: category.description || ''
                                });
                                setIsCategoryDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* Product Variants Management Dialog */}
      <Dialog open={isVariantsViewOpen} onOpenChange={setIsVariantsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Product Variants
              {selectedProductForVariants && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {products.find(p => p.id === selectedProductForVariants)?.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Manage variants for the selected product with different sizes, prices, and stock
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="flex justify-end">
              <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setVariantForm({
                      id: '',
                      product_id: selectedProductForVariants,
                      variant_name: '',
                      sku: '',
                      product_number: '',
                      description: '',
                      base_unit: 'kg',
                      unit: 'piece',
                      conversion_factor: 1,
                      price: 0,
                      stock_quantity: 0,
                      hsn_code: '90230',
                      discount_percentage: 0,
                      discount_amount: 0,
                      is_active: true,
                      is_focused_product: false,
                      focused_type: undefined,
                      focused_due_date: '',
                      focused_target_quantity: 0,
                      focused_territories: [],
                      focused_recurring_config: undefined,
                      barcode: '',
                      qr_code: ''
                    } as any)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>{variantForm.id ? 'Edit Variant' : 'Add New Variant'}</DialogTitle>
                    <DialogDescription>
                      {variantForm.id ? 'Update variant details' : 'Create a new product variant'}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[calc(90vh-180px)]">
                    <div className="space-y-4 pr-4">
                    {/* Active toggle at top like product form */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="variantActive"
                        checked={variantForm.is_active}
                        onCheckedChange={(checked) => setVariantForm({ ...variantForm, is_active: checked === true })}
                      />
                      <Label htmlFor="variantActive">Active</Label>
                    </div>

                    {/* SKU and Product Number in 2 columns like product form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="variantSku">SKU *</Label>
                        <Input
                          id="variantSku"
                          value={variantForm.sku}
                          onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                          placeholder="Enter SKU"
                        />
                      </div>
                      <div>
                        <Label htmlFor="variantProductNumber">Product Number</Label>
                        <Input
                          id="variantProductNumber"
                          value={variantForm.product_number || ''}
                          onChange={(e) => setVariantForm({ ...variantForm, product_number: e.target.value })}
                          placeholder="Enter product number"
                        />
                      </div>
                    </div>

                    {/* Variant Name (full width like product name) */}
                    <div>
                      <Label htmlFor="variantName">Variant Name *</Label>
                      <Input
                        id="variantName"
                        value={variantForm.variant_name}
                        onChange={(e) => setVariantForm({ ...variantForm, variant_name: e.target.value })}
                        placeholder="Enter variant name"
                      />
                    </div>

                    {/* Description (full width like product description) */}
                    <div>
                      <Label htmlFor="variantDescription">Description</Label>
                      <Textarea
                        id="variantDescription"
                        value={variantForm.description || ''}
                        onChange={(e) => setVariantForm({ ...variantForm, description: e.target.value })}
                        placeholder="Enter variant description"
                        rows={3}
                      />
                    </div>

                    {/* Units in 3 columns like product form */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="variantBaseUnit">Base Unit</Label>
                        <Select 
                          value={variantForm.base_unit || 'kg'} 
                          onValueChange={(value) => setVariantForm({ ...variantForm, base_unit: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                            <SelectItem value="ltr">Liter (ltr)</SelectItem>
                            <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="variantUnit">Unit *</Label>
                        <Select 
                          value={variantForm.unit || 'piece'} 
                          onValueChange={(value) => setVariantForm({ ...variantForm, unit: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                            <SelectItem value="ltr">Liter (ltr)</SelectItem>
                            <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="variantConversionFactor">Conversion Factor</Label>
                        <Input
                          id="variantConversionFactor"
                          type="number"
                          step="0.01"
                          value={variantForm.conversion_factor || 1}
                          onChange={(e) => setVariantForm({ ...variantForm, conversion_factor: parseFloat(e.target.value) || 1 })}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    {/* Price and Stock in 2 columns */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="variantPrice">Rate (₹) *</Label>
                        <Input
                          id="variantPrice"
                          type="number"
                          step="0.01"
                          value={variantForm.price}
                          onChange={(e) => {
                            const price = parseFloat(e.target.value) || 0;
                            const discountAmount = (price * variantForm.discount_percentage) / 100;
                            setVariantForm({ 
                              ...variantForm, 
                              price,
                              discount_amount: Number(discountAmount.toFixed(2))
                            });
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="variantStock">Closing Stock</Label>
                        <Input
                          id="variantStock"
                          type="number"
                          value={variantForm.stock_quantity}
                          onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* HSN Code (full width) */}
                    <div>
                      <Label htmlFor="variantHsnCode">HSN/SAC Code</Label>
                      <Input
                        id="variantHsnCode"
                        value={variantForm.hsn_code || ''}
                        onChange={(e) => setVariantForm({ ...variantForm, hsn_code: e.target.value })}
                        placeholder="Enter HSN/SAC code"
                      />
                    </div>

                    {/* Barcode (full width) */}
                    <div>
                      <Label htmlFor="variantBarcode">Barcode</Label>
                      <Input
                        id="variantBarcode"
                        value={variantForm.barcode || ''}
                        onChange={(e) => setVariantForm({ ...variantForm, barcode: e.target.value })}
                        placeholder="Enter barcode"
                      />
                    </div>

                    {/* Discount in 2 columns */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="discountPerc">Discount %</Label>
                        <Input
                          id="discountPerc"
                          type="number"
                          value={variantForm.discount_percentage}
                          onChange={(e) => {
                            const percentage = parseFloat(e.target.value) || 0;
                            const discountAmount = (variantForm.price * percentage) / 100;
                            setVariantForm({ 
                              ...variantForm, 
                              discount_percentage: percentage,
                              discount_amount: Number(discountAmount.toFixed(2))
                            });
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="discountAmt">Discount Amount (₹)</Label>
                        <Input
                          id="discountAmt"
                          type="number"
                          value={variantForm.discount_amount}
                          onChange={(e) => setVariantForm({ ...variantForm, discount_amount: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    {/* Focused Product Section for Variants */}
                    <VariantFocusedFields
                      isFocused={variantForm.is_focused_product || false}
                      focusedType={(variantForm as any).focused_type}
                      focusedDueDate={variantForm.focused_due_date || ''}
                      focusedTargetQuantity={variantForm.focused_target_quantity || 0}
                      focusedTerritories={variantForm.focused_territories || []}
                      focusedRecurringConfig={(variantForm as any).focused_recurring_config}
                      territories={territories}
                      onIsFocusedChange={(value) => setVariantForm({ ...variantForm, is_focused_product: value })}
                      onFocusedTypeChange={(value) => setVariantForm({ ...variantForm, focused_type: value } as any)}
                      onFocusedDueDateChange={(value) => setVariantForm({ ...variantForm, focused_due_date: value })}
                      onFocusedTargetQuantityChange={(value) => setVariantForm({ ...variantForm, focused_target_quantity: value })}
                      onFocusedTerritoriesChange={(value) => setVariantForm({ ...variantForm, focused_territories: value })}
                      onFocusedRecurringConfigChange={(value) => setVariantForm({ ...variantForm, focused_recurring_config: value } as any)}
                    />
                    </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsVariantDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleVariantSubmit}>
                      {variantForm.id ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Variants Table */}
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Variant Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.filter(v => v.product_id === selectedProductForVariants).map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-mono">{variant.sku}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{variant.variant_name}</span>
                          {variant.is_focused_product && (
                            <Badge variant="default" className="text-xs bg-orange-500 hover:bg-orange-600">
                              Focused
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>₹{variant.price.toFixed(2)}</TableCell>
                      <TableCell>{variant.stock_quantity}</TableCell>
                      <TableCell>
                        {variant.discount_percentage > 0 && (
                          <Badge variant="secondary">
                            {variant.discount_percentage}% (₹{variant.discount_amount})
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant.is_active ? 'default' : 'secondary'}>
                          {variant.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setVariantForm({
                                ...variant,
                                product_number: (variant as any).product_number || '',
                                description: (variant as any).description || '',
                                base_unit: (variant as any).base_unit || 'kg',
                                unit: (variant as any).unit || 'piece',
                                conversion_factor: (variant as any).conversion_factor || 1,
                                hsn_code: (variant as any).hsn_code || '',
                                is_focused_product: variant.is_focused_product || false,
                                focused_type: (variant as any).focused_type || undefined,
                                focused_due_date: variant.focused_due_date || '',
                                focused_target_quantity: variant.focused_target_quantity || 0,
                                focused_territories: variant.focused_territories || [],
                                focused_recurring_config: (variant as any).focused_recurring_config || undefined,
                                barcode: variant.barcode || '',
                                qr_code: variant.qr_code || ''
                              });
                              setIsVariantDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVariant(variant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {variants.filter(v => v.product_id === selectedProductForVariants).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No variants created yet</p>
                <p className="text-sm">Create variants to manage different sizes and pricing</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariantsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <strong>{deleteConfirm.name}</strong>
              {deleteConfirm.type === 'all-products' && ' including all related data (van inventory, schemes, variants)'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm({ open: false, type: null, id: '', name: '' })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductManagement;