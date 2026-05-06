
CREATE OR REPLACE FUNCTION public.sync_order_status_from_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
    CASE NEW.delivery_status
      WHEN 'in_packing_list' THEN
        NEW.status := 'processing';
      WHEN 'dispatched' THEN
        NEW.status := 'dispatched';
      WHEN 'delivered' THEN
        NEW.status := 'delivered';
      ELSE
        NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_order_status_from_delivery
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status_from_delivery_status();
