# Bulk Import Schemes

Add a **Bulk Import Schemes** flow to `/scheme-management` so admins can create promotional schemes for thousands of products via an Excel/CSV upload, with SKU-based matching against `public.products`.

## UI changes

1. In `src/components/SchemeMaster.tsx`, add a **Bulk Import** button next to the existing "Add Scheme" button.
2. Add a **Download Template** button that downloads a sample `.xlsx` with header row, one example row per supported scheme type, and an inline `Instructions` sheet.
3. Clicking **Bulk Import** opens a new modal `BulkImportSchemesModal.tsx` (pattern based on existing `BulkImportRetailersModal.tsx`).

## Modal flow (4 steps)

```text
[1 Upload] -> [2 Preview & Validate] -> [3 Confirm] -> [4 Result]
```

- **Step 1 – Upload**: drag/drop or pick `.xlsx` / `.csv`. Parse client-side with `xlsx` (already used in `import-retailer-ext-db`).
- **Step 2 – Preview**: show a virtualized table of parsed rows with per-row status:
  - `Ready` (SKU matched, all required fields valid)
  - `Error` (SKU not found, invalid scheme_type, missing required field for that type, bad date, bad number, free_product_sku not found, etc.)
  - Summary chips: Total / Ready / Errors / Duplicate SKUs in file.
  - Allow download of an **Errors-only CSV** for the user to fix and re-upload.
  - Toggle: *Skip rows with errors* (default on) vs *Abort if any error*.
- **Step 3 – Confirm**: choose conflict policy for SKUs that already have an active scheme with the same `name`:
  - `Skip duplicates` (default)
  - `Update existing` (match by `name + product_id`)
  - `Create anyway`
- **Step 4 – Result**: counts of inserted / updated / skipped / failed, with downloadable result CSV.

## Template columns (single sheet)

Required for every row: `sku`, `scheme_name`, `scheme_type`, `start_date`, `end_date`, `is_active`.

Type-specific (only those relevant to the row's `scheme_type` are read):

| Column | Used by |
|---|---|
| `discount_percentage` | percentage_discount, tiered_discount (ignored), time_based_offer, first_order_discount, category_wide_discount |
| `discount_amount` | flat_discount |
| `condition_quantity` | percentage_discount, flat_discount |
| `quantity_condition_type` (`more_than` / `less_than` / `equal_to`) | percentage_discount, flat_discount |
| `buy_quantity`, `free_quantity`, `buy_quantity_unit`, `free_quantity_unit`, `free_product_sku` (or literal `same`) | buy_x_get_y_free |
| `bundle_product_skus` (semicolon-separated), `bundle_discount_percentage`, `bundle_discount_amount` | bundle_combo |
| `tier_data_json` (JSON array `[{"min_qty":1,"max_qty":9,"discount_percentage":5}]`) | tiered_discount |
| `category_name` | category_wide_discount |
| `min_order_value` | category_wide_discount, others optional |
| `is_first_order_only` | first_order_discount |
| `priority`, `description`, `show_in_portal`, `applicability_type` | all (optional) |

## Validation rules

- `sku` must resolve to exactly one row in `products` (case-insensitive trim).
- `scheme_type` must be one of the 8 enums allowed by the existing `valid_scheme_type` CHECK constraint.
- `start_date <= end_date`, both ISO `YYYY-MM-DD`.
- Numbers parsed with `Number()`; reject `NaN`.
- For `buy_x_get_y_free`: `free_product_sku` is either `same` (stored as the literal string `'same'` in `free_product_id` is NOT valid – the column is uuid). To stay consistent with existing logic that compares `free_product_id === 'same'`, we will instead store `free_product_id = product_id` (same product) when the user writes `same`, and the resolved uuid otherwise.
- For `bundle_combo`: every SKU in `bundle_product_skus` must resolve; store the resolved uuids as `text[]` in `bundle_product_ids` (matching current column type).
- For `category_wide_discount`: `category_name` must resolve to one `product_categories.id`.

## Data fetching for matching

Before validation, the modal fetches in parallel:
- `products` rows for every distinct SKU in the upload (`.in('sku', [...])`, chunked at 500).
- `product_categories` for every distinct `category_name`.

Results are cached in `Map<string, uuid>` for O(1) per-row lookup.

## Insert strategy

- Build an array of `product_schemes` rows from validated entries.
- Chunked insert (500 per batch) via `supabase.from('product_schemes').insert(chunk)` with progress bar.
- On `Update existing` policy, run `select id from product_schemes where product_id = $1 and name = $2` first per row, then `upsert`.
- On any chunk error, surface `error.message` per failed row and continue (do not abort the whole import).

## Files to add / change

- **New** `src/components/BulkImportSchemesModal.tsx` (~500 lines): upload, parse, validate, preview table, confirm, insert, result.
- **New** `src/utils/schemeTemplateGenerator.ts`: builds the `.xlsx` template with header + example rows + Instructions sheet using `xlsx` (already a dep).
- **New** `src/utils/schemeImportValidator.ts`: pure functions `validateRow`, `buildSchemeInsertPayload`, `resolveLookups` (unit-testable).
- **Edit** `src/components/SchemeMaster.tsx`: add **Bulk Import** + **Download Template** buttons in the header, wire to the new modal, and call `loadSchemes()` after a successful import.

## Out of scope

- No database migrations – the existing `product_schemes` columns and RLS already support everything.
- No changes to `schemeCalculator.ts` – imported rows reuse the existing calculation paths.
- No background/edge-function processing; import runs client-side with chunked inserts (acceptable for a few thousand rows). If a user needs >10k rows we can later move to an edge function.
