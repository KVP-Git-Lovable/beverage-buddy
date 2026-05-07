## Why Order Entry is slow today

Confirmed against the running project:

- `products` has **20,234 rows** (20,228 active); `product_variants` and `product_schemes` are 0 today but the code still loads them.
- `useOfflineOrderEntry` (used by `OrderEntry.tsx`) loads the whole catalog into React state and into IndexedDB on every visit:
  - Reads all ~20k rows from IDB and pushes them into a single React state array.
  - Then in the background re-pages all 20k rows from Supabase, **clears** the IDB store, and re-writes 20k rows one by one. The flood of `✅ Saved to products` in the console is exactly this.
- `OrderEntry.tsx` runs many `products.forEach` / `products.filter` / `products.find` passes on the 20k array for cart totals, selection details, scheme matching, voice matching — every render scans the whole catalog.
- `ProductPickerPopover` already uses the server RPC `search_products_for_order` (with `gin_trgm_ops` indexes on `name` / `sku`), so search is the cheap part. The expensive parts are the full-catalog load + write + render loops.

Goal: keep offline ordering and offline search fully working, but stop ever holding the full 20k catalog in React or rewriting it in IDB on every visit.

## Plan

### 1. Lightweight offline search catalog (new IDB store)

- New IDB object store: `products_lite`. Per row only: `id, sku, name, brand, category_name, unit, default_uom, gst, rate, is_active, is_focused_product, search_keywords, updated_at`.
- New SECURITY DEFINER RPC `sync_products_lite_delta(p_since timestamptz, p_limit int)` returning the same shape (joins `product_categories.name`, computes a normalized `search_keywords` from name+sku+brand). Indexes used: existing trigram + a new `products(updated_at)` index.
- First sync pages everything (~20k rows × ~12 fields ≈ small) and stores it.
- Subsequent syncs only fetch rows where `updated_at > watermark`. Watermark stored under a `meta` IDB key. Deleted/`is_active=false` rows are removed from the lite store.
- Offline search runs against `products_lite` using a substring/keyword filter so single letters like `U`, `M`, `L`, `Z` work instantly without network. Online search continues to call `search_products_for_order` (server is faster on 20k rows).

### 2. Stop loading full catalog into React

Replace `useOfflineOrderEntry`'s "all products in state" model with a **working set**:

- Focused products (`is_focused_product = true`).
- Last N products this rep ordered (mined from local order history / IDB).
- Cart products (always hydrated from `products_lite` first, then fetched on demand if missing).
- Currently visible page in grid mode.

Anything outside that working set is fetched on demand (RPC by id, or via search). No code path returns "all products" anymore.

### 3. Lazy-load heavy product details

- New RPC `get_product_details(p_id uuid)` returning the heavy bits: schemes, variants, full UOM rows, current stock, price-list overrides.
- React Query hook `useProductDetails(productId)` with `staleTime: 5m` is called only when:
  - User picks the product in the picker / grid.
  - Cart row needs scheme/UOM math.
  - Voice/chat assistant resolves a match and needs to add it.
- `useProductUnits` / `useUnitPrice` continue to work — they already lazy-load per product.

### 4. Delta sync, never full clear

- `useOfflineOrderEntry`'s background sync is rewritten:
  - Reads watermark from IDB.
  - Calls `sync_products_lite_delta` (paginated by `updated_at`).
  - Writes only changed rows; never `clear()` the store.
  - Skips entirely if 0 changed rows.
  - Runs only on `requestIdleCallback` and skips on `slow-2g`/`2g`/`saveData` connections.
- Schemes & variants are NOT bulk-synced anymore. They're fetched per product by `get_product_details`. (When schemes/variants come back into use this still scales because we only fetch what the rep touches.)

### 5. Pagination & virtualization

- Grid mode: server-paginated (50 per page) using `search_products_for_order` with category + page params (or a small `list_products_lite` RPC). Today's client-side pagination over 20k stays only as a fallback when offline (paginating the lite store).
- Table mode: keep the picker (already server-driven). Cart list is small and unaffected.
- Add `react-window`-based virtualization to the grid view so only ~15 cards mount even on tablets.

### 6. Make hot render paths O(cart), not O(catalog)

In `OrderEntry.tsx`:

- `getSelectionValue`, `getSelectionItemCount`, `getSelectionDetails` will iterate `cart` / `Object.keys(quantities)` instead of `products`. For grid mode, derive from `quantities` + a `productsById` Map populated only with touched products.
- Voice/chat ordering's `products.find(...)` is replaced with a search call (`search_products_for_order`) plus `productsById` cache.
- Memoize a `productsById` Map across renders; never reduce/forEach the full catalog.

### 7. Slow-network resilience

- All RPC calls (search, lite delta, details) get a 6 s timeout with fallback to `products_lite` for search and to cached details for product info.
- Order placement path (`useOfflineOrderEntry.submitOrder` + `offlineOrderUtils.placeOrderWithOfflineSupport`) is **untouched** — offline order creation, queueing, and sync stay identical.
- A "stale offline catalog" banner shows if `products_lite` watermark is older than 7 days.

### 8. Database changes

A single migration:

- `CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at);`
- `CREATE OR REPLACE FUNCTION public.sync_products_lite_delta(p_since timestamptz, p_limit int) RETURNS TABLE(...)` — SECURITY DEFINER, returns lite columns + category_name + search_keywords; respects RLS by being callable by `authenticated`.
- `CREATE OR REPLACE FUNCTION public.get_product_details(p_id uuid) RETURNS jsonb` — bundles product + variants + schemes + price-list overrides + stock.
- Both functions follow the project convention (`p_` prefix, `SET search_path = public`, explicit `GRANT EXECUTE ... TO authenticated, anon`).
- Drops any older overloaded signatures explicitly.

### 9. Files expected to change

- `src/lib/offlineStorage.ts` — add `STORES.PRODUCTS_LITE` and a `meta` key for the watermark.
- `src/hooks/useOfflineOrderEntry.ts` — rewrite to working-set model + delta sync; expose `getProductById`, `searchProducts`, `getRecentlyOrderedProducts`.
- `src/hooks/useProductSearch.ts` — add an offline branch that queries `products_lite` (LIKE / token match) when offline or RPC times out; expose `getById` for cart hydration.
- `src/hooks/useProductDetails.ts` — new, wraps `get_product_details`.
- `src/utils/offlineOrderUtils.ts` — `fetchProductsWithOfflineSupport` becomes lite-aware; remove the full re-write path.
- `src/utils/backgroundProductPrefetch.ts` — prefetch the lite catalog only.
- `src/pages/OrderEntry.tsx` — cart-driven totals, `productsById` map, virtualized grid, paginated grid fetch. UI/visuals unchanged.
- `src/components/order-entry/ProductPickerPopover.tsx` — minor: use `useProductDetails` when an option is picked.
- `supabase/migrations/<new>.sql` — RPCs + index.

### 10. Validation (after implementation)

- `/order-entry` cold open: < 1.5 s on a normal connection, no `Loading products...` flash.
- Console no longer shows the burst of `✅ Saved to products` on every open — only when there are real updates.
- Network: 1 small lite-delta RPC + 1 RPC per debounced keystroke, plus 1 details RPC per product picked.
- Offline (devtools "Offline"):
  - Page opens, grid is paginated from `products_lite`.
  - Search for `U`, `M`, `L`, `Z` returns matches instantly.
  - Order placement still queues and syncs as before.
- Voice/chat ordering still resolves products and adds them to cart (via `search_products_for_order` + `get_product_details`).
- Schemes / UOM math unchanged — they always fetched per product anyway.

### Out of scope

- No change to the order placement / sync queue logic.
- No change to schemes calculator, UOM engine, or invoice generation.
- No UI redesign of Order Entry.
