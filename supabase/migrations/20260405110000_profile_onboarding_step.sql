alter table public.profiles
  add column if not exists onboarding_step text;

update public.profiles
set onboarding_step = 'welcome'
where onboarding_pending = true
  and onboarding_step is null;

update public.profiles
set onboarding_step = null
where onboarding_pending = false;

alter table public.profiles
  alter column onboarding_step set default 'welcome';

alter table public.profiles
  drop constraint if exists profiles_onboarding_step_check;

alter table public.profiles
  add constraint profiles_onboarding_step_check
  check (
    onboarding_step is null
    or onboarding_step in ('welcome', 'configure_boat', 'create_season', 'full_tour')
  );

comment on column public.profiles.onboarding_step is
  'Checkpoint for member onboarding tour: welcome, configure_boat, create_season, or full_tour.';