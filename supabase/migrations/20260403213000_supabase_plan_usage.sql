create or replace function public.get_supabase_plan_usage()
returns table (
  database_size_bytes bigint,
  storage_size_bytes bigint
)
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not current_user_is_superuser() then
    raise exception 'Forbidden';
  end if;

  return query
  select
    pg_database_size(current_database())::bigint as database_size_bytes,
    coalesce(sum((storage.objects.metadata ->> 'size')::bigint), 0)::bigint as storage_size_bytes
  from storage.objects;
end;
$$;
