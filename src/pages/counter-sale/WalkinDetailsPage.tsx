import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCounterSaleWizard } from '@/contexts/CounterSaleWizardContext';

export default function WalkinDetailsPage() {
  const navigate = useNavigate();
  const { setWalkin } = useCounterSaleWizard();

  const [walkinName, setWalkinName] = useState('Walk-in Customer');
  const [walkinPhone, setWalkinPhone] = useState('');

  const handleContinue = () => {
    setWalkin({
      walkin_name: walkinName.trim() || 'Walk-in Customer',
      walkin_phone: walkinPhone.trim() || undefined,
    });
    navigate('/counter-sale/new/products');
  };

  return (
    <div className="flex-1 p-3 pb-24">
      <Card className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Walk-in customers are not saved to your customer directory. Capture optional contact details for this sale only.
        </p>
        <div>
          <Label className="text-sm">Customer Name</Label>
          <Input
            value={walkinName}
            onChange={(e) => setWalkinName(e.target.value)}
            placeholder="Walk-in Customer"
            className="mt-1"
            autoFocus
          />
        </div>
        <div>
          <Label className="text-sm">Phone</Label>
          <Input
            value={walkinPhone}
            onChange={(e) => setWalkinPhone(e.target.value)}
            placeholder="Optional"
            className="mt-1"
            type="tel"
          />
        </div>
      </Card>

      <div className="fixed left-0 right-0 bottom-0 bg-background border-t p-3 flex gap-2 max-w-screen-md mx-auto">
        <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleContinue}>
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
