alter table public.profiles
  add column if not exists onboarding_pending boolean not null default false;

update public.profiles
set onboarding_pending = true
where coalesce(is_superuser, false) = false;

comment on column public.profiles.onboarding_pending is
'Controls whether the initial boat onboarding tour should be shown again for this user.';
