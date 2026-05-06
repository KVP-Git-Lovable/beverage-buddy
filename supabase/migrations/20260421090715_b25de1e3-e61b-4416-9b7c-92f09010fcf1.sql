-- Drop the legacy 11-arg overload to resolve PostgREST PGRST203 ambiguity
DROP FUNCTION IF EXISTS public.execute_stock_action(
  uuid, uuid, text, integer, text, uuid, uuid, text, date, uuid, text
);

-- Re-grant EXECUTE on the remaining 13-arg function (defensive)
GRANT EXECUTE ON FUNCTION public.execute_stock_action(
  uuid, uuid, text, integer, text, uuid, uuid, text, date, uuid, text, text, date
) TO authenticated, anon;