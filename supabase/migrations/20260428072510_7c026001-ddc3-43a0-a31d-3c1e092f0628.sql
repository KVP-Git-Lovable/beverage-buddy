-- Per-UOM price override layer (Phase 2). Purely additive.
CREATE TABLE public.product_price_list (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  uom_id           uuid NOT NULL REFERENCES public.uom_master(id),
  rate             numeric NOT NULL CHECK (rate >= 0),
  is_default_price boolean NOT NULL DEFAULT false,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  UNIQUE (product_id, uom_id)
);

CREATE UNIQUE INDEX product_price_list_one_default
  ON public.product_price_list (product_id)
  WHERE is_default_price = true;

CREATE INDEX product_price_list_product_idx
  ON public.product_price_list (product_id);

CREATE TRIGGER trg_product_price_list_updated_at
  BEFORE UPDATE ON public.product_price_list
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_price_list ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user
CREATE POLICY "price_list_read_authenticated"
  ON public.product_price_list FOR SELECT
  TO authenticated
  USING (true);

-- Write: admins only
CREATE POLICY "price_list_admin_insert"
  ON public.product_price_list FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "price_list_admin_update"
  ON public.product_price_list FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "price_list_admin_delete"
  ON public.product_price_list FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));