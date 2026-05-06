do $$
declare
  rec record;
begin
  for rec in
    select distinct pl.id, pl.status
    from public.packing_lists pl
    join public.packing_list_items pli on pli.packing_list_id = pl.id
    join public.packing_list_item_batches plib on plib.packing_list_item_id = pli.id
    where pl.status in ('draft', 'picking')
      and coalesce(plib.packed_qty, 0) > 0
  loop
    if rec.status = 'draft' then
      update public.packing_lists
        set status = 'picking', updated_at = now()
        where id = rec.id;
    end if;

    update public.packing_lists
      set status = 'packed', updated_at = now()
      where id = rec.id;
  end loop;
end $$;