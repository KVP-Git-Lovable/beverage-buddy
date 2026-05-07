import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { addOrderToSnapshot } from '@/lib/myVisitsSnapshot';
import { toast } from '@/hooks/use-toast';
import { getLocalTodayDate } from '@/utils/dateUtils';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: { name: string } | null;
  rate: number;
  unit: string;
  base_unit?: string;
  closing_stock: number;
  schemes?: any[];
  variants?: any[];
}

/**
 * PRODUCT DISPLAY FLOW - ESTABLISHED STANDARD
 * 
 * This hook manages the complete product lifecycle from Product Master to Order Entry.
 * 
 * ACTIVE PRODUCT RULES:
 * - Products/variants with is_active = true OR null/undefined → SHOWN
 * - Products/variants with is_active = false → HIDDEN
 * - When new products are added to Product Master with active status, they automatically appear
 * 
 * DISPLAY NAMING CONVENTION (SYSTEM-WIDE):
 * - Base products (no variants): Display product.name
 * - Base products (with variants): Display product.name + all active variants
 * - Product variants: Display ONLY variant.variant_name (NOT "product.name - variant.variant_name")
 * 
 * SYNC FLOW:
 * 1. Product added/updated in Product Master (is_active = true)
 * 2. syncProductsInBackground() fetches and caches to IndexedDB
 * 3. Order Entry loads from cache instantly
 * 4. TableOrderForm dropdown shows all active products + variants
 * 5. Van Stock Management shows same products
 * 
 * This ensures consistent product display across:
 * - Order Entry (grid and table modes)
 * - Van Stock Management
 * - Cart
 * - Invoices
 */
export function useOfflineOrderEntry() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false); // CRITICAL: Start with false - don't block UI
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background DELTA sync — only fetches products changed since last sync.
  // Uses sync_products_lite_delta RPC + mergeData (never clears the store).
  // Schemes/variants are NOT bulk-synced; they are fetched lazily per product
  // via get_product_details when actually needed.
  const syncProductsInBackground = async () => {
    try {
      const WATERMARK_KEY = 'products_watermark';
      const PAGE_SIZE = 2000;

      // Read last watermark (max updated_at we've already pulled)
      const meta = await offlineStorage.getSyncMetadata(WATERMARK_KEY);
      let since = meta?.lastSyncedAt || '1970-01-01T00:00:00Z';
      let totalChanged = 0;
      let maxSeen = since;

      // Page through changes by ascending updated_at
      // Loop until a page returns < PAGE_SIZE rows.
      // Safety cap of 50 pages (= 100k rows) prevents runaway loops.
      for (let page = 0; page < 50; page++) {
        const { data, error } = await supabase.rpc('sync_products_lite_delta', {
          p_since: since,
          p_limit: PAGE_SIZE,
        });
        if (error) throw error;
        const rows = (data as any[]) || [];
        if (rows.length === 0) break;

        // Map RPC shape -> cache shape used by the rest of the page
        const mapped = rows.map((r: any) => ({
          id: r.id,
          sku: r.sku,
          name: r.name,
          brand: r.brand,
          category: r.category_name ? { name: r.category_name } : null,
          unit: r.unit,
          base_unit: r.base_unit,
          gst_percentage: r.gst_percentage,
          rate: r.rate,
          is_active: r.is_active,
          is_focused_product: r.is_focused_product,
          hsn_code: r.hsn_code,
          sku_image_url: r.sku_image_url,
          search_keywords: r.search_keywords,
          updated_at: r.updated_at,
          // schemes/variants are lazy — populated on demand via get_product_details
          schemes: [],
          variants: [],
          closing_stock: 0,
        }));

        // Upsert (preserves existing items not in this delta)
        await offlineStorage.mergeData(STORES.PRODUCTS, mapped);

        const lastUpdatedAt = rows[rows.length - 1].updated_at;
        if (lastUpdatedAt && lastUpdatedAt > maxSeen) maxSeen = lastUpdatedAt;
        since = lastUpdatedAt;
        totalChanged += rows.length;

        if (rows.length < PAGE_SIZE) break;
      }

      // Persist new watermark only if we advanced
      if (maxSeen && maxSeen !== meta?.lastSyncedAt) {
        await offlineStorage.save(STORES.SYNC_METADATA, {
          id: WATERMARK_KEY,
          lastSyncedAt: maxSeen,
          dataType: WATERMARK_KEY,
        });
      }

      // Refresh React state from the merged cache (filter inactive)
      if (totalChanged > 0) {
        const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
        const activeProducts = (cachedProducts || []).filter(
          (p: any) => p.is_active !== false,
        );
        setProducts(activeProducts as Product[]);
      }
      setLoading(false);

      if (totalChanged > 0) {
        console.log(`✅ Delta-synced ${totalChanged} changed products (watermark → ${maxSeen})`);
      } else {
        console.log('✅ Product catalog up to date (no delta)');
      }
    } catch (error) {
      console.error('Background sync error:', error);
    }
  };

  // Fetch products with offline support - instant cache load, NO network blocking
  const fetchProducts = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('⏸️ Fetch already in progress, skipping...');
      return;
    }

    // Don't refetch if we already have products loaded
    if (hasFetchedRef.current) {
      console.log('✅ Products already loaded, skipping refetch');
      return;
    }

    isFetchingRef.current = true;
    
    // CRITICAL: Set loading false immediately - don't block UI
    // This ensures the page renders instantly even if cache operations take time
    setLoading(false);

    try {
      // 1. Load from cache INSTANTLY - no loading state blocking
      const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
      const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
      const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

      if (cachedProducts.length > 0) {
        // Filter only active products: is_active must be true or null/undefined (never false)
        const activeProducts = (cachedProducts || []).filter((p: any) => p.is_active !== false);
        const activeVariants = (cachedVariants || []).filter((v: any) => v.is_active !== false);
        const activeSchemes = (cachedSchemes || []).filter((s: any) => s.is_active !== false);
        
        const enrichedProducts = activeProducts.map((product: any) => ({
          ...product,
          variants: activeVariants.filter((v: any) => v.product_id === product.id),
          schemes: activeSchemes.filter((s: any) => s.product_id === product.id)
        }));
        setProducts(enrichedProducts);
        hasFetchedRef.current = true;
        console.log(`✅ Loaded ${enrichedProducts.length} active products from cache instantly`);
        
        // Background sync if online - DO NOT await, fire and forget
        if (isOnline) {
          // Use requestIdleCallback or setTimeout to not block main thread
          requestIdleCallback?.(() => {
            syncProductsInBackground().catch(err => 
              console.error('Background sync failed:', err)
            );
          }) || setTimeout(() => {
            syncProductsInBackground().catch(err => 
              console.error('Background sync failed:', err)
            );
          }, 100);
        }
      } else {
        // No cache - still don't block, fetch in background
        console.log('📦 No cached products, fetching from network in background...');
        
        // CRITICAL: Don't await - fetch in background without blocking
        if (isOnline) {
          syncProductsInBackground().then(() => {
            hasFetchedRef.current = true;
          }).catch(err => {
            console.error('Background sync failed:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Try fallback to cache on error - non-blocking
      try {
        const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
        const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
        const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

        if (cachedProducts.length > 0) {
          const activeProducts = (cachedProducts || []).filter((p: any) => p.is_active !== false);
          const activeVariants = (cachedVariants || []).filter((v: any) => v.is_active !== false);
          const activeSchemes = (cachedSchemes || []).filter((s: any) => s.is_active !== false);
          
          const enrichedProducts = activeProducts.map((product: any) => ({
            ...product,
            variants: activeVariants.filter((v: any) => v.product_id === product.id),
            schemes: activeSchemes.filter((s: any) => s.product_id === product.id)
          }));
          setProducts(enrichedProducts);
          hasFetchedRef.current = true;
        }
      } catch (cacheError) {
        console.error('Cache fallback also failed:', cacheError);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isOnline]);

  // Submit order with offline support - optimized
  const submitOrder = async (orderData: any, orderItems: any[]) => {
    const localOrderDate = orderData.order_date || getLocalTodayDate();

    if (!isOnline) {
      // Offline: Queue for sync
      const orderId = crypto.randomUUID();
      const offlineOrder = {
        ...orderData,
        id: orderId,
        created_at: new Date().toISOString(),
        order_date: localOrderDate,
        status: orderData.status || 'confirmed',
        // CRITICAL: Round total_amount consistently to prevent cache/snapshot inconsistencies
        total_amount: Math.round(Number(orderData.total_amount ?? 0)),
      };

      const offlineItems = orderItems.map(item => ({
        ...item,
        order_id: orderId
      }));

      // Save to offline storage in parallel
      await Promise.all([
        offlineStorage.save(STORES.ORDERS, { ...offlineOrder, items: offlineItems }),
        offlineStorage.addToSyncQueue('CREATE_ORDER', {
          order: offlineOrder,
          items: offlineItems
        })
      ]);

      // Persist snapshot so My Visits "Today's Progress" updates even after navigation/app restart
      try {
        if (offlineOrder.user_id) {
          await addOrderToSnapshot(offlineOrder.user_id, localOrderDate, {
            id: offlineOrder.id,
            retailer_id: offlineOrder.retailer_id,
            user_id: offlineOrder.user_id,
            // Use the already-rounded total_amount from offlineOrder
            total_amount: offlineOrder.total_amount,
            order_date: localOrderDate,
            status: offlineOrder.status || 'confirmed',
            visit_id: offlineOrder.visit_id,
          });
        }
      } catch (e) {
        console.warn('[useOfflineOrderEntry] Could not update snapshot (offline):', e);
      }

      toast({
        title: "Order Saved Offline",
        description: "Your order will be synced when you're back online",
      });

      // Trigger data refresh for Today's Progress
      window.dispatchEvent(new CustomEvent('visitDataChanged', { detail: { date: localOrderDate } }));

      return { success: true, offline: true, order: offlineOrder };
    } else {
      // Online: Submit with optimized single transaction
      // CRITICAL: If online submission fails, fall back to offline queue to prevent data loss
      try {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({ ...orderData, order_date: localOrderDate, status: orderData.status || 'confirmed' })
          .select()
          .single();

        if (orderError) throw orderError;

        // Batch insert all items at once
        const itemsWithOrderId = orderItems.map(item => ({
          ...item,
          order_id: order.id
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;

        // Persist locally so progress works immediately after navigation
        try {
          const roundedTotalAmount = Math.round(Number(order.total_amount ?? 0));
          const normalizedOrder = { ...order, items: orderItems, order_date: localOrderDate, status: order.status || 'confirmed', total_amount: roundedTotalAmount };
          await offlineStorage.save(STORES.ORDERS, normalizedOrder);
          if (normalizedOrder.user_id) {
            await addOrderToSnapshot(normalizedOrder.user_id, localOrderDate, {
              id: normalizedOrder.id,
              retailer_id: normalizedOrder.retailer_id,
              user_id: normalizedOrder.user_id,
              total_amount: roundedTotalAmount,
              order_date: localOrderDate,
              status: normalizedOrder.status || 'confirmed',
              visit_id: normalizedOrder.visit_id,
            });
          }
        } catch (e) {
          console.warn('[useOfflineOrderEntry] Could not persist online order locally (non-fatal):', e);
        }

        // Trigger data refresh for Today's Progress
        window.dispatchEvent(new CustomEvent('visitDataChanged', { detail: { date: localOrderDate } }));

        return { success: true, offline: false, order };
      } catch (onlineError: any) {
        // FALLBACK: Online submission failed — queue for offline sync to prevent data loss
        console.warn('[useOfflineOrderEntry] Online submission failed, falling back to offline queue:', onlineError.message);
        
        const orderId = crypto.randomUUID();
        const offlineOrder = {
          ...orderData,
          id: orderId,
          created_at: new Date().toISOString(),
          order_date: localOrderDate,
          status: orderData.status || 'confirmed',
          total_amount: Math.round(Number(orderData.total_amount ?? 0)),
        };

        const offlineItems = orderItems.map(item => ({
          ...item,
          order_id: orderId
        }));

        await Promise.all([
          offlineStorage.save(STORES.ORDERS, { ...offlineOrder, items: offlineItems }),
          offlineStorage.addToSyncQueue('CREATE_ORDER', {
            order: offlineOrder,
            items: offlineItems
          })
        ]);

        try {
          if (offlineOrder.user_id) {
            await addOrderToSnapshot(offlineOrder.user_id, localOrderDate, {
              id: offlineOrder.id,
              retailer_id: offlineOrder.retailer_id,
              user_id: offlineOrder.user_id,
              total_amount: offlineOrder.total_amount,
              order_date: localOrderDate,
              status: offlineOrder.status || 'confirmed',
              visit_id: offlineOrder.visit_id,
            });
          }
        } catch (e) {
          console.warn('[useOfflineOrderEntry] Could not update snapshot (fallback):', e);
        }

        toast({
          title: "Order Saved Locally",
          description: "Network issue detected. Your order will sync automatically when connection is stable.",
        });

        window.dispatchEvent(new CustomEvent('visitDataChanged', { detail: { date: localOrderDate } }));

        return { success: true, offline: true, order: offlineOrder };
      }
    }
  };

  return {
    products,
    loading,
    isOnline,
    fetchProducts,
    submitOrder
  };
}
