-- Add deleted_at column to key tables for soft delete
alter table public.notes add column if not exists deleted_at timestamptz;
alter table public.todos add column if not exists deleted_at timestamptz;
alter table public.projects add column if not exists deleted_at timestamptz;
alter table public.bookmarks add column if not exists deleted_at timestamptz;

create index notes_deleted_at_idx on public.notes(deleted_at);
create index todos_deleted_at_idx on public.todos(deleted_at);

-- Add pinned columns
alter table public.notes add column if not exists is_pinned boolean default false;
alter table public.todos add column if not exists is_pinned boolean default false;
alter table public.projects add column if not exists is_pinned boolean default false;
