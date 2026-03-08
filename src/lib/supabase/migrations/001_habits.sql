create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  frequency text default 'daily' check (frequency in ('daily', 'weekly')),
  color text default '#3b82f6',
  target_count integer default 1,
  is_archived boolean default false,
  created_at timestamptz default now()
);

create table public.habit_completions (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed_date date not null,
  count integer default 1,
  created_at timestamptz default now(),
  unique(habit_id, completed_date)
);

alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
create policy "Users can CRUD own habits" on public.habits for all using (auth.uid() = user_id);
create policy "Users can CRUD own habit completions" on public.habit_completions for all using (auth.uid() = user_id);
