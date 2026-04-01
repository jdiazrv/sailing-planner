alter table public.profiles
add column if not exists is_timeline_public boolean not null default false;

comment on column public.profiles.is_timeline_public is
'When true, this user shares trip timelines and map context with other users who also share theirs. Visits and derived availability remain private.';
