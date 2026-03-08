-- Quick Capture Inbox
create table public.captures (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  processed boolean default false,
  converted_to text, -- 'note', 'todo', 'bookmark'
  converted_id uuid,
  created_at timestamptz default now()
);

-- Bookmarks / Reading List
create table public.bookmarks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  title text not null,
  description text,
  tags text[] default '{}',
  is_read boolean default false,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

-- Flashcards
create table public.flashcard_decks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.flashcards (
  id uuid default uuid_generate_v4() primary key,
  deck_id uuid references public.flashcard_decks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  front text not null,
  back text not null,
  ease_factor float default 2.5,
  interval_days integer default 0,
  next_review date default current_date,
  review_count integer default 0,
  created_at timestamptz default now()
);

alter table public.captures enable row level security;
alter table public.bookmarks enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
create policy "Users can CRUD own captures" on public.captures for all using (auth.uid() = user_id);
create policy "Users can CRUD own bookmarks" on public.bookmarks for all using (auth.uid() = user_id);
create policy "Users can CRUD own flashcard decks" on public.flashcard_decks for all using (auth.uid() = user_id);
create policy "Users can CRUD own flashcards" on public.flashcards for all using (auth.uid() = user_id);

create trigger update_flashcard_decks_updated_at before update on public.flashcard_decks for each row execute function public.update_updated_at();
