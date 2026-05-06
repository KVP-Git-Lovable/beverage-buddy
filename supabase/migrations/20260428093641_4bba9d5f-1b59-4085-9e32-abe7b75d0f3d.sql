
-- 0. Widen the category check constraint
ALTER TABLE public.uom_master DROP CONSTRAINT IF EXISTS uom_master_category_check;
ALTER TABLE public.uom_master
  ADD CONSTRAINT uom_master_category_check
  CHECK (category IN ('Weight','Volume','Quantity','Length'));

-- 1. Add columns
ALTER TABLE public.uom_master
  ADD COLUMN IF NOT EXISTS conversion_to_base numeric,
  ADD COLUMN IF NOT EXISTS is_base boolean NOT NULL DEFAULT false;

-- 2. Backfill existing rows
UPDATE public.uom_master SET is_base = false WHERE code IN ('GRAM','LITRE');
UPDATE public.uom_master SET conversion_to_base = 1000,        is_base = false WHERE code = 'GRAM';
UPDATE public.uom_master SET conversion_to_base = 1000000,     is_base = false WHERE code = 'KG';
UPDATE public.uom_master SET conversion_to_base = 1,           is_base = true  WHERE code = 'ML';
UPDATE public.uom_master SET conversion_to_base = 1000,        is_base = false WHERE code = 'LITRE';
UPDATE public.uom_master SET conversion_to_base = NULL,        is_base = true  WHERE code = 'PIECE';
UPDATE public.uom_master SET conversion_to_base = NULL,        is_base = false WHERE category = 'Quantity' AND code <> 'PIECE';

-- 3. Insert MG if missing (new base for Weight)
INSERT INTO public.uom_master (code, name, category, conversion_to_base, is_base, is_system)
SELECT 'MG', 'Milligram', 'Weight', 1, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.uom_master WHERE code = 'MG');

-- 4. New Weight units
INSERT INTO public.uom_master (code, name, category, conversion_to_base, is_base, is_system) VALUES
  ('TON', 'Metric ton', 'Weight', 1000000000, false, true),
  ('LB',  'Pound',      'Weight', 453592,     false, true),
  ('OZ',  'Ounce',      'Weight', 28349.5,    false, true)
ON CONFLICT (code) DO NOTHING;

-- 5. New Volume units
INSERT INTO public.uom_master (code, name, category, conversion_to_base, is_base, is_system) VALUES
  ('GAL',   'Gallon',      'Volume', 3785.41, false, true),
  ('FL_OZ', 'Fluid ounce', 'Volume', 29.5735, false, true)
ON CONFLICT (code) DO NOTHING;

-- 6. Length units
INSERT INTO public.uom_master (code, name, category, conversion_to_base, is_base, is_system) VALUES
  ('MM',   'Millimeter', 'Length', 1,       true,  true),
  ('CM',   'Centimeter', 'Length', 10,      false, true),
  ('M',    'Meter',      'Length', 1000,    false, true),
  ('KM',   'Kilometer',  'Length', 1000000, false, true),
  ('INCH', 'Inch',       'Length', 25.4,    false, true),
  ('FT',   'Foot',       'Length', 304.8,   false, true)
ON CONFLICT (code) DO NOTHING;

-- 7. TRAY in Quantity
INSERT INTO public.uom_master (code, name, category, conversion_to_base, is_base, is_system) VALUES
  ('TRAY', 'Tray', 'Quantity', NULL, false, true)
ON CONFLICT (code) DO NOTHING;

-- 8. Seed enabled_units for every master unit that doesn't have a row yet
INSERT INTO public.enabled_units (uom_id, enabled, is_default, display_order)
SELECT m.id, true, false,
       CASE m.code
         WHEN 'MG' THEN 1 WHEN 'GRAM' THEN 2 WHEN 'KG' THEN 3 WHEN 'TON' THEN 4 WHEN 'LB' THEN 5 WHEN 'OZ' THEN 6
         WHEN 'ML' THEN 1 WHEN 'LITRE' THEN 2 WHEN 'GAL' THEN 3 WHEN 'FL_OZ' THEN 4
         WHEN 'MM' THEN 1 WHEN 'CM' THEN 2 WHEN 'M' THEN 3 WHEN 'KM' THEN 4 WHEN 'INCH' THEN 5 WHEN 'FT' THEN 6
         WHEN 'PIECE' THEN 1 WHEN 'BOX' THEN 2 WHEN 'STRIP' THEN 3 WHEN 'TRAY' THEN 4 WHEN 'DOZEN' THEN 5 WHEN 'CARTON' THEN 6 WHEN 'PACKET' THEN 7 WHEN 'TABLET' THEN 8
         ELSE 99
       END
FROM public.uom_master m
WHERE NOT EXISTS (SELECT 1 FROM public.enabled_units e WHERE e.uom_id = m.id);

-- 9. Set default = KG, LITRE, M, PIECE
UPDATE public.enabled_units e
SET is_default = true
FROM public.uom_master m
WHERE e.uom_id = m.id AND m.code IN ('KG','LITRE','M','PIECE');

-- 10. Clear other defaults
UPDATE public.enabled_units e
SET is_default = false
FROM public.uom_master m
WHERE e.uom_id = m.id
  AND e.is_default = true
  AND m.code NOT IN ('KG','LITRE','M','PIECE');
