-- SQL Schema for SoloFlow Supabase Sync
-- Copy and run this script in your Supabase SQL Editor to set up the tables.

-- Create categories table
create table if not exists public.categories (
    id text primary key,
    name text not null,
    color text not null,
    is_system boolean default false,
    is_project boolean default false,
    description text,
    milestones jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS (Row Level Security)
alter table public.categories enable row level security;

-- Create policies (Allow anonymous users to perform all actions)
create policy "Allow all operations for anon" on public.categories
    for all using (true) with check (true);

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
    "order" integer default 0
);

-- Enable RLS
alter table public.todos enable row level security;

-- Create policies
create policy "Allow all operations for anon" on public.todos
    for all using (true) with check (true);
