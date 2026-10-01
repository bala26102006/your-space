-- Supabase Schema for Your Space
-- Run this in your Supabase SQL Editor

-- 1. Workspaces
CREATE TABLE workspaces (
  id text PRIMARY KEY,
  label text NOT NULL,
  icon text NOT NULL,
  sort_order integer NOT NULL
);

INSERT INTO workspaces (id, label, icon, sort_order) VALUES
  ('quicknotes', 'Quick Notes', 'StickyNote', 1),
  ('projects', 'Projects', 'FolderKanban', 2),
  ('journal', 'Journal', 'BookOpen', 3),
  ('checklists', 'Checklists', 'CheckSquare', 4),
  ('wishlist', 'Wish List', 'Sparkles', 5),
  ('routines', 'Routines', 'Repeat', 6),
  ('sketch', 'Sketch', 'Palette', 7);

-- 2. Projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  color text,
  is_archived boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Subprojects
CREATE TABLE subprojects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer,
  is_archived boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Notes
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text REFERENCES workspaces(id),
  subproject_id uuid REFERENCES subprojects(id) ON DELETE CASCADE,
  note_type text NOT NULL,
  title text NOT NULL,
  content jsonb,
  color text,
  is_pinned boolean DEFAULT false,
  mood text,
  entry_date date,
  is_archived boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  sort_order integer,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Tags
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now()
);

-- 6. Note Tags
CREATE TABLE note_tags (
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- 7. Attachments
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  type text NOT NULL,
  storage_path text NOT NULL,
  thumbnail_data text,
  created_at timestamptz DEFAULT now()
);

-- 8. Checklist Items
CREATE TABLE checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_checked boolean DEFAULT false,
  sort_order integer
);

-- 9. Wishlist Items
CREATE TABLE wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  label text NOT NULL,
  price numeric,
  is_checked boolean DEFAULT false,
  url text,
  sort_order integer
);

-- 10. Routine Entries
CREATE TABLE routine_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  period text NOT NULL,
  entry_date date NOT NULL,
  is_completed boolean DEFAULT false,
  streak_count integer DEFAULT 0
);

-- 11. AI Memory
CREATE TABLE ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type text NOT NULL,
  scope_id uuid NOT NULL,
  action text NOT NULL,
  input_hash text NOT NULL,
  output jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS setup
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspaces are viewable by everyone" ON workspaces FOR SELECT USING (true);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own projects" ON projects FOR ALL USING (auth.uid() = user_id);

ALTER TABLE subprojects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own subprojects" ON subprojects FOR ALL USING (auth.uid() = user_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notes" ON notes FOR ALL USING (auth.uid() = user_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tags" ON tags FOR ALL USING (auth.uid() = user_id);

ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
-- For join table, we need to ensure the user owns the note or tag.
CREATE POLICY "Users can manage their own note_tags" ON note_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM notes WHERE id = note_id AND user_id = auth.uid())
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own attachments" ON attachments FOR ALL USING (
  EXISTS (SELECT 1 FROM notes WHERE id = note_id AND user_id = auth.uid())
);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own checklist_items" ON checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM notes WHERE id = note_id AND user_id = auth.uid())
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own wishlist_items" ON wishlist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM notes WHERE id = note_id AND user_id = auth.uid())
);

ALTER TABLE routine_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own routine_entries" ON routine_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM notes WHERE id = note_id AND user_id = auth.uid())
);

ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own ai_memory" ON ai_memory FOR ALL USING (auth.uid() = user_id);

-- Subscriptions / realtime replication
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table subprojects;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table tags;
alter publication supabase_realtime add table note_tags;
alter publication supabase_realtime add table attachments;
alter publication supabase_realtime add table checklist_items;
alter publication supabase_realtime add table wishlist_items;
alter publication supabase_realtime add table routine_entries;
