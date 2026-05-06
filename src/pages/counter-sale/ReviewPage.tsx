import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, User, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityEvents } from '@/hooks/useActivityEvents';
import { useCounterSaleWizard } from '@/contexts/CounterSaleWizardContext';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createActivity } = useActivityEvents();
  const {
    activityDraft,
    customer,
    walkin,
    items,
    totalAmount,
    reset,
  } = useCounterSaleWizard();

  const [saving, setSaving] = useState(false);

  // Tax calculation (mirrors Cart page: flat 2.5% CGST + 2.5% SGST)
  const subtotal = totalAmount;
  const cgst = +(subtotal * 0.025).toFixed(2);
  const sgst = +(subtotal * 0.025).toFixed(2);
  const taxTotal = +(cgst + sgst).toFixed(2);
  const finalTotal = +(subtotal + cgst + sgst).toFixed(2);

  // Step guards
  useEffect(() => {
    if (!customer && !walkin) {
      navigate('/counter-sale/new/customer', { replace: true });
      return;
    }
    if (items.length === 0) {
      navigate('/counter-sale/new/products', { replace: true });
    }
  }, [customer, walkin, items.length, navigate]);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Please log in first');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one product');
      return;
    }

    setSaving(true);
    try {
      // 1) Activity row (creates visit + activity_events). Use draft if present,
      // otherwise default to a today/full-day Counter Sale activity.
      const today = format(new Date(), 'yyyy-MM-dd');
      const draft = activityDraft ?? {
        duration_type: 'full_day' as const,
        activity_date: today,
      };
      const created = await createActivity({
        activity_name: draft.activity_name,
        activity_type: 'Counter Sale',
        duration_type: draft.duration_type,
        activity_date: draft.activity_date,
        start_time: draft.start_time,
        end_time: draft.end_time,
        half_day_type: draft.half_day_type,
        from_date: draft.from_date,
        to_date: draft.to_date,
        total_days: draft.total_days,
        retailer_name: draft.retailer_name,
        remarks: draft.remarks,
      });

      if (!created) {
        toast.error('Failed to create activity');
        setSaving(false);
        return;
      }

      // 2) counter_sales header
      const { data: saleData, error: saleErr } = await supabase
        .from('counter_sales' as any)
        .insert({
          user_id: user.id,
          visit_id: created.visitId,
          pos_customer_id: customer?.id ?? null,
          walkin_name: customer ? null : walkin?.walkin_name ?? null,
          walkin_phone: customer ? null : walkin?.walkin_phone ?? null,
          subtotal,
          cgst_amount: cgst,
          sgst_amount: sgst,
          tax_amount: taxTotal,
          total_amount: finalTotal,
          remarks: activityDraft?.remarks ?? null,
          sale_date: today,
        } as any)
        .select('id')
        .single();

      if (saleErr) throw saleErr;
      const counterSaleId = (saleData as any).id as string;

      // 3) counter_sale_items
      const itemRows = items.map((l) => ({
        counter_sale_id: counterSaleId,
        product_id: l.product_id,
        product_name: l.product_name,
        quantity: l.quantity,
        uom_id: l.uom_id,
        uom_code: l.uom_code,
        conversion_to_base: l.conversion_to_base,
        base_qty:
          l.conversion_to_base != null
            ? +(l.quantity * l.conversion_to_base).toFixed(4)
            : null,
        rate: l.rate,
        line_total: l.line_total,
      }));

      const { error: itemsErr } = await supabase
        .from('counter_sale_items' as any)
        .insert(itemRows as any);

      if (itemsErr) throw itemsErr;

      reset();
      toast.success('Counter sale saved');
      navigate('/visits/retailers');
    } catch (err: any) {
      console.error('[ReviewPage] save error:', err);
      toast.error(err?.message || 'Failed to save sale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-3 pb-32 space-y-3">
      {/* Customer block */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          Customer
        </div>
        {customer ? (
          <div>
            <div className="text-sm font-medium">{customer.name}</div>
            <div className="text-xs text-muted-foreground">
              {[customer.phone, customer.area, customer.city].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-medium">{walkin?.walkin_name ?? 'Walk-in Customer'}</div>
            <div className="text-xs text-muted-foreground">
              {walkin?.walkin_phone || 'Walk-in (not saved to directory)'}
            </div>
          </div>
        )}
      </Card>

      {/* Items block */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          <ShoppingBag className="h-3.5 w-3.5" />
          Items ({items.length})
        </div>
        <div className="divide-y">
          {items.map((l) => (
            <div key={l.lineId} className="py-2 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{l.product_name}</div>
                <div className="text-xs text-muted-foreground">
                  {l.quantity} {l.uom_code ?? 'unit'} × ₹{l.rate.toFixed(2)}
                </div>
              </div>
              <div className="text-sm font-semibold">₹{l.line_total.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className="border-t mt-2 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>CGST (2.5%)</span>
            <span>₹{cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>SGST (2.5%)</span>
            <span>₹{sgst.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 mt-1">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-lg font-bold">₹{finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Sticky footer */}
      <div className="fixed left-0 right-0 bottom-0 bg-background border-t p-3 flex gap-2 max-w-screen-md mx-auto">
        <Button variant="outline" className="flex-1" onClick={() => navigate(-1)} disabled={saving}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Sale
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
