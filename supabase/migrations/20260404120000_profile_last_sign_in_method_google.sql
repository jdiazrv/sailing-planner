alter table public.profiles
  drop constraint if exists profiles_last_sign_in_method_check;

alter table public.profiles
  add constraint profiles_last_sign_in_method_check
  check (
    last_sign_in_method in ('password', 'magic_link', 'google', 'unknown')
    or last_sign_in_method is null
  );

comment on column public.profiles.last_sign_in_method is
  'Last recorded sign-in method for this profile: password, magic_link, google or unknown.';
