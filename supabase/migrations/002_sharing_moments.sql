-- Sharing moments (time-limited sharing opportunities pushed by admins)
create table public.sharing_moments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  parsed_content jsonb,
  doc_url text,
  platform_targets text[] default array['linkedin', 'x'],
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  is_active boolean default true
);

-- Track per-user dismissals
create table public.dismissed_moments (
  user_id uuid references public.users(id) on delete cascade,
  moment_id uuid references public.sharing_moments(id) on delete cascade,
  dismissed_at timestamptz default now(),
  primary key (user_id, moment_id)
);

-- Add moment_id to shares for tracking moment-sourced shares
alter table public.shares
  add column if not exists moment_id uuid references public.sharing_moments(id);
