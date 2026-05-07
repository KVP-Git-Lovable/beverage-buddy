import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side product search for the Order Entry dropdown.
 *
 * - Debounces input (300ms)
 * - Requires min 2 characters before hitting the server
 * - Caches the last ~20 query results in-memory (LRU)
 * - Falls back to filtering the offline `products` array when offline
 * - Returns a flat list of selectable options (base products + active variants)
 *
 * Existing offline cache (useOfflineOrderEntry) is left untouched so cart calc,
 * schemes, voice/chat ordering and offline order placement keep working.
 */

export interface ProductSearchVariant {
  id: string;
  variant_name: string;
  sku: string;
  price: number;
  is_active?: boolean;
  is_focused_product?: boolean;
}

export interface ProductSearchResult {
  id: string;
  sku: string;
  name: string;
  rate: number;
  unit: string;
  closing_stock: number | null;
  is_active: boolean | null;
  category_name: string | null;
  is_focused_product: boolean | null;
  default_uom_code?: string | null;
  allowed_uom_codes?: string[] | null;
  variants: ProductSearchVariant[];
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 150;
const PAGE_SIZE = 100; // dropdown shows up to 100 matches per query
const LRU_MAX = 20;

function normalizeCategory(category: string | null | undefined): string {
  const normalized = (category || '').trim().toLowerCase();
  return normalized === 'all' ? 'all' : (category || '').trim();
}

type CacheKey = string;
const cache = new Map<CacheKey, ProductSearchResult[]>();
const cacheKey = (term: string, category: string) => `${term.toLowerCase()}|${normalizeCategory(category)}`;
const cacheGet = (k: CacheKey) => {
  if (!cache.has(k)) return undefined;
  const v = cache.get(k)!;
  // Refresh recency
  cache.delete(k);
  cache.set(k, v);
  return v;
};
const cacheSet = (k: CacheKey, v: ProductSearchResult[]) => {
  cache.set(k, v);
  while (cache.size > LRU_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey === undefined) break;
    cache.delete(firstKey);
  }
};

/**
 * Warm the empty-query cache so the first popover open is instant.
 * Safe to call multiple times — bails out if cached or offline.
 */
export async function prefetchInitialProductSearch(category: string = 'all') {
  const k = cacheKey('', category);
  if (cacheGet(k)) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const normalizedCategory = normalizeCategory(category);
  try {
    const { data, error } = await supabase.rpc('search_products_for_order', {
      p_query: '',
      p_category: normalizedCategory && normalizedCategory !== 'all' ? normalizedCategory : null,
      p_limit: PAGE_SIZE,
    });
    if (!error && data) cacheSet(k, data as unknown as ProductSearchResult[]);
  } catch {
    /* ignore — will fetch on first open */
  }
}

function offlineFilter(
  products: any[],
  term: string,
  category: string
): ProductSearchResult[] {
  const t = term.toLowerCase();
  const normalizedCategory = normalizeCategory(category);
  const filtered = products
    .filter((p) => p.is_active !== false)
    .filter((p) => normalizedCategory === 'all' || p?.category?.name === normalizedCategory)
    .filter((p) => {
      if (!t) return true;
      if (p.name?.toLowerCase().includes(t)) return true;
      if (p.sku?.toLowerCase().includes(t)) return true;
      if (Array.isArray(p.variants)) {
        return p.variants.some(
          (v: any) =>
            v.is_active !== false &&
            (v.variant_name?.toLowerCase().includes(t) ||
              v.sku?.toLowerCase().includes(t))
        );
      }
      return false;
    })
    .slice(0, PAGE_SIZE);

  return filtered.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    rate: p.rate,
    unit: p.unit,
    closing_stock: p.closing_stock ?? null,
    is_active: p.is_active ?? true,
    category_name: p?.category?.name ?? null,
    is_focused_product: p.is_focused_product ?? null,
    variants: Array.isArray(p.variants)
      ? p.variants
          .filter((v: any) => v.is_active !== false)
          .map((v: any) => ({
            id: v.id,
            variant_name: v.variant_name,
            sku: v.sku,
            price: v.price,
            is_active: v.is_active,
            is_focused_product: v.is_focused_product,
          }))
      : [],
  }));
}

export function useProductSearch(
  searchTerm: string,
  selectedCategory: string,
  offlineProducts: any[]
): {
  results: ProductSearchResult[];
  isSearching: boolean;
  needsMoreChars: boolean;
} {
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const reqIdRef = useRef(0);

  const term = (searchTerm || '').trim();
  const normalizedCategory = normalizeCategory(selectedCategory);
  const needsMoreChars = term.length > 0 && term.length < MIN_CHARS;

  // Keep latest offline list in a ref so it does NOT retrigger the search
  // effect on every parent render (which was a major source of UI lag).
  const offlineRef = useRef(offlineProducts);
  useEffect(() => {
    offlineRef.current = offlineProducts;
  }, [offlineProducts]);

  useEffect(() => {
    // Allow empty query — we still hit the server for the top 100 products
    // so the dropdown isn't limited to whatever is in the offline cache.
    if (term.length > 0 && term.length < MIN_CHARS) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const key = cacheKey(term, normalizedCategory);
    const cached = cacheGet(key);
    if (cached) {
      setResults(cached);
      setIsSearching(false);
      return;
    }

    // Show offline matches immediately while waiting on the server
    const localPreview = offlineFilter(offlineRef.current, term, normalizedCategory);
    if (localPreview.length > 0) setResults(localPreview);
    else if (term.length === 0) setResults([]);

    setIsSearching(true);
    const myReq = ++reqIdRef.current;

    const handle = setTimeout(
      async () => {
        // Offline -> stay with local results, don't hit network
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          if (reqIdRef.current === myReq) {
            setResults(localPreview);
            setIsSearching(false);
          }
          return;
        }

        try {
          const { data, error } = await supabase.rpc('search_products_for_order', {
            p_query: term,
            p_category:
              normalizedCategory && normalizedCategory !== 'all' ? normalizedCategory : null,
            p_limit: PAGE_SIZE,
          });

          if (reqIdRef.current !== myReq) return; // stale

          if (error) {
            console.warn(
              '[useProductSearch] RPC error, trying direct query fallback:',
              error.message,
            );
            // Direct fast fallback against products table (RPC sometimes
            // hits statement timeout because of heavy UOM joins).
            const rows = await directProductSearch(term, normalizedCategory);
            if (reqIdRef.current !== myReq) return;
            if (rows && rows.length > 0) {
              cacheSet(key, rows);
              setResults(rows);
            } else {
              setResults(localPreview);
            }
          } else {
            const rows = (data || []) as unknown as ProductSearchResult[];
            cacheSet(key, rows);
            setResults(rows);
          }
        } catch (e) {
          if (reqIdRef.current !== myReq) return;
          console.warn('[useProductSearch] search failed, using local fallback', e);
          setResults(localPreview);
        } finally {
          if (reqIdRef.current === myReq) setIsSearching(false);
        }
      },
      term.length === 0 ? 0 : DEBOUNCE_MS,
    );

    return () => clearTimeout(handle);
  }, [term, normalizedCategory]);

  return { results, isSearching, needsMoreChars };
}
