// Generates the Bulk Import Schemes Excel template.
export const TEMPLATE_COLUMNS = [
  'sku',
  'scheme_name',
  'scheme_type',
  'description',
  'start_date',
  'end_date',
  'is_active',
  'priority',
  'show_in_portal',
  'applicability_type',
  'min_order_value',
  'discount_percentage',
  'discount_amount',
  'condition_quantity',
  'quantity_condition_type',
  'buy_quantity',
  'free_quantity',
  'buy_quantity_unit',
  'free_quantity_unit',
  'free_product_sku',
  'bundle_product_skus',
  'bundle_discount_percentage',
  'bundle_discount_amount',
  'tier_data_json',
  'category_name',
  'is_first_order_only',
];

const EXAMPLE_ROWS: Record<string, any>[] = [
  {
    sku: 'SKU-001',
    scheme_name: '10% off SKU-001',
    scheme_type: 'percentage_discount',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
    discount_percentage: 10,
    condition_quantity: 1,
    quantity_condition_type: 'more_than',
  },
  {
    sku: 'SKU-002',
    scheme_name: 'Flat 50 off',
    scheme_type: 'flat_discount',
    start_date: '2026-01-01',
    end_date: '2026-06-30',
    is_active: true,
    discount_amount: 50,
    condition_quantity: 2,
    quantity_condition_type: 'more_than',
  },
  {
    sku: 'SKU-003',
    scheme_name: 'Buy 2 Get 1 Free',
    scheme_type: 'buy_x_get_y_free',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
    buy_quantity: 2,
    free_quantity: 1,
    buy_quantity_unit: 'pcs',
    free_quantity_unit: 'pcs',
    free_product_sku: 'same',
  },
  {
    sku: 'SKU-004',
    scheme_name: 'Combo deal',
    scheme_type: 'bundle_combo',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
    bundle_product_skus: 'SKU-004;SKU-005;SKU-006',
    bundle_discount_percentage: 15,
  },
  {
    sku: 'SKU-007',
    scheme_name: 'Tiered volume',
    scheme_type: 'tiered_discount',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
    tier_data_json: '[{"min_qty":1,"max_qty":9,"discount_percentage":5},{"min_qty":10,"max_qty":49,"discount_percentage":10},{"min_qty":50,"max_qty":9999,"discount_percentage":15}]',
  },
  {
    sku: 'SKU-008',
    scheme_name: 'Happy Hour',
    scheme_type: 'time_based_offer',
    start_date: '2026-01-01',
    end_date: '2026-01-15',
    is_active: true,
    discount_percentage: 20,
  },
  {
    sku: 'SKU-009',
    scheme_name: 'Welcome offer',
    scheme_type: 'first_order_discount',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
    discount_percentage: 25,
    is_first_order_only: true,
  },
  {
    sku: 'SKU-010',
    scheme_name: 'Snacks category 10%',
    scheme_type: 'category_wide_discount',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
    discount_percentage: 10,
    category_name: 'Snacks',
    min_order_value: 500,
  },
];

const INSTRUCTIONS = [
  ['Bulk Import Schemes — Instructions'],
  [],
  ['1. Fill the "Schemes" sheet. One row per scheme.'],
  ['2. sku must match an existing product SKU exactly (case-insensitive).'],
  ['3. scheme_type must be one of:'],
  ['   percentage_discount, flat_discount, buy_x_get_y_free, bundle_combo,'],
  ['   tiered_discount, time_based_offer, first_order_discount, category_wide_discount'],
  ['4. Dates must be YYYY-MM-DD. is_active: true/false (default true).'],
  [],
  ['Type-specific columns:'],
  ['• percentage_discount: discount_percentage, condition_quantity, quantity_condition_type'],
  ['• flat_discount: discount_amount, condition_quantity, quantity_condition_type'],
  ['• buy_x_get_y_free: buy_quantity, free_quantity, free_product_sku ("same" or another SKU)'],
  ['• bundle_combo: bundle_product_skus (semicolon-separated), bundle_discount_percentage OR bundle_discount_amount'],
  ['• tiered_discount: tier_data_json — JSON array of {min_qty,max_qty,discount_percentage}'],
  ['• time_based_offer: discount_percentage (validity from start_date/end_date)'],
  ['• first_order_discount: discount_percentage, is_first_order_only'],
  ['• category_wide_discount: discount_percentage, category_name, min_order_value (optional)'],
  [],
  ['Tip: Download the template, replace the example rows with your data, and upload it back.'],
];

export async function downloadSchemeImportTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const sheet = XLSX.utils.json_to_sheet(EXAMPLE_ROWS, { header: TEMPLATE_COLUMNS });
  sheet['!cols'] = TEMPLATE_COLUMNS.map(c => ({ wch: Math.max(c.length + 2, 18) }));
  XLSX.utils.book_append_sheet(wb, sheet, 'Schemes');

  const ins = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  ins['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, ins, 'Instructions');

  XLSX.writeFile(wb, 'Scheme_Import_Template.xlsx');
}

export async function downloadErrorsCsv(rows: { rowIndex: number; raw: any; errors: string[] }[]) {
  const XLSX = await import('xlsx');
  const data = rows.map(r => ({
    row: r.rowIndex,
    errors: r.errors.join(' | '),
    ...r.raw,
  }));
  const sheet = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Errors');
  XLSX.writeFile(wb, 'Scheme_Import_Errors.xlsx');
}
