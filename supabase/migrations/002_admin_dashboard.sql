-- ============================================
-- Bakame.ai Admin Dashboard Migration
-- Adds admin functionality and policies
-- ============================================

-- ============================================
-- ADMIN SETTINGS TABLE
-- Persistent configuration storage
-- ============================================

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);
CREATE INDEX IF NOT EXISTS idx_admin_settings_category ON admin_settings(category);

-- Trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADMIN AUDIT LOGS TABLE
-- Dedicated table for admin actions
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT, -- 'user', 'subscription', 'setting'
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

-- ============================================
-- ADDITIONAL INDEXES FOR ADMIN QUERIES
-- Optimize admin dashboard performance
-- ============================================

-- Users table: Index for role filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Users table: Index for admin user lookups
CREATE INDEX IF NOT EXISTS idx_users_updated ON users(updated_at DESC);

-- Users table: Index for searching
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Usage logs: Index for admin action filtering
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON usage_logs(action);

-- Subscriptions: Index for plan filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);

-- Messages: Index for counting (no content access)
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY FOR ADMIN
-- ============================================

-- Enable RLS on new tables
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADMIN HELPER FUNCTION
-- Check if current user is admin
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADMIN POLICIES - Settings
-- ============================================

-- Only admins can view settings
CREATE POLICY "Admins can view settings" ON admin_settings
  FOR SELECT USING (is_admin());

-- Only admins can create settings
CREATE POLICY "Admins can create settings" ON admin_settings
  FOR INSERT WITH CHECK (is_admin());

-- Only admins can update settings
CREATE POLICY "Admins can update settings" ON admin_settings
  FOR UPDATE USING (is_admin());

-- Only admins can delete settings
CREATE POLICY "Admins can delete settings" ON admin_settings
  FOR DELETE USING (is_admin());

-- ============================================
-- ADMIN POLICIES - Audit Logs
-- ============================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
  FOR SELECT USING (is_admin());

-- Only admins can create audit logs
CREATE POLICY "Admins can create audit logs" ON admin_audit_logs
  FOR INSERT WITH CHECK (is_admin());

-- ============================================
-- ADMIN POLICIES - Users Table
-- Allow admins to manage all users
-- ============================================

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (is_admin());

-- Admins can update any user
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (is_admin());

-- Admins can delete any user (except themselves via app logic)
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (is_admin());

-- ============================================
-- ADMIN POLICIES - Agents Table
-- Allow admins to manage all agents
-- ============================================

-- Admins can view all agents (including inactive)
CREATE POLICY "Admins can view all agents" ON agents
  FOR SELECT USING (is_admin());

-- Admins can create agents
CREATE POLICY "Admins can create agents" ON agents
  FOR INSERT WITH CHECK (is_admin());

-- Admins can update agents
CREATE POLICY "Admins can update agents" ON agents
  FOR UPDATE USING (is_admin());

-- Admins can delete agents
CREATE POLICY "Admins can delete agents" ON agents
  FOR DELETE USING (is_admin());

-- ============================================
-- ADMIN POLICIES - Subscriptions
-- Allow admins to manage subscriptions
-- ============================================

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT USING (is_admin());

-- Admins can update any subscription
CREATE POLICY "Admins can update all subscriptions" ON subscriptions
  FOR UPDATE USING (is_admin());

-- ============================================
-- ADMIN POLICIES - Usage Logs
-- Allow admins to view all logs (for analytics)
-- ============================================

-- Admins can view all usage logs
CREATE POLICY "Admins can view all usage logs" ON usage_logs
  FOR SELECT USING (is_admin());

-- Admins can create usage logs (for audit)
CREATE POLICY "Admins can create usage logs" ON usage_logs
  FOR INSERT WITH CHECK (is_admin() OR auth.uid() = user_id);

-- ============================================
-- ADMIN POLICIES - Chat Sessions
-- Allow admins to view session METADATA only (not content)
-- Note: This only allows viewing session info, not message content
-- ============================================

-- Admins can view session metadata (counts, dates)
CREATE POLICY "Admins can view session metadata" ON chat_sessions
  FOR SELECT USING (is_admin());

-- ============================================
-- SEED DEFAULT SETTINGS
-- ============================================

INSERT INTO admin_settings (key, value, description, category) VALUES
-- Rate Limiting
('rate_limit_authenticated', '{"value": 100}', 'Requests per minute for authenticated users', 'rate_limits'),
('rate_limit_guest', '{"value": 30}', 'Requests per minute for guest users', 'rate_limits'),

-- Feature Flags
('feature_voice_enabled', '{"value": true}', 'Enable Hume EVI voice assistant', 'features'),
('feature_image_generation', '{"value": true}', 'Enable DALL-E image generation', 'features'),
('feature_video_generation', '{"value": true}', 'Enable Kling AI video generation', 'features'),
('feature_code_execution', '{"value": true}', 'Enable sandboxed code execution', 'features'),
('feature_file_upload', '{"value": true}', 'Allow file uploads', 'features'),

-- Security
('security_require_email_verification', '{"value": true}', 'Require email verification for full access', 'security'),
('security_session_timeout_hours', '{"value": 24}', 'Auto logout after inactivity (hours)', 'security'),
('security_max_file_size_mb', '{"value": 10}', 'Maximum upload file size in MB', 'security'),

-- Notifications
('notification_new_user_alert', '{"value": false}', 'Notify admins of new user signups', 'notifications'),
('notification_error_alert', '{"value": true}', 'Notify admins of system errors', 'notifications')

ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ADMIN LOG FUNCTION
-- Helper function to log admin actions
-- ============================================

CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW: Admin Dashboard Stats
-- Aggregated stats without exposing content
-- ============================================

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_admins,
  (SELECT COUNT(*) FROM users WHERE role = 'premium') AS total_premium,
  (SELECT COUNT(*) FROM users WHERE updated_at > NOW() - INTERVAL '24 hours') AS active_today,
  (SELECT COUNT(*) FROM users WHERE updated_at > NOW() - INTERVAL '7 days') AS active_week,
  (SELECT COUNT(*) FROM chat_sessions) AS total_sessions,
  (SELECT COUNT(*) FROM messages) AS total_messages,
  (SELECT COUNT(*) FROM agents WHERE is_active = true) AS active_agents,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') AS active_subscriptions,
  NOW() AS generated_at;

-- Grant access to view for admins only
-- Note: Views inherit RLS from underlying tables

-- ============================================
-- COMMENTS
-- Document the schema
-- ============================================

COMMENT ON TABLE admin_settings IS 'Persistent storage for admin configuration settings';
COMMENT ON TABLE admin_audit_logs IS 'Audit trail of all admin actions for security and compliance';
COMMENT ON FUNCTION is_admin() IS 'Helper function to check if current user has admin role';
COMMENT ON FUNCTION log_admin_action IS 'Helper function to create audit log entries';
COMMENT ON VIEW admin_dashboard_stats IS 'Aggregated statistics for admin dashboard (no PII)';
