-- Fix the get_type_supports_primary RPC: distributor_types no longer has is_active column.
-- Use parent_allowed instead (a child type "supports primary" if its parent_type_code points to a parent that allows children).
-- Simplest correct semantics: a type code supports primary if any other type lists it as parent_type_code.

CREATE OR REPLACE FUNCTION public.get_type_supports_primary(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM distributor_types
    WHERE parent_type_code = p_code
  );
$function$;