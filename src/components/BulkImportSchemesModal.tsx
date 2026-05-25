import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  validateRow,
  collectLookupKeys,
  ValidatedRow,
  LookupMaps,
  RawImportRow,
} from '@/utils/schemeImportValidator';
import { downloadSchemeImportTemplate, downloadErrorsCsv } from '@/utils/schemeTemplateGenerator';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'result';
type ConflictPolicy = 'skip' | 'update' | 'create';

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: { rowIndex: number; message: string }[];
}

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const BulkImportSchemesModal = ({ open, onOpenChange, onSuccess }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [policy, setPolicy] = useState<ConflictPolicy>('skip');
  const [skipErrors, setSkipErrors] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setStep('upload');
    setFileName(null);
    setRows([]);
    setParseError(null);
    setValidating(false);
    setImporting(false);
    setProgress(0);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onOpenChange(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setValidating(true);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('scheme')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json: RawImportRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!json.length) {
        setParseError('No rows found in the sheet.');
        setValidating(false);
        return;
      }

      // Fetch lookups
      const { skus, categories } = collectLookupKeys(json);
      const skuToProductId = new Map<string, string>();
      const categoryNameToId = new Map<string, string>();

      for (const c of chunk(skus, 500)) {
        if (!c.length) continue;
        const { data } = await supabase.from('products').select('id, sku').in('sku', c);
        (data || []).forEach((p: any) => p.sku && skuToProductId.set(String(p.sku).toLowerCase(), p.id));
      }
      if (categories.length) {
        const { data } = await supabase.from('product_categories').select('id, name').in('name', categories);
        (data || []).forEach((c: any) => c.name && categoryNameToId.set(String(c.name).toLowerCase(), c.id));
      }

      const lookups: LookupMaps = { skuToProductId, categoryNameToId };
      const validated = json.map((r, i) => validateRow(r, i + 2, lookups)); // +2 = header row offset
      setRows(validated);
      setFileName(file.name);
      setStep('preview');
    } catch (err: any) {
      console.error('Parse error:', err);
      setParseError(err?.message || 'Failed to parse file');
    } finally {
      setValidating(false);
    }
  };

  const stats = {
    total: rows.length,
    ready: rows.filter(r => r.status === 'ready').length,
    errors: rows.filter(r => r.status === 'error').length,
  };

  const runImport = async () => {
    const eligible = rows.filter(r => r.status === 'ready' && r.payload);
    if (!eligible.length) {
      toast.error('No valid rows to import');
      return;
    }
    if (!skipErrors && stats.errors > 0) {
      toast.error('Fix errors or enable "Skip rows with errors"');
      return;
    }

    setImporting(true);
    setProgress(0);
    const res: ImportResult = { inserted: 0, updated: 0, skipped: 0, failed: 0, failures: [] };

    try {
      // Handle conflicts based on policy
      const toInsert: any[] = [];
      const toUpdate: { id: string; payload: any; rowIndex: number }[] = [];

      if (policy === 'create') {
        toInsert.push(...eligible.map(r => r.payload));
      } else {
        // Look up existing schemes by (product_id, name)
        const keys = eligible
          .filter(r => r.payload?.product_id && r.payload?.name)
          .map(r => ({ product_id: r.payload!.product_id, name: r.payload!.name, rowIndex: r.rowIndex, payload: r.payload }));

        const productIds = [...new Set(keys.map(k => k.product_id))];
        const names = [...new Set(keys.map(k => k.name))];
        const existing = new Map<string, string>(); // key: pid|name -> scheme id

        for (const pidChunk of chunk(productIds, 200)) {
          const { data } = await supabase
            .from('product_schemes')
            .select('id, product_id, name')
            .in('product_id', pidChunk)
            .in('name', names);
          (data || []).forEach((s: any) => existing.set(`${s.product_id}|${s.name}`, s.id));
        }

        for (const k of keys) {
          const existingId = existing.get(`${k.product_id}|${k.name}`);
          if (existingId) {
            if (policy === 'skip') {
              res.skipped++;
            } else {
              toUpdate.push({ id: existingId, payload: k.payload, rowIndex: k.rowIndex });
            }
          } else {
            toInsert.push(k.payload);
          }
        }
      }

      const totalOps = toInsert.length + toUpdate.length;
      let done = 0;

      // Insert in chunks
      for (const c of chunk(toInsert, 200)) {
        const { error, data } = await supabase.from('product_schemes').insert(c).select('id');
        if (error) {
          res.failed += c.length;
          res.failures.push({ rowIndex: 0, message: `Insert batch failed: ${error.message}` });
        } else {
          res.inserted += data?.length || c.length;
        }
        done += c.length;
        setProgress(Math.round((done / Math.max(totalOps, 1)) * 100));
      }

      // Updates (one-by-one — usually small)
      for (const u of toUpdate) {
        const { error } = await supabase.from('product_schemes').update(u.payload).eq('id', u.id);
        if (error) {
          res.failed++;
          res.failures.push({ rowIndex: u.rowIndex, message: error.message });
        } else {
          res.updated++;
        }
        done++;
        setProgress(Math.round((done / Math.max(totalOps, 1)) * 100));
      }

      if (skipErrors) res.skipped += stats.errors;

      setResult(res);
      setStep('result');
      if (res.inserted || res.updated) {
        toast.success(`Imported ${res.inserted} new, updated ${res.updated}`);
        onSuccess();
      } else if (res.failed) {
        toast.error('Import completed with failures');
      } else {
        toast.info('Nothing imported');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Schemes
          </DialogTitle>
        </DialogHeader>

        {/* STEP: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Upload an Excel (.xlsx) or CSV file</p>
                  <p className="text-xs text-muted-foreground">
                    Each row creates one scheme. Products are matched by <code>sku</code>.
                    Download the template for the full column list and one example per scheme type.
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadSchemeImportTemplate}>
                    <Download className="h-4 w-4 mr-2" /> Download Template
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select file</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                disabled={validating}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground hover:file:bg-primary/90
                  cursor-pointer"
              />
              {validating && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Parsing and validating…
                </p>
              )}
            </div>

            {parseError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <p className="text-sm">{parseError}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP: PREVIEW */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">File: {fileName}</Badge>
              <Badge variant="outline">Total: {stats.total}</Badge>
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                Ready: {stats.ready}
              </Badge>
              {stats.errors > 0 && (
                <Badge variant="destructive">Errors: {stats.errors}</Badge>
              )}
              {stats.errors > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => downloadErrorsCsv(rows.filter(r => r.status === 'error'))}
                >
                  Download errors
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-medium w-10">Row</th>
                      <th className="p-2 text-left font-medium">Status</th>
                      <th className="p-2 text-left font-medium">SKU</th>
                      <th className="p-2 text-left font-medium">Scheme</th>
                      <th className="p-2 text-left font-medium">Type</th>
                      <th className="p-2 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 200).map(r => (
                      <tr key={r.rowIndex} className="border-t">
                        <td className="p-2">{r.rowIndex}</td>
                        <td className="p-2">
                          {r.status === 'ready' ? (
                            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">Ready</Badge>
                          ) : (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </td>
                        <td className="p-2">{String(r.raw['sku'] ?? '')}</td>
                        <td className="p-2">{String(r.raw['scheme_name'] ?? '')}</td>
                        <td className="p-2">{String(r.raw['scheme_type'] ?? '')}</td>
                        <td className="p-2 text-destructive">{r.errors.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 200 && (
                <p className="text-xs text-muted-foreground p-2 border-t text-center">
                  Showing first 200 of {rows.length} rows
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Duplicate handling</label>
                <Select value={policy} onValueChange={(v: ConflictPolicy) => setPolicy(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip if scheme name already exists for product</SelectItem>
                    <SelectItem value="update">Update existing scheme</SelectItem>
                    <SelectItem value="create">Always create new (allow duplicates)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Error rows</label>
                <Select value={skipErrors ? 'skip' : 'abort'} onValueChange={(v) => setSkipErrors(v === 'skip')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip rows with errors</SelectItem>
                    <SelectItem value="abort">Abort if any errors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {importing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Importing…</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP: RESULT */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">Import finished</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Inserted" value={result.inserted} tone="success" />
              <Stat label="Updated" value={result.updated} tone="info" />
              <Stat label="Skipped" value={result.skipped} tone="muted" />
              <Stat label="Failed" value={result.failed} tone={result.failed ? 'danger' : 'muted'} />
            </div>
            {result.failures.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Row</th>
                      <th className="p-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failures.map((f, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{f.rowIndex || '—'}</td>
                        <td className="p-2 text-destructive">{f.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={reset} disabled={importing}>Start Over</Button>
              <Button onClick={runImport} disabled={importing || stats.ready === 0}>
                {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</> : `Import ${stats.ready} schemes`}
              </Button>
            </>
          )}
          {step === 'result' && (
            <>
              <Button variant="outline" onClick={reset}>Import More</Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: number; tone: 'success' | 'info' | 'muted' | 'danger' }) => {
  const colorMap = {
    success: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
    info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    muted: 'bg-muted text-muted-foreground border-border',
    danger: 'bg-destructive/10 text-destructive border-destructive/30',
  };
  return (
    <div className={`border rounded-lg p-3 ${colorMap[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
};
