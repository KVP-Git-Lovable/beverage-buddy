import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  deriveProductMappings,
  loadEnabledUnits,
  clearUomCache,
  type UomCategory,
} from '@/lib/uomEngine';
import { downloadExcel } from '@/utils/fileDownloader';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Bulk importer for Step 1 — Base Unit Setup fields + GST%.
 * Matches existing products by SKU and rewrites their product_uom_mapping
 * using the same derive engine the manual editor uses.
 *
 * Template columns (one sample row included):
 *   sku, base_category, physical_size, price_basis_unit_code,
 *   default_sales_unit_code, default_purchase_unit_code, gst_percentage
 */

type RowResult = {
  sku: string;
  status: 'success' | 'skipped' | 'error';
  message?: string;
};

interface ImportRow {
  sku: string;
  name: string;
  rate_per_unit: number | null;
  unit: string;
  base_category: string;
  physical_size: number | null;
  price_basis_unit_code: string;
  default_sales_unit_code: string;
  default_purchase_unit_code: string;
  gst_percentage: number | null;
}

const TEMPLATE_HEADERS = [
  'sku',
  'name',
  'rate_per_unit',
  'unit',
  'gst_percentage',
  'base_category',
  'physical_size',
  'price_basis_unit_code',
  'default_sales_unit_code',
  'default_purchase_unit_code',
];

const SAMPLE_ROWS = [
  {
    sku: 'SKU-SAMPLE-001',
    name: 'Sample Tea 250g',
    rate_per_unit: 200,
    unit: 'kg',
    gst_percentage: 18,
    base_category: 'Weight',
    physical_size: 250,
    price_basis_unit_code: 'KG',
    default_sales_unit_code: 'GRAM',
    default_purchase_unit_code: 'KG',
  },
  {
    sku: 'SKU-SAMPLE-002',
    name: 'Sample Juice 1L',
    rate_per_unit: 120,
    unit: 'litre',
    gst_percentage: 12,
    base_category: 'Volume',
    physical_size: 1000,
    price_basis_unit_code: 'LITRE',
    default_sales_unit_code: 'ML',
    default_purchase_unit_code: 'LITRE',
  },
  {
    sku: 'SKU-SAMPLE-003',
    name: 'Sample Soap Bar',
    rate_per_unit: 35,
    unit: 'piece',
    gst_percentage: 18,
    base_category: 'Quantity',
    physical_size: '',
    price_basis_unit_code: 'PIECE',
    default_sales_unit_code: 'PIECE',
    default_purchase_unit_code: 'PIECE',
  },
];

const NORMALISED_CATEGORIES: Record<string, UomCategory> = {
  weight: 'Weight',
  volume: 'Volume',
  quantity: 'Quantity',
  qty: 'Quantity',
};

interface Props {
  onImported?: () => void;
}

// Retry a Supabase call when the browser/network throws a transient
// "Failed to fetch" / NetworkError. Each retry waits a bit longer.
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message ?? err ?? '');
      const transient =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('network') ||
        msg.includes('fetch');
      if (!transient || i === attempts - 1) {
        throw new Error(`${label}: ${msg || 'unknown error'}`);
      }
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

export const ProductDataImportButton = ({ onImported }: Props) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<RowResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    // Pull up to 3 real existing products so users see live SKUs in the template
    // rather than a fictional example.
    let sampleRows: Array<Record<string, unknown>> = [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select(
          'sku, name, rate, unit, base_unit_category, net_weight_g, net_volume_ml, gst_percentage, price_basis_uom:price_basis_uom_id(code), default_sales_uom:default_sales_uom_id(code), default_purchase_uom:default_purchase_uom_id(code)'
        )
        .not('sku', 'is', null)
        .neq('sku', '')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(3);
      if (error) throw error;
      sampleRows = (data ?? []).map((p: any) => {
        const cat = (p.base_unit_category ?? 'Quantity') as string;
        const physical =
          cat === 'Weight'
            ? p.net_weight_g ?? ''
            : cat === 'Volume'
              ? p.net_volume_ml ?? ''
              : '';
        return {
          sku: p.sku,
          name: p.name ?? '',
          rate_per_unit: p.rate ?? '',
          unit: p.unit ?? '',
          gst_percentage: p.gst_percentage ?? '',
          base_category: cat,
          physical_size: physical,
          price_basis_unit_code: p.price_basis_uom?.code ?? '',
          default_sales_unit_code: p.default_sales_uom?.code ?? '',
          default_purchase_unit_code: p.default_purchase_uom?.code ?? '',
        };
      });
    } catch (err) {
      console.warn('[ProductDataImport] could not load sample SKUs, using placeholder', err);
    }
    if (sampleRows.length === 0) sampleRows = SAMPLE_ROWS as Array<Record<string, unknown>>;
    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: TEMPLATE_HEADERS });
    // Add a small notes sheet so users know the rules.
    const notes = XLSX.utils.aoa_to_sheet([
      ['Field', 'Rules'],
      ['sku', 'Must match an existing product SKU exactly (case-sensitive).'],
      ['name', 'Product display name. Updated on the matched product if provided.'],
      ['rate_per_unit', 'Selling rate as a number, expressed per the unit column (e.g. 200).'],
      ['unit', 'Free-text display unit shown on the product (e.g. kg, litre, piece).'],
      ['gst_percentage', 'GST rate as a number (e.g. 5, 12, 18, 28). Leave blank to skip.'],
      ['base_category', 'One of: Weight, Volume, Quantity'],
      [
        'physical_size',
        'Weight → grams per piece (e.g. 250). Volume → ml per piece. Leave blank for Quantity.',
      ],
      [
        'price_basis_unit_code',
        'UOM code the rate is quoted in (e.g. KG, LITRE, PIECE). Must be enabled in UOM Master.',
      ],
      [
        'default_sales_unit_code',
        'UOM code shown in Order Entry by default (e.g. GRAM, ML, PIECE).',
      ],
      [
        'default_purchase_unit_code',
        'UOM code used for GRN/purchase entry. Defaults to the sales unit if blank.',
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.utils.book_append_sheet(wb, notes, 'Instructions');
    await downloadExcel(wb, 'product_data_import_template', XLSX);
  };

  const parseFile = (file: File): Promise<ImportRow[]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const sheetName =
            wb.SheetNames.find((n) => n.toLowerCase() === 'products') ?? wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
          const rows: ImportRow[] = raw
            .map((r) => ({
              sku: String(r['sku'] ?? '').trim(),
              base_category: String(r['base_category'] ?? '').trim(),
              physical_size:
                r['physical_size'] === '' || r['physical_size'] == null
                  ? null
                  : Number(r['physical_size']),
              price_basis_unit_code: String(r['price_basis_unit_code'] ?? '')
                .trim()
                .toUpperCase(),
              default_sales_unit_code: String(r['default_sales_unit_code'] ?? '')
                .trim()
                .toUpperCase(),
              default_purchase_unit_code: String(r['default_purchase_unit_code'] ?? '')
                .trim()
                .toUpperCase(),
              gst_percentage:
                r['gst_percentage'] === '' || r['gst_percentage'] == null
                  ? null
                  : Number(r['gst_percentage']),
            }))
            .filter((r) => r.sku);
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });

  const processRow = async (
    row: ImportRow,
    skuToProductId: Map<string, string>,
  ): Promise<RowResult> => {
    const productId = skuToProductId.get(row.sku);
    if (!productId) {
      return { sku: row.sku, status: 'skipped', message: 'SKU not found in products' };
    }

    const category = NORMALISED_CATEGORIES[row.base_category.toLowerCase()];
    if (!category) {
      return {
        sku: row.sku,
        status: 'error',
        message: `Invalid base_category "${row.base_category}". Use Weight, Volume or Quantity.`,
      };
    }

    if (category !== 'Quantity' && (!row.physical_size || row.physical_size <= 0)) {
      return {
        sku: row.sku,
        status: 'error',
        message: 'physical_size is required (>0) for Weight/Volume products.',
      };
    }

    if (!row.price_basis_unit_code || !row.default_sales_unit_code) {
      return {
        sku: row.sku,
        status: 'error',
        message: 'price_basis_unit_code and default_sales_unit_code are required.',
      };
    }

    try {
      const baseCatUnits = await withRetry(
        () => loadEnabledUnits(category),
        'load enabled units',
      );
      const derived = deriveProductMappings({
        category,
        netWeightG: category === 'Weight' ? row.physical_size : null,
        netVolumeMl: category === 'Volume' ? row.physical_size : null,
        baseCategoryUnits: baseCatUnits.map((u) => ({
          uomId: u.uomId,
          code: u.code,
          name: u.name,
        })),
        packagingRows: [],
        priceBasisCode: row.price_basis_unit_code,
        defaultSalesCode: row.default_sales_unit_code,
        defaultPurchaseCode: row.default_purchase_unit_code || row.default_sales_unit_code,
      });

      // Verify the requested codes resolved to actual rows.
      const priceRow = derived.find((r) => r.isPriceBasis);
      const salesRow = derived.find((r) => r.isDefaultSales);
      if (!priceRow) {
        return {
          sku: row.sku,
          status: 'error',
          message: `price_basis_unit_code "${row.price_basis_unit_code}" not enabled in UOM Master for ${category}.`,
        };
      }
      if (!salesRow) {
        return {
          sku: row.sku,
          status: 'error',
          message: `default_sales_unit_code "${row.default_sales_unit_code}" not enabled in UOM Master for ${category}.`,
        };
      }
      const purchaseRow = derived.find((r) => r.isDefaultPurchase) ?? salesRow;

      // Wipe and rewrite product_uom_mapping (same strategy as manual editor).
      await withRetry(async () => {
        const { error: delErr } = await supabase
          .from('product_uom_mapping')
          .delete()
          .eq('product_id', productId);
        if (delErr) throw delErr;
      }, 'delete existing UOM rows');

      await withRetry(async () => {
        const { error: insErr } = await supabase.from('product_uom_mapping').insert(
          derived.map((r) => ({
            product_id: productId,
            uom_id: r.uomId,
            conversion_to_base: r.conversionToBase,
            is_base: r.isBase,
            is_default_sales: r.isDefaultSales,
            is_price_basis: r.isPriceBasis,
            is_default_purchase: r.isDefaultPurchase,
          })) as any,
        );
        if (insErr) throw insErr;
      }, 'insert new UOM rows');

      // Patch product-level columns.
      const productPatch: Record<string, unknown> = {
        base_unit_category: category,
        net_weight_g: category === 'Weight' ? row.physical_size : null,
        net_volume_ml: category === 'Volume' ? row.physical_size : null,
        price_basis_uom_id: priceRow.uomId,
        default_sales_uom_id: salesRow.uomId,
        default_purchase_uom_id: purchaseRow.uomId,
      };
      if (row.gst_percentage != null && !Number.isNaN(row.gst_percentage)) {
        productPatch.gst_percentage = row.gst_percentage;
      }

      await withRetry(async () => {
        const { error: patchErr } = await supabase
          .from('products')
          .update(productPatch as any)
          .eq('id', productId);
        if (patchErr) throw patchErr;
      }, 'update product');

      clearUomCache(productId);
      queryClient.invalidateQueries({ queryKey: ['uom', 'product', productId] });

      return { sku: row.sku, status: 'success' };
    } catch (err: any) {
      console.error('[ProductDataImport] row failed', row.sku, err);
      return { sku: row.sku, status: 'error', message: err?.message ?? String(err) };
    }
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setResults([]);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.error('No rows found in the uploaded file.');
        return;
      }

      // Pre-fetch all matching product IDs in chunks (resilient to network blips).
      const skus = Array.from(new Set(rows.map((r) => r.sku)));
      const skuToId = new Map<string, string>();
      const CHUNK = 200;
      for (let i = 0; i < skus.length; i += CHUNK) {
        const slice = skus.slice(i, i + CHUNK);
        // eslint-disable-next-line no-await-in-loop
        const products = await withRetry(async () => {
          const { data, error } = await supabase
            .from('products')
            .select('id, sku')
            .in('sku', slice);
          if (error) throw error;
          return data ?? [];
        }, 'lookup products by SKU');
        for (const p of products as any[]) skuToId.set(p.sku, p.id);
      }

      const out: RowResult[] = [];
      for (const r of rows) {
        // eslint-disable-next-line no-await-in-loop
        const res = await processRow(r, skuToId);
        out.push(res);
      }
      setResults(out);

      const ok = out.filter((r) => r.status === 'success').length;
      const skipped = out.filter((r) => r.status === 'skipped').length;
      const errored = out.filter((r) => r.status === 'error').length;
      if (ok > 0) toast.success(`Updated ${ok} product${ok === 1 ? '' : 's'}.`);
      if (skipped > 0) toast.message(`${skipped} SKU${skipped === 1 ? '' : 's'} not found.`);
      if (errored > 0) toast.error(`${errored} row${errored === 1 ? '' : 's'} failed validation.`);

      if (ok > 0) onImported?.();
    } catch (err: any) {
      toast.error(`Import failed: ${err?.message ?? err}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Import Product Data
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Product Data</DialogTitle>
            <DialogDescription>
              Bulk-update Base Unit Setup fields and GST% for existing products. Rows are
              matched to products by <span className="font-mono">sku</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-medium">1. Download the template</p>
              <p className="text-xs text-muted-foreground">
                Includes up to 3 existing SKUs from your catalog and an Instructions sheet
                with field rules.
              </p>
              <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-medium">2. Upload the filled file</p>
              <p className="text-xs text-muted-foreground">
                Accepts .xlsx, .xls or .csv. SKUs that don&apos;t match an existing product
                are skipped.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button
                size="sm"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {busy ? 'Importing…' : 'Choose File'}
              </Button>
            </div>

            {results.length > 0 && (
              <div className="rounded-lg border max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono">{r.sku}</td>
                        <td className="p-2">
                          <span
                            className={
                              r.status === 'success'
                                ? 'text-green-600'
                                : r.status === 'skipped'
                                  ? 'text-amber-600'
                                  : 'text-destructive'
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground">{r.message ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductDataImportButton;
