import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CounterSaleWizardProvider,
  useCounterSaleWizard,
} from '@/contexts/CounterSaleWizardContext';

const STEPS = [
  { key: 'customer', label: 'Customer' },
  { key: 'products', label: 'Products' },
  { key: 'review', label: 'Review' },
];

function getStepIndex(pathname: string) {
  if (pathname.startsWith('/counter-sale/new/review')) return 2;
  if (pathname.startsWith('/counter-sale/new/products')) return 1;
  return 0;
}

function getTitle(pathname: string) {
  if (pathname.startsWith('/counter-sale/new/review')) return 'Review Counter Sale';
  if (pathname.startsWith('/counter-sale/new/products')) return 'Add Products';
  if (pathname.startsWith('/counter-sale/new/walkin')) return 'Walk-in Customer';
  if (pathname.startsWith('/counter-sale/new/customer/new')) return 'New Customer';
  return 'Select Customer';
}

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reset } = useCounterSaleWizard();

  const activeIdx = getStepIndex(location.pathname);
  const title = getTitle(location.pathname);

  const handleCancel = () => {
    if (window.confirm('Cancel this counter sale? Unsaved data will be lost.')) {
      reset();
      navigate('/visits/retailers');
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-background border-b">
      <div className="flex items-center gap-2 px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 text-base font-semibold truncate">{title}</h1>
        <Button variant="ghost" size="icon" onClick={handleCancel} aria-label="Cancel sale">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-1 px-3 pb-1">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={cn('h-1 flex-1 rounded-full', i <= activeIdx ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </div>
      <div className="flex items-center justify-between px-3 pb-2 text-[11px] text-muted-foreground">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={cn('transition-colors', i === activeIdx ? 'text-primary font-medium' : '')}
          >
            {i + 1}. {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Parent layout for /counter-sale/new/* routes.
 * Mounts the wizard provider ONCE so all child pages share state across
 * navigations (and persist via sessionStorage).
 */
export default function CounterSaleWizardLayout() {
  return (
    <CounterSaleWizardProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col">
          <Outlet />
        </div>
      </div>
    </CounterSaleWizardProvider>
  );
}
