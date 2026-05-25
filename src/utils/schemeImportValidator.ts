// Bulk Import Schemes - validation + payload building
// Pure functions, no Supabase calls.

export const ALLOWED_SCHEME_TYPES = [
  'percentage_discount',
  'flat_discount',
  'buy_x_get_y_free',
  'bundle_combo',
  'tiered_discount',
  'time_based_offer',
  'first_order_discount',
  'category_wide_discount',
] as const;

export type SchemeType = typeof ALLOWED_SCHEME_TYPES[number];

export interface RawImportRow {
  [key: string]: any;
}

export interface ValidatedRow {
  rowIndex: number; // 1-based, matches Excel row (header = 1)
  raw: RawImportRow;
  status: 'ready' | 'error';
  errors: string[];
  payload?: Record<string, any>;
}

export interface LookupMaps {
  skuToProductId: Map<string, string>;
  categoryNameToId: Map<string, string>;
}

const norm = (v: any) => (v == null ? '' : String(v).trim());
const lower = (v: any) => norm(v).toLowerCase();

const toBool = (v: any): boolean => {
  const s = lower(v);
  if (['true', '1', 'yes', 'y', 'active'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'inactive', ''].includes(s)) return false;
  return Boolean(v);
};

const toNum = (v: any): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// Convert Excel date serial OR string into YYYY-MM-DD; returns null when blank, '' when invalid.
const toISODate = (v: any): string | null => {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') {
    // Excel serial date (days since 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }
  const s = norm(v);
  if (isISODate(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export function validateRow(
  raw: RawImportRow,
  rowIndex: number,
  lookups: LookupMaps,
): ValidatedRow {
  const errors: string[] = [];
  const get = (k: string) => raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];

  const sku = norm(get('sku'));
  const name = norm(get('scheme_name'));
  const type = lower(get('scheme_type')) as SchemeType;
  const startDate = toISODate(get('start_date'));
  const endDate = toISODate(get('end_date'));
  const isActive = get('is_active') === undefined || get('is_active') === '' ? true : toBool(get('is_active'));

  if (!sku) errors.push('sku is required');
  if (!name) errors.push('scheme_name is required');
  if (!type) errors.push('scheme_type is required');
  else if (!ALLOWED_SCHEME_TYPES.includes(type)) errors.push(`scheme_type "${type}" is not valid`);

  if (startDate === '') errors.push('start_date is invalid (use YYYY-MM-DD)');
  if (endDate === '') errors.push('end_date is invalid (use YYYY-MM-DD)');
  if (startDate && endDate && startDate > endDate) errors.push('start_date must be <= end_date');

  const productId = sku ? lookups.skuToProductId.get(sku.toLowerCase()) : undefined;
  if (sku && !productId) errors.push(`SKU "${sku}" not found in products`);

  const payload: Record<string, any> = {
    product_id: productId ?? null,
    name,
    description: norm(get('description')) || null,
    scheme_type: type,
    is_active: isActive,
    start_date: startDate || null,
    end_date: endDate || null,
    priority: toNum(get('priority')) ?? 0,
    min_order_value: toNum(get('min_order_value')) ?? 0,
    show_in_portal: get('show_in_portal') === undefined ? false : toBool(get('show_in_portal')),
    applicability_type: lower(get('applicability_type')) || 'global',
    source: 'bulk_import',
  };

  // Type-specific validation
  switch (type) {
    case 'percentage_discount':
    case 'time_based_offer':
    case 'first_order_discount':
    case 'category_wide_discount': {
      const pct = toNum(get('discount_percentage'));
      if (pct == null || Number.isNaN(pct)) errors.push('discount_percentage is required');
      else if (pct < 0 || pct > 100) errors.push('discount_percentage must be 0-100');
      payload.discount_percentage = pct;
      if (type === 'percentage_discount') {
        payload.condition_quantity = toNum(get('condition_quantity')) ?? 0;
        payload.quantity_condition_type = lower(get('quantity_condition_type')) || 'more_than';
      }
      if (type === 'first_order_discount') {
        payload.is_first_order_only = get('is_first_order_only') === undefined ? true : toBool(get('is_first_order_only'));
      }
      if (type === 'category_wide_discount') {
        const catName = norm(get('category_name'));
        if (!catName) errors.push('category_name is required for category_wide_discount');
        else {
          const catId = lookups.categoryNameToId.get(catName.toLowerCase());
          if (!catId) errors.push(`category_name "${catName}" not found`);
          else payload.category_id = catId;
        }
      }
      break;
    }

    case 'flat_discount': {
      const amt = toNum(get('discount_amount'));
      if (amt == null || Number.isNaN(amt)) errors.push('discount_amount is required');
      else if (amt < 0) errors.push('discount_amount must be >= 0');
      payload.discount_amount = amt;
      payload.condition_quantity = toNum(get('condition_quantity')) ?? 0;
      payload.quantity_condition_type = lower(get('quantity_condition_type')) || 'more_than';
      break;
    }

    case 'buy_x_get_y_free': {
      const buyQ = toNum(get('buy_quantity'));
      const freeQ = toNum(get('free_quantity'));
      if (buyQ == null || Number.isNaN(buyQ) || buyQ <= 0) errors.push('buy_quantity must be > 0');
      if (freeQ == null || Number.isNaN(freeQ) || freeQ <= 0) errors.push('free_quantity must be > 0');
      payload.buy_quantity = buyQ;
      payload.free_quantity = freeQ;
      payload.buy_quantity_unit = norm(get('buy_quantity_unit')) || 'kg';
      payload.free_quantity_unit = norm(get('free_quantity_unit')) || 'kg';

      const freeSku = norm(get('free_product_sku'));
      if (!freeSku || lower(freeSku) === 'same') {
        // Use same product (matches existing calculator's 'same' semantics)
        payload.free_product_id = productId ?? null;
      } else {
        const freeId = lookups.skuToProductId.get(freeSku.toLowerCase());
        if (!freeId) errors.push(`free_product_sku "${freeSku}" not found`);
        else payload.free_product_id = freeId;
      }
      break;
    }

    case 'bundle_combo': {
      const skusStr = norm(get('bundle_product_skus'));
      if (!skusStr) errors.push('bundle_product_skus is required (semicolon-separated)');
      const skus = skusStr.split(/[;,]/).map(s => s.trim()).filter(Boolean);
      const ids: string[] = [];
      const missing: string[] = [];
      for (const s of skus) {
        const id = lookups.skuToProductId.get(s.toLowerCase());
        if (id) ids.push(id);
        else missing.push(s);
      }
      if (missing.length) errors.push(`bundle SKUs not found: ${missing.join(', ')}`);
      payload.bundle_product_ids = ids;
      payload.bundle_discount_percentage = toNum(get('bundle_discount_percentage')) ?? 0;
      payload.bundle_discount_amount = toNum(get('bundle_discount_amount')) ?? 0;
      if (!payload.bundle_discount_percentage && !payload.bundle_discount_amount) {
        errors.push('bundle_combo requires bundle_discount_percentage or bundle_discount_amount');
      }
      break;
    }

    case 'tiered_discount': {
      const j = norm(get('tier_data_json'));
      if (!j) errors.push('tier_data_json is required');
      else {
        try {
          const parsed = JSON.parse(j);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            errors.push('tier_data_json must be a non-empty JSON array');
          } else {
            for (const t of parsed) {
              if (typeof t.min_qty !== 'number' || typeof t.max_qty !== 'number' || typeof t.discount_percentage !== 'number') {
                errors.push('each tier needs numeric min_qty, max_qty, discount_percentage');
                break;
              }
            }
            payload.tier_data = parsed;
          }
        } catch {
          errors.push('tier_data_json is not valid JSON');
        }
      }
      break;
    }
  }

  return {
    rowIndex,
    raw,
    status: errors.length ? 'error' : 'ready',
    errors,
    payload: errors.length ? undefined : payload,
  };
}

export function collectLookupKeys(rows: RawImportRow[]) {
  const skus = new Set<string>();
  const cats = new Set<string>();
  for (const r of rows) {
    const sku = norm(r['sku'] ?? r['SKU']);
    if (sku) skus.add(sku);
    const freeSku = norm(r['free_product_sku']);
    if (freeSku && lower(freeSku) !== 'same') skus.add(freeSku);
    const bundle = norm(r['bundle_product_skus']);
    if (bundle) bundle.split(/[;,]/).map(s => s.trim()).filter(Boolean).forEach(s => skus.add(s));
    const cat = norm(r['category_name']);
    if (cat) cats.add(cat);
  }
  return { skus: [...skus], categories: [...cats] };
}
