-- Run this in your Supabase SQL Editor to set up the database

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Notes
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null default 'Untitled',
  content jsonb,
  tags text[] default '{}',
  parent_id uuid references public.notes(id) on delete set null,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index notes_user_id_idx on public.notes(user_id);
create index notes_tags_idx on public.notes using gin(tags);

-- Note Connections
create table public.note_connections (
  id uuid default uuid_generate_v4() primary key,
  note_a_id uuid references public.notes(id) on delete cascade not null,
  note_b_id uuid references public.notes(id) on delete cascade not null,
  label text,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(note_a_id, note_b_id)
);

-- Todo Lists
create table public.todo_lists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text,
  created_at timestamptz default now()
);

-- Todos
create table public.todos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  list_id uuid references public.todo_lists(id) on delete set null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  completed boolean default false,
  completed_at timestamptz,
  parent_id uuid references public.todos(id) on delete cascade,
  order_index integer default 0,
  recurrence text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index todos_user_id_idx on public.todos(user_id);
create index todos_due_date_idx on public.todos(due_date);

-- Reminders
create table public.reminders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  remind_at timestamptz not null,
  recurrence text,
  is_dismissed boolean default false,
  linked_todo_id uuid references public.todos(id) on delete set null,
  linked_note_id uuid references public.notes(id) on delete set null,
  created_at timestamptz default now()
);

create index reminders_user_id_idx on public.reminders(user_id);
create index reminders_remind_at_idx on public.reminders(remind_at);

-- Journal Entries
create table public.journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  content jsonb,
  mood integer check (mood >= 1 and mood <= 5),
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create index journal_entries_user_id_idx on public.journal_entries(user_id);

-- Projects
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'planning' check (status in ('planning', 'active', 'paused', 'completed', 'archived')),
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Project Tasks
create table public.project_tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'todo' check (status in ('backlog', 'todo', 'in_progress', 'review', 'done')),
  order_index integer default 0,
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Calendar Events
create table public.calendar_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  google_event_id text unique,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean default false,
  color text,
  synced_at timestamptz,
  created_at timestamptz default now()
);

create index calendar_events_user_id_idx on public.calendar_events(user_id);
create index calendar_events_start_time_idx on public.calendar_events(start_time);

-- Travel Plans
create table public.travel_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  budget numeric,
  currency text default 'USD',
  itinerary jsonb default '[]'::jsonb,
  packing_list jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Idea Boards
create table public.idea_boards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Idea Nodes
create table public.idea_nodes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  idea_board_id uuid references public.idea_boards(id) on delete cascade not null,
  title text not null,
  content text,
  parent_id uuid references public.idea_nodes(id) on delete set null,
  position_x float default 0,
  position_y float default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.note_connections enable row level security;
alter table public.todo_lists enable row level security;
alter table public.todos enable row level security;
alter table public.reminders enable row level security;
alter table public.journal_entries enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.travel_plans enable row level security;
alter table public.idea_boards enable row level security;
alter table public.idea_nodes enable row level security;

-- RLS Policies: Users can only access their own data
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can CRUD own notes" on public.notes for all using (auth.uid() = user_id);
create policy "Users can CRUD own connections" on public.note_connections for all using (auth.uid() = user_id);
create policy "Users can CRUD own todo lists" on public.todo_lists for all using (auth.uid() = user_id);
create policy "Users can CRUD own todos" on public.todos for all using (auth.uid() = user_id);
create policy "Users can CRUD own reminders" on public.reminders for all using (auth.uid() = user_id);
create policy "Users can CRUD own journal entries" on public.journal_entries for all using (auth.uid() = user_id);
create policy "Users can CRUD own projects" on public.projects for all using (auth.uid() = user_id);
create policy "Users can CRUD own project tasks" on public.project_tasks for all using (auth.uid() = user_id);
create policy "Users can CRUD own calendar events" on public.calendar_events for all using (auth.uid() = user_id);
create policy "Users can CRUD own travel plans" on public.travel_plans for all using (auth.uid() = user_id);
create policy "Users can CRUD own idea boards" on public.idea_boards for all using (auth.uid() = user_id);
create policy "Users can CRUD own idea nodes" on public.idea_nodes for all using (auth.uid() = user_id);

-- Updated_at trigger function
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_notes_updated_at before update on public.notes for each row execute function public.update_updated_at();
create trigger update_todos_updated_at before update on public.todos for each row execute function public.update_updated_at();
create trigger update_journal_entries_updated_at before update on public.journal_entries for each row execute function public.update_updated_at();
create trigger update_projects_updated_at before update on public.projects for each row execute function public.update_updated_at();
create trigger update_project_tasks_updated_at before update on public.project_tasks for each row execute function public.update_updated_at();
create trigger update_travel_plans_updated_at before update on public.travel_plans for each row execute function public.update_updated_at();
create trigger update_idea_boards_updated_at before update on public.idea_boards for each row execute function public.update_updated_at();
create trigger update_idea_nodes_updated_at before update on public.idea_nodes for each row execute function public.update_updated_at();
create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at();
