-- ==============================================================================
-- INSTAGRAM CONTENT CREATION MANAGEMENT TOOL & DASHBOARD SCHEMA
-- Canonical schema for GitHub distribution: no account data or login seeds.
-- DEVELOPMENT ONLY: replaces policies with permissive collaboration access.
-- Review supabase/README.md before running against any existing database.
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  theme_preference text default 'light',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Idempotent column check for existing database instances
alter table if exists public.profiles add column if not exists theme_preference text default 'light';

-- ------------------------------------------------------------------------------
-- 2. Projects (Instagram Accounts - Visible to everyone by default)
-- ------------------------------------------------------------------------------
create table if not exists public.projects (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  insta_handle text not null,
  insta_url text,
  bio text,
  avatar_url text,
  followers_count text default '0',
  following_count text default '0',
  posts_count text default '0',
  category text default 'Content Creator',
  browser_session_state jsonb default '{"activeTab": "profile"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 3. Reference Ideas (Reels & Inspiration Library)
-- ------------------------------------------------------------------------------
create table if not exists public.reference_ideas (
  id text primary key,
  project_id text not null,
  added_by_id uuid references auth.users on delete set null,
  added_by_name text not null,
  added_by_avatar text,
  type text default 'reel',
  reel_url text not null,
  video_url text,
  embed_url text,
  shortcode text,
  thumbnail_url text,
  image_url text,
  title text not null,
  hook_notes text,
  likes_count int default 0,
  dislikes_count int default 0,
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 4. Reference Idea Comments / Live Discussion
-- ------------------------------------------------------------------------------
create table if not exists public.idea_comments (
  id text primary key,
  idea_id text not null,
  user_id uuid references auth.users on delete set null,
  user_name text not null,
  user_avatar text,
  comment_text text not null,
  is_outgoing boolean default false,
  pitch_concept text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 5. Scripts (Notepad Studio)
-- ------------------------------------------------------------------------------
create table if not exists public.scripts (
  id text primary key,
  project_id text not null,
  author_id uuid references auth.users on delete set null,
  author_name text not null,
  author_avatar text,
  scripted_by text,
  title text not null,
  hook text,
  body text not null,
  visual_notes text,
  audio_notes text,
  caption text,
  hashtags text,
  attached_reel_id text,
  custom_reel_url text,
  status text default 'Draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 6. Script Comments / Discussion Stream
-- ------------------------------------------------------------------------------
create table if not exists public.script_comments (
  id text primary key,
  script_id text not null,
  user_name text not null,
  user_avatar text,
  comment_text text not null,
  is_outgoing boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 7. Storyboards (Paint Canvas Studio)
-- ------------------------------------------------------------------------------
create table if not exists public.storyboards (
  id text primary key,
  project_id text not null,
  author_id uuid references auth.users on delete set null,
  author_name text,
  author_avatar text,
  created_by text,
  title text not null,
  canvas_data text, -- High resolution PNG Data URL
  attached_reel_id text,
  custom_reel_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 8. Storyboard Comments / Scene Notes Stream
-- ------------------------------------------------------------------------------
create table if not exists public.storyboard_comments (
  id text primary key,
  board_id text not null,
  user_name text not null,
  user_avatar text,
  comment_text text not null,
  is_outgoing boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 9. ADMIN USERS TABLE (Dedicated admin credentials - no sign up)
-- ------------------------------------------------------------------------------
create table if not exists public.admin_users (
  id text primary key,
  username text unique not null,
  email text unique not null,
  password text not null,
  full_name text not null,
  role text default 'Super Admin',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 10. PROJECT ACCESS PERMISSIONS (Admin sets who can see which projects)
-- ------------------------------------------------------------------------------
create table if not exists public.user_permissions (
  id text primary key,
  user_email text unique not null,
  user_name text,
  access_level text default 'all', -- 'all' or 'custom'
  allowed_projects text[] default array[]::text[],
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 11. USER PRESENCE & ONLINE STATUS (Tracking who is presently online)
-- ------------------------------------------------------------------------------
create table if not exists public.user_presence (
  id text primary key,
  user_id text not null,
  user_email text not null,
  user_name text not null,
  user_avatar text,
  status text default 'online', -- 'online', 'idle', 'offline'
  current_page text default 'Dashboard',
  device_info text default 'Desktop Chrome',
  last_heartbeat timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 12. ACTION TIMELINE & AUDIT LOGS (Whole timeline of every action)
-- ------------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id text primary key,
  user_id text,
  user_name text not null,
  user_avatar text,
  action_type text not null,
  target_title text,
  target_project text,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 13. PROFILE ENGAGEMENT METRICS (4 Analytic Graphs: Online, Active, Idle/Left Open, Creative)
-- ------------------------------------------------------------------------------
create table if not exists public.engagement_metrics (
  id text primary key,
  user_email text not null,
  user_name text not null,
  date_str text not null, -- YYYY-MM-DD
  online_minutes int default 0,
  active_using_minutes int default 0,
  idle_open_minutes int default 0,
  creative_action_minutes int default 0,
  actions_count int default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- SAFE COLUMN MIGRATIONS (Ensures previously existing tables receive new columns)
-- ------------------------------------------------------------------------------
alter table if exists public.profiles add column if not exists display_name text;
alter table if exists public.profiles add column if not exists avatar_url text;

alter table if exists public.projects add column if not exists insta_url text;
alter table if exists public.projects add column if not exists bio text;
alter table if exists public.projects add column if not exists avatar_url text;
alter table if exists public.projects add column if not exists followers_count text default '0';
alter table if exists public.projects add column if not exists following_count text default '0';
alter table if exists public.projects add column if not exists posts_count text default '0';
alter table if exists public.projects add column if not exists category text default 'Content Creator';
alter table if exists public.projects add column if not exists browser_session_state jsonb default '{"activeTab": "profile"}'::jsonb;
alter table if exists public.projects add column if not exists followers_numeric bigint default 0;
alter table if exists public.projects add column if not exists attached_profiles jsonb default '[]'::jsonb;
alter table if exists public.projects add column if not exists browser_sections jsonb default '[]'::jsonb;
alter table if exists public.projects alter column followers_count set default '0';
alter table if exists public.projects alter column following_count set default '0';
alter table if exists public.projects alter column posts_count set default '0';

alter table if exists public.reference_ideas add column if not exists video_url text;
alter table if exists public.reference_ideas add column if not exists embed_url text;
alter table if exists public.reference_ideas add column if not exists shortcode text;
alter table if exists public.reference_ideas add column if not exists thumbnail_url text;
alter table if exists public.reference_ideas add column if not exists image_url text;
alter table if exists public.reference_ideas add column if not exists hook_notes text;
alter table if exists public.reference_ideas add column if not exists likes_count int default 0;
alter table if exists public.reference_ideas add column if not exists dislikes_count int default 0;
alter table if exists public.reference_ideas add column if not exists tags text[] default array[]::text[];
alter table if exists public.reference_ideas add column if not exists user_liked boolean default false;
alter table if exists public.reference_ideas add column if not exists user_disliked boolean default false;

alter table if exists public.scripts add column if not exists scripted_by text;
alter table if exists public.scripts add column if not exists hook text;
alter table if exists public.scripts add column if not exists visual_notes text;
alter table if exists public.scripts add column if not exists audio_notes text;
alter table if exists public.scripts add column if not exists caption text;
alter table if exists public.scripts add column if not exists hashtags text;
alter table if exists public.scripts add column if not exists attached_reel_id text;
alter table if exists public.scripts add column if not exists custom_reel_url text;
alter table if exists public.scripts add column if not exists status text default 'Draft';

alter table if exists public.storyboards add column if not exists created_by text;
alter table if exists public.storyboards add column if not exists canvas_data text;
alter table if exists public.storyboards add column if not exists attached_reel_id text;
alter table if exists public.storyboards add column if not exists custom_reel_url text;

-- ------------------------------------------------------------------------------
-- ADMINISTRATOR SETUP
-- ------------------------------------------------------------------------------
-- No administrator is seeded in the distributed schema. Configure development
-- users privately. The current client still contains a local admin fallback;
-- replace it and plaintext password storage before public deployment.

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) & CLEANUP
-- Immune to both 42710 (duplicate policy) and 42P01 (missing table) errors.
-- ------------------------------------------------------------------------------
do $$
declare
  r record;
  t text;
  tables text[] := array[
    'profiles', 'projects', 'reference_ideas', 'idea_comments',
    'scripts', 'script_comments', 'storyboards', 'storyboard_comments',
    'admin_users', 'user_permissions', 'user_presence',
    'activity_logs', 'engagement_metrics'
  ];
begin
  -- 1. Cleanly drop ANY existing or legacy policies on existing tables
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(tables)
  ) loop
    execute format('drop policy if exists %I on %I.%I;', r.policyname, r.schemaname, r.tablename);
  end loop;

  -- 2. Enable RLS and create permissive collaboration policy for each table that exists
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security;', t);
      execute format('drop policy if exists %I on public.%I;', 'Allow all users access to ' || t, t);
      execute format('drop policy if exists %I on public.%I;', 'Allow all authenticated users access to ' || t, t);
      execute format('create policy %I on public.%I for all to public using (true) with check (true);', 'Allow all users access to ' || t, t);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------------------------
-- 14. REALTIME REPLICATION (Instant Realtime updates for Presence & Permissions)
-- ------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.user_presence; exception when others then null; end;
    begin alter publication supabase_realtime add table public.user_permissions; exception when others then null; end;
    begin alter publication supabase_realtime add table public.activity_logs; exception when others then null; end;
    begin alter publication supabase_realtime add table public.profiles; exception when others then null; end;
    begin alter publication supabase_realtime add table public.projects; exception when others then null; end;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 15. AUTH USERS SYNC & ADMIN USER DISCOVERY
-- Enables Admin Portal to instantly list all accounts directly from Supabase Auth
-- ------------------------------------------------------------------------------
create or replace function public.get_auth_users()
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) as display_name,
    coalesce(u.raw_user_meta_data->>'avatar_url', '') as avatar_url,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  order by u.created_at desc;
$$;

grant execute on function public.get_auth_users() to public, anon, authenticated;

-- Automatic trigger to mirror new auth.users into public.profiles
create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync
  after insert or update on auth.users
  for each row execute procedure public.handle_auth_user_sync();

-- Populate any existing auth users into public.profiles immediately
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'avatar_url', '')
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.profiles.display_name),
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

