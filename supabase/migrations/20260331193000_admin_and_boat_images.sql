alter table public.boats
  add column if not exists image_path text;

alter table public.profiles
  add column if not exists email text;

update public.profiles as profiles
set
  email = users.email,
  display_name = coalesce(
    profiles.display_name,
    users.raw_user_meta_data ->> 'display_name',
    split_part(users.email, '@', 1)
  )
from auth.users as users
where users.id = profiles.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    email = new.email,
    display_name = coalesce(
      public.profiles.display_name,
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_profile_from_auth_user();

insert into storage.buckets (id, name, public)
values ('boat-images', 'boat-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Boat images are public" on storage.objects;
create policy "Boat images are public"
on storage.objects
for select
using (bucket_id = 'boat-images');

drop policy if exists "Boat editors can upload images" on storage.objects;
create policy "Boat editors can upload images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'boat-images'
  and public.can_edit_boat((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Boat editors can update images" on storage.objects;
create policy "Boat editors can update images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'boat-images'
  and public.can_edit_boat((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'boat-images'
  and public.can_edit_boat((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Boat editors can delete images" on storage.objects;
create policy "Boat editors can delete images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'boat-images'
  and public.can_edit_boat((storage.foldername(name))[1]::uuid)
);
