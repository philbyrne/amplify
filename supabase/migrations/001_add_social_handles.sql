alter table public.users
  add column if not exists x_handle text,
  add column if not exists instagram_handle text,
  add column if not exists onboarding_completed boolean default false;
