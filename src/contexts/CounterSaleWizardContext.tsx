import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivityDraft {
  activity_name?: string;
  duration_type: 'hour_based' | 'half_day' | 'full_day' | 'multiple_days';
  activity_date: string; // yyyy-MM-dd
  start_time?: string;   // ISO
  end_time?: string;     // ISO
  half_day_type?: string;
  from_date?: string;
  to_date?: string;
  total_days?: number;
  retailer_name?: string;
  remarks?: string;
}

export interface SelectedCustomer {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  city: string | null;
}

export interface WalkinCustomer {
  walkin_name: string;
  walkin_phone?: string;
}

export interface CounterSaleLine {
  // Local-only id for list operations
  lineId: string;
  product_id: string;
  product_name: string;
  quantity: number;
  uom_id: string | null;
  uom_code: string | null;
  conversion_to_base: number | null;
  rate: number;
  line_total: number;
}

interface WizardState {
  activityDraft: ActivityDraft | null;
  customer: SelectedCustomer | null;
  walkin: WalkinCustomer | null;
  items: CounterSaleLine[];
}

interface WizardCtx extends WizardState {
  setActivityDraft: (draft: ActivityDraft | null) => void;
  setCustomer: (c: SelectedCustomer | null) => void;
  setWalkin: (w: WalkinCustomer | null) => void;
  setItems: (items: CounterSaleLine[]) => void;
  reset: () => void;
  hasCustomerOrWalkin: boolean;
  totalAmount: number;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'counter-sale-wizard-v1';

const loadInitial = (): WizardState => {
  if (typeof window === 'undefined') {
    return { activityDraft: null, customer: null, walkin: null, items: [] };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WizardState;
  } catch {
    // ignore
  }
  return { activityDraft: null, customer: null, walkin: null, items: [] };
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CounterSaleWizardContext = createContext<WizardCtx | null>(null);

export function CounterSaleWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(loadInitial);

  // Persist to sessionStorage so refresh / back-button keep wizard alive.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const value = useMemo<WizardCtx>(() => {
    const totalAmount = state.items.reduce((s, l) => s + (l.line_total || 0), 0);
    return {
      ...state,
      totalAmount,
      hasCustomerOrWalkin: !!(state.customer || state.walkin),
      setActivityDraft: (activityDraft) => setState((s) => ({ ...s, activityDraft })),
      setCustomer: (customer) =>
        setState((s) => ({ ...s, customer, walkin: customer ? null : s.walkin })),
      setWalkin: (walkin) =>
        setState((s) => ({ ...s, walkin, customer: walkin ? null : s.customer })),
      setItems: (items) => setState((s) => ({ ...s, items })),
      reset: () => {
        setState({ activityDraft: null, customer: null, walkin: null, items: [] });
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      },
    };
  }, [state]);

  return (
    <CounterSaleWizardContext.Provider value={value}>
      {children}
    </CounterSaleWizardContext.Provider>
  );
}

export function useCounterSaleWizard(): WizardCtx {
  const ctx = useContext(CounterSaleWizardContext);
  if (!ctx) {
    throw new Error('useCounterSaleWizard must be used inside <CounterSaleWizardProvider>');
  }
  return ctx;
}
