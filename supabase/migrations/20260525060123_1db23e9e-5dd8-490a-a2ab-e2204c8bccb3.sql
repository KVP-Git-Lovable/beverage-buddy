ALTER TABLE public.product_schemes ALTER COLUMN show_in_portal SET DEFAULT true;
UPDATE public.product_schemes SET show_in_portal = true WHERE show_in_portal IS DISTINCT FROM true;