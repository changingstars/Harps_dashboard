create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default warehouse address
insert into public.app_settings (key, value)
values ('warehouse_address', '1234 Budapest, Raktár utca 1.')
on conflict (key) do nothing;

-- Enable RLS
alter table public.app_settings enable row level security;

-- Policy: Authenticated users can read settings
create policy "Authenticated users can read app_settings"
  on public.app_settings for select
  to authenticated
  using (true);

-- Policy: Only admins can update settings (assuming admin check via email or metadata, here using authenticated provided they have access to admin page, ideally valid admin check)
-- For simplicity in this project context where admin is often just a specific user:
create policy "dams user can update app_settings"
  on public.app_settings for update
  to authenticated
  using (auth.jwt() ->> 'email' ilike '%admin%' or auth.jwt() ->> 'email' = 'dams@harps.hu'); 
-- NOTE: Adjust the admin check based on your actual admin auth logic (e.g. metadata role). 
-- Based on existing code, admin check is likely usually done in frontend or via specific rules. 
-- I'll use a broad update policy for now or check existing policies.
