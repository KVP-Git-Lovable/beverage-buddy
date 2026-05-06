-- ============================================================================
-- Counter Sales: pos_customers + counter_sales + counter_sale_items
-- ============================================================================

-- 1) pos_customers ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NULL,
  area text NULL,
  city text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pos_customers_user_id ON public.pos_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_customers_phone ON public.pos_customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pos_customers_name_lower ON public.pos_customers (lower(name));
ALTER TABLE public.pos_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_customers_select_own" ON public.pos_customers;
CREATE POLICY "pos_customers_select_own" ON public.pos_customers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "pos_customers_insert_own" ON public.pos_customers;
CREATE POLICY "pos_customers_insert_own" ON public.pos_customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "pos_customers_update_own" ON public.pos_customers;
CREATE POLICY "pos_customers_update_own" ON public.pos_customers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "pos_customers_delete_own" ON public.pos_customers;
CREATE POLICY "pos_customers_delete_own" ON public.pos_customers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2) counter_sales ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counter_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  visit_id uuid NULL,
  pos_customer_id uuid NULL REFERENCES public.pos_customers(id) ON DELETE SET NULL,
  walkin_name text NULL,
  walkin_phone text NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  remarks text NULL,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_counter_sales_user_id ON public.counter_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_counter_sales_visit_id ON public.counter_sales(visit_id);
CREATE INDEX IF NOT EXISTS idx_counter_sales_pos_customer_id ON public.counter_sales(pos_customer_id);
CREATE INDEX IF NOT EXISTS idx_counter_sales_sale_date ON public.counter_sales(sale_date);
ALTER TABLE public.counter_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "counter_sales_select_own" ON public.counter_sales;
CREATE POLICY "counter_sales_select_own" ON public.counter_sales
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "counter_sales_insert_own" ON public.counter_sales;
CREATE POLICY "counter_sales_insert_own" ON public.counter_sales
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "counter_sales_update_own" ON public.counter_sales;
CREATE POLICY "counter_sales_update_own" ON public.counter_sales
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "counter_sales_delete_own" ON public.counter_sales;
CREATE POLICY "counter_sales_delete_own" ON public.counter_sales
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3) counter_sale_items -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counter_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_sale_id uuid NOT NULL REFERENCES public.counter_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL,
  uom_id uuid NULL,
  uom_code text NULL,
  conversion_to_base numeric NULL,
  base_qty numeric NULL,
  rate numeric NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_counter_sale_items_sale_id ON public.counter_sale_items(counter_sale_id);
CREATE INDEX IF NOT EXISTS idx_counter_sale_items_product_id ON public.counter_sale_items(product_id);
ALTER TABLE public.counter_sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "counter_sale_items_select_via_parent" ON public.counter_sale_items;
CREATE POLICY "counter_sale_items_select_via_parent" ON public.counter_sale_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.counter_sales cs WHERE cs.id = counter_sale_items.counter_sale_id AND cs.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "counter_sale_items_insert_via_parent" ON public.counter_sale_items;
CREATE POLICY "counter_sale_items_insert_via_parent" ON public.counter_sale_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.counter_sales cs WHERE cs.id = counter_sale_items.counter_sale_id AND cs.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "counter_sale_items_delete_via_parent" ON public.counter_sale_items;
CREATE POLICY "counter_sale_items_delete_via_parent" ON public.counter_sale_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.counter_sales cs WHERE cs.id = counter_sale_items.counter_sale_id AND cs.user_id = auth.uid())
  );

-- 4) updated_at triggers ------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pos_customers_updated_at ON public.pos_customers;
CREATE TRIGGER trg_pos_customers_updated_at
  BEFORE UPDATE ON public.pos_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_counter_sales_updated_at ON public.counter_sales;
CREATE TRIGGER trg_counter_sales_updated_at
  BEFORE UPDATE ON public.counter_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();