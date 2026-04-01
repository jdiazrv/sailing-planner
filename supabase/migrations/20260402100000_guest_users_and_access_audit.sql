alter table public.profiles
  add column if not exists is_guest_user boolean not null default false,
  add column if not exists created_by_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists sign_in_count integer not null default 0,
  add column if not exists last_sign_in_at timestamptz;

comment on column public.profiles.is_guest_user is
'Marks users created as guest/visit accounts for a single boat, rather than platform or crew users.';

comment on column public.profiles.created_by_user_id is
'References the user who created this account, useful for guest accounts and traceability.';

comment on column public.profiles.sign_in_count is
'Count of successful sign-ins for this user.';

comment on column public.profiles.last_sign_in_at is
'Timestamp of the most recent successful sign-in.';
