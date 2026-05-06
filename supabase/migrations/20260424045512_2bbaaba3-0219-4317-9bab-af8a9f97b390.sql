ALTER TABLE public.enabled_units
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

WITH ordered_units AS (
  SELECT
    eu.uom_id,
    row_number() OVER (
      PARTITION BY um.category
      ORDER BY um.name, um.code
    )::integer AS new_display_order
  FROM public.enabled_units eu
  JOIN public.uom_master um ON um.id = eu.uom_id
)
UPDATE public.enabled_units eu
SET display_order = ordered_units.new_display_order
FROM ordered_units
WHERE eu.uom_id = ordered_units.uom_id
  AND eu.display_order = 0;

CREATE INDEX IF NOT EXISTS idx_enabled_units_order
ON public.enabled_units(display_order);