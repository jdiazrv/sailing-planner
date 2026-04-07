alter table public.profiles
  add column if not exists visit_panel_display_mode public.visit_panel_display_mode not null default 'both';

update public.profiles
set visit_panel_display_mode = coalesce(visit_panel_display_mode, 'both'::public.visit_panel_display_mode)
where visit_panel_display_mode is null;