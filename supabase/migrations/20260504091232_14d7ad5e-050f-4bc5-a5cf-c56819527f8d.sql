-- 1. Index on retailers.phone for fast direct lookups
CREATE INDEX IF NOT EXISTS idx_retailers_phone ON public.retailers (phone);

-- 2. Persistent phone -> name cache for the WhatsApp webhook.
CREATE TABLE IF NOT EXISTS public.whatsapp_phone_name_cache (
  phone_key text PRIMARY KEY,
  retailer_id uuid NOT NULL,
  name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_phone_name_cache ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: only service_role accesses it.

-- 3. Trigger to keep the cache in sync with retailers
CREATE OR REPLACE FUNCTION public.sync_whatsapp_phone_name_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_d10 text;
  v_old_digits text;
  v_old_d10 text;
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.phone IS NOT NULL THEN
    v_old_digits := regexp_replace(OLD.phone, '\D', '', 'g');
    IF length(v_old_digits) >= 10 THEN
      v_old_d10 := CASE WHEN length(v_old_digits) = 12 AND substring(v_old_digits, 1, 2) = '91'
                        THEN substring(v_old_digits, 3)
                        ELSE v_old_digits END;
      DELETE FROM public.whatsapp_phone_name_cache
       WHERE phone_key IN (v_old_d10, '91' || v_old_d10)
         AND retailer_id = OLD.id;
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE')
     AND NEW.phone IS NOT NULL
     AND NEW.name IS NOT NULL THEN
    v_digits := regexp_replace(NEW.phone, '\D', '', 'g');
    IF length(v_digits) >= 10 THEN
      v_d10 := CASE WHEN length(v_digits) = 12 AND substring(v_digits, 1, 2) = '91'
                    THEN substring(v_digits, 3)
                    ELSE v_digits END;

      INSERT INTO public.whatsapp_phone_name_cache (phone_key, retailer_id, name, updated_at)
      VALUES (v_d10, NEW.id, NEW.name, now())
      ON CONFLICT (phone_key) DO UPDATE
        SET retailer_id = EXCLUDED.retailer_id,
            name = EXCLUDED.name,
            updated_at = now();

      INSERT INTO public.whatsapp_phone_name_cache (phone_key, retailer_id, name, updated_at)
      VALUES ('91' || v_d10, NEW.id, NEW.name, now())
      ON CONFLICT (phone_key) DO UPDATE
        SET retailer_id = EXCLUDED.retailer_id,
            name = EXCLUDED.name,
            updated_at = now();
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_whatsapp_phone_name_cache ON public.retailers;
CREATE TRIGGER trg_sync_whatsapp_phone_name_cache
AFTER INSERT OR UPDATE OF phone, name OR DELETE ON public.retailers
FOR EACH ROW EXECUTE FUNCTION public.sync_whatsapp_phone_name_cache();

-- 4. One-time backfill — dedupe by phone_key, prefer the most recently updated retailer
WITH normalized AS (
  SELECT
    r.id,
    r.name,
    r.updated_at,
    CASE WHEN length(regexp_replace(r.phone, '\D', '', 'g')) = 12
              AND substring(regexp_replace(r.phone, '\D', '', 'g'), 1, 2) = '91'
         THEN substring(regexp_replace(r.phone, '\D', '', 'g'), 3)
         ELSE regexp_replace(r.phone, '\D', '', 'g')
    END AS d10
  FROM public.retailers r
  WHERE r.phone IS NOT NULL
    AND r.name IS NOT NULL
    AND length(regexp_replace(r.phone, '\D', '', 'g')) >= 10
),
keys AS (
  SELECT id, name, updated_at, d10 AS phone_key FROM normalized
  UNION ALL
  SELECT id, name, updated_at, '91' || d10 AS phone_key FROM normalized
),
deduped AS (
  SELECT DISTINCT ON (phone_key) phone_key, id, name, updated_at
  FROM keys
  ORDER BY phone_key, updated_at DESC NULLS LAST, id
)
INSERT INTO public.whatsapp_phone_name_cache (phone_key, retailer_id, name, updated_at)
SELECT phone_key, id, name, now() FROM deduped
ON CONFLICT (phone_key) DO UPDATE
  SET retailer_id = EXCLUDED.retailer_id,
      name = EXCLUDED.name,
      updated_at = now();