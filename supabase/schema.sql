-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar_url text,
  role text not null default 'employee' check (role in ('employee', 'manager', 'admin')),
  points integer not null default 0,
  voice_profile jsonb,
  linkedin_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Content packages
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  body text,
  platform_targets text[] not null default '{linkedin,x}',
  drive_folder_url text,
  has_no_files boolean default false,
  example_copies text[] not null default '{}',
  tags text[] default '{}',
  cover_image_url text,
  is_active boolean default true,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cached Drive files per package
create table public.drive_files (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete cascade,
  drive_file_id text not null,
  name text not null,
  mime_type text,
  web_view_link text,
  thumbnail_link text,
  created_at timestamptz default now()
);

-- Share log
create table public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  package_id uuid references public.packages(id),
  platform text not null check (platform in ('linkedin', 'x')),
  copy_used text,
  utm_code text unique,
  shared_at timestamptz default now()
);

-- App configuration
create table public.config (
  key text primary key,
  value text
);

-- Insert default config
insert into public.config (key, value) values
  ('slack_webhook_url', ''),
  ('key_differentiators', '["AI-first", "Customer-centric", "Fastest in class", "Enterprise-ready", "Global scale"]'),
  ('points_per_share', '10');

-- Row Level Security
alter table public.users enable row level security;
alter table public.packages enable row level security;
alter table public.drive_files enable row level security;
alter table public.shares enable row level security;
alter table public.config enable row level security;

create policy "Users readable by all authenticated" on public.users
  for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);
create policy "Users can insert own record" on public.users
  for insert with check (true);

create policy "Active packages visible to authenticated" on public.packages
  for select using (is_active = true and auth.role() = 'authenticated');
create policy "All packages visible to managers" on public.packages
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role in ('admin','manager'))
  );
create policy "Managers can insert packages" on public.packages
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and role in ('admin','manager'))
  );
create policy "Managers can update packages" on public.packages
  for update using (
    exists (select 1 from public.users where id = auth.uid() and role in ('admin','manager'))
  );

create policy "Drive files visible to authenticated" on public.drive_files
  for select using (auth.role() = 'authenticated');
create policy "Managers can manage drive files" on public.drive_files
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role in ('admin','manager'))
  );

create policy "Shares visible to authenticated" on public.shares
  for select using (auth.role() = 'authenticated');
create policy "Users can insert own shares" on public.shares
  for insert with check (auth.uid() = user_id);

create policy "Config readable by managers" on public.config
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role in ('admin','manager'))
  );
create policy "Config writable by admins" on public.config
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Function to auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at before update on public.users
  for each row execute function update_updated_at_column();
create trigger update_packages_updated_at before update on public.packages
  for each row execute function update_updated_at_column();
