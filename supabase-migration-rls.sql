-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- Run this AFTER enabling RLS on all tables
-- =====================================================

-- First, enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES
-- =====================================================
-- Anyone can read profiles (needed for displaying names/emails)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- PROJECTS
-- =====================================================
-- Members can view projects they belong to
CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can create projects
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners and admins can update projects
CREATE POLICY "Owners and admins can update projects"
  ON projects FOR UPDATE
  USING (
    id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners can delete projects
CREATE POLICY "Owners can delete projects"
  ON projects FOR DELETE
  USING (
    id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- PROJECT_MEMBERS
-- =====================================================
-- Members can view other members in their projects
CREATE POLICY "Members can view project members"
  ON project_members FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Owners and admins can add members
CREATE POLICY "Owners and admins can add members"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can remove members
CREATE POLICY "Owners and admins can remove members"
  ON project_members FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- TASKS
-- =====================================================
-- Members can view tasks in their projects
CREATE POLICY "Members can view tasks"
  ON tasks FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Members can create tasks in their projects
CREATE POLICY "Members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Members can update tasks in their projects
CREATE POLICY "Members can update tasks"
  ON tasks FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Members can delete tasks in their projects
CREATE POLICY "Members can delete tasks"
  ON tasks FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================
-- Members can view comments on tasks in their projects
CREATE POLICY "Members can view comments"
  ON comments FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Members can create comments on tasks in their projects
CREATE POLICY "Members can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- ACTIVITY
-- =====================================================
-- Members can view activity in their projects
CREATE POLICY "Members can view activity"
  ON activity FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Members can create activity entries
CREATE POLICY "Members can create activity"
  ON activity FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- System can create notifications (via service role or function)
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);
