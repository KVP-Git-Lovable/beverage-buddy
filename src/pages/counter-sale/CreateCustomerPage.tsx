import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCounterSaleWizard } from '@/contexts/CounterSaleWizardContext';

export default function CreateCustomerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCustomer } = useCounterSaleWizard();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Please log in first');
      return;
    }
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('pos_customers' as any)
        .insert({
          user_id: user.id,
          name: name.trim(),
          phone: phone.trim() || null,
          area: area.trim() || null,
          notes: notes.trim() || null,
        } as any)
        .select('id, name, phone, area, city')
        .single();

      if (error) throw error;

      setCustomer(data as any);
      toast.success('Customer created');
      navigate('/counter-sale/new/products');
    } catch (err: any) {
      console.error('[CreateCustomerPage] save error:', err);
      toast.error(err?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-3 pb-24">
      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-sm">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer full name"
            className="mt-1"
            autoFocus
          />
        </div>
        <div>
          <Label className="text-sm">Phone</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className="mt-1"
            type="tel"
          />
        </div>
        <div>
          <Label className="text-sm">Area</Label>
          <Input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Optional"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="mt-1"
            rows={2}
          />
        </div>
      </Card>

      <div className="fixed left-0 right-0 bottom-0 bg-background border-t p-3 flex gap-2 max-w-screen-md mx-auto">
        <Button variant="outline" className="flex-1" onClick={() => navigate(-1)} disabled={saving}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
