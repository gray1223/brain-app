-- Migration: Feature upgrades for Ideas, Habits, Bookmarks, Todos, and Idea Connections
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================================
-- 1. BOOKMARKS: add collection and favicon columns
-- ============================================================
ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS collection text,
  ADD COLUMN IF NOT EXISTS favicon text;

-- ============================================================
-- 2. TODOS: add project_id linking todos to projects
-- ============================================================
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_todos_project_id ON todos(project_id);

-- ============================================================
-- 3. IDEA_NODES: add rich content, categories, starring, promotion
-- ============================================================
ALTER TABLE idea_nodes
  ADD COLUMN IF NOT EXISTS rich_content jsonb,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('thought', 'question', 'evidence', 'action')),
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_to text CHECK (promoted_to IN ('note', 'todo', 'project')),
  ADD COLUMN IF NOT EXISTS promoted_id uuid;

-- ============================================================
-- 4. IDEA_NODE_CONNECTIONS: new table for canvas connections
-- ============================================================
CREATE TABLE IF NOT EXISTS idea_node_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_board_id uuid NOT NULL REFERENCES idea_boards(id) ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES idea_nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES idea_nodes(id) ON DELETE CASCADE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idea_node_connections_board ON idea_node_connections(idea_board_id);
CREATE INDEX IF NOT EXISTS idx_idea_node_connections_user ON idea_node_connections(user_id);

-- RLS for idea_node_connections
ALTER TABLE idea_node_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own idea connections"
  ON idea_node_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own idea connections"
  ON idea_node_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own idea connections"
  ON idea_node_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own idea connections"
  ON idea_node_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. HABITS: add order_index for reordering
-- ============================================================
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

-- Backfill order_index based on existing created_at order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM habits
)
UPDATE habits SET order_index = ranked.rn
FROM ranked WHERE habits.id = ranked.id AND habits.order_index = 0;

-- ============================================================
-- 6. HABIT_COMPLETIONS: add note field
-- ============================================================
ALTER TABLE habit_completions
  ADD COLUMN IF NOT EXISTS note text;
