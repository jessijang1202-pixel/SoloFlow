-- SQL Schema for SoloFlow Supabase Sync (With Auth & RLS support)
-- Copy and run this script in your Supabase SQL Editor to set up the tables and migrate.

-- Create categories table
create table if not exists public.categories (
    id text primary key,
    name text not null,
    color text not null,
    is_system boolean default false,
    is_project boolean default false,
    description text,
    milestones jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    user_id uuid references auth.users(id) on delete cascade default auth.uid()
);

-- Ensure user_id column exists (migration support if table already exists)
alter table public.categories add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- Enable RLS (Row Level Security)
alter table public.categories enable row level security;

-- Drop old policies
drop policy if exists "Allow all operations for anon" on public.categories;
drop policy if exists "Allow read access to system or owner categories" on public.categories;
drop policy if exists "Allow insert for authenticated users owning category" on public.categories;
drop policy if exists "Allow update for owners" on public.categories;
drop policy if exists "Allow delete for owners" on public.categories;

-- Create policies for categories
create policy "Allow read access to system or owner categories" on public.categories
    for select using (is_system = true or auth.uid() = user_id);

create policy "Allow insert for authenticated users owning category" on public.categories
    for insert with check (auth.uid() = user_id or (is_system = true and user_id is null));

create policy "Allow update for owners" on public.categories
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Allow delete for owners" on public.categories
    for delete using (auth.uid() = user_id);


-- Create todos table
create table if not exists public.todos (
    id text primary key,
    title text not null,
    category_id text, -- Mapped to category ID without hard FK constraint for robust offline/sync stability
    due_date text not null, -- YYYY-MM-DD
    priority text default 'medium',
    status text default 'todo',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    completed_at timestamp with time zone,
    rolled_over_from text,
    note text,
    is_weekly_goal boolean default false,
    is_monthly_goal boolean default false,
    "order" integer default 0,
    user_id uuid references auth.users(id) on delete cascade default auth.uid()
);

-- Ensure user_id column exists (migration support if table already exists)
alter table public.todos add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- Enable RLS
alter table public.todos enable row level security;

-- Drop old policies
drop policy if exists "Allow all operations for anon" on public.todos;
drop policy if exists "Allow all operations for owner todos" on public.todos;

-- Create policies for todos
create policy "Allow all operations for owner todos" on public.todos
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
