-- Activity feed table
-- Run this in your Supabase SQL editor to add the activity table

CREATE TABLE IF NOT EXISTS activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'moved', 'commented', 'assigned', 'deleted')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_activity_project ON activity(project_id);
CREATE INDEX idx_activity_created ON activity(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE activity;
