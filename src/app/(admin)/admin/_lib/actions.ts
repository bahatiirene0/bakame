'use server';

/**
 * Admin Server Actions
 *
 * Secure server-side actions for admin operations.
 * All actions verify admin role before executing.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { UserRole, SubscriptionPlan, SubscriptionStatus, Json, User, Subscription, AdminAuditLog, AdminSetting, UsageLog } from '@/lib/supabase/types';

// Type helper for Supabase query results
type QueryResult<T> = { data: T | null; error: Error | null; count?: number | null };
type QueryResultArray<T> = { data: T[] | null; error: Error | null; count?: number | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ============================================
// Helper: Verify Admin Access
// ============================================

async function verifyAdmin(): Promise<{ supabase: AnySupabase; userId: string }> {
  // Cast to any to avoid Supabase type inference issues
  const supabase = await createServerSupabaseClient() as AnySupabase;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: Not authenticated');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  return { supabase, userId: user.id };
}

// ============================================
// Dashboard Stats
// ============================================

export async function getDashboardStats() {
  const { supabase } = await verifyAdmin();

  // Get counts in parallel
  const [
    usersResult,
    sessionsResult,
    messagesResult,
    activeUsersResult,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('chat_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    totalUsers: usersResult.count || 0,
    totalSessions: sessionsResult.count || 0,
    totalMessages: messagesResult.count || 0,
    activeToday: activeUsersResult.count || 0,
  };
}

export async function getRecentActivity() {
  const { supabase } = await verifyAdmin();

  // Get recent user signups (last 7 days, aggregated by day)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentUsers } = await supabase
    .from('users')
    .select('created_at')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: true });

  // Aggregate by day
  const dailySignups: Record<string, number> = {};
  recentUsers?.forEach((user: { created_at: string }) => {
    const date = new Date(user.created_at).toLocaleDateString('en-US', {
      weekday: 'short',
    });
    dailySignups[date] = (dailySignups[date] || 0) + 1;
  });

  return {
    dailySignups: Object.entries(dailySignups).map(([label, value]) => ({
      label,
      value,
    })),
  };
}

export async function getToolUsageStats() {
  const { supabase } = await verifyAdmin();

  // Get tool usage from usage_logs
  const { data: toolLogs } = await supabase
    .from('usage_logs')
    .select('action, metadata')
    .eq('action', 'tool_executed')
    .limit(1000);

  // Aggregate by tool name
  const toolCounts: Record<string, number> = {};
  toolLogs?.forEach((log: { metadata: Record<string, unknown> | null }) => {
    const toolName = log.metadata?.tool_name as string;
    if (toolName) {
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
    }
  });

  // Sort by usage and take top 8
  const sortedTools = Object.entries(toolCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return sortedTools;
}

// ============================================
// User Management
// ============================================

export async function getUsers(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 20, search, role } = options || {};

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (role) {
    query = query.eq('role', role);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    users: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getUserById(userId: string) {
  const { supabase } = await verifyAdmin();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;

  // Get user stats (counts only - no content)
  const [sessionsResult, messagesResult, subscriptionResult] = await Promise.all([
    supabase
      .from('chat_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', userId),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single(),
  ]);

  return {
    ...user,
    stats: {
      totalSessions: sessionsResult.count || 0,
      totalMessages: messagesResult.count || 0,
    },
    subscription: subscriptionResult.data,
  };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { supabase, userId: adminId } = await verifyAdmin();

  // Prevent admin from demoting themselves
  if (userId === adminId && role !== 'admin') {
    throw new Error('Cannot change your own admin role');
  }

  const { error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;

  // Log the action
  await logAdminAction(supabase, adminId, 'update_user_role', 'user', userId, {
    new_role: role,
  });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function suspendUser(userId: string, suspended: boolean) {
  const { supabase, userId: adminId } = await verifyAdmin();

  // Prevent admin from suspending themselves
  if (userId === adminId) {
    throw new Error('Cannot suspend your own account');
  }

  const { error } = await supabase
    .from('users')
    .update({
      metadata: { suspended, suspended_at: suspended ? new Date().toISOString() : null },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction(supabase, adminId, suspended ? 'suspend_user' : 'unsuspend_user', 'user', userId);

  revalidatePath('/admin/users');
  return { success: true };
}

export async function deleteUser(userId: string) {
  const { supabase, userId: adminId } = await verifyAdmin();

  if (userId === adminId) {
    throw new Error('Cannot delete your own account');
  }

  // Delete from users table (cascades to related data)
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction(supabase, adminId, 'delete_user', 'user', userId);

  revalidatePath('/admin/users');
  return { success: true };
}

// ============================================
// Subscription Management
// ============================================

export async function getSubscriptions(options?: {
  page?: number;
  pageSize?: number;
  status?: SubscriptionStatus;
  plan?: SubscriptionPlan;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 20, status, plan } = options || {};

  let query = supabase
    .from('subscriptions')
    .select('*, users(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq('status', status);
  if (plan) query = query.eq('plan', plan);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    subscriptions: data || [],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function updateSubscription(
  subscriptionId: string,
  updates: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    current_period_end?: string;
  }
) {
  const { supabase, userId } = await verifyAdmin();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(supabase, userId, 'update_subscription', 'subscription', subscriptionId, {
    updates,
  });

  revalidatePath('/admin/subscriptions');
  return data;
}

// ============================================
// Audit Logs
// ============================================

async function logAdminAction(
  supabase: AnySupabase,
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details: Record<string, unknown> = {}
) {
  // Get request headers for IP and user agent
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || null;
  const userAgent = headersList.get('user-agent') || null;

  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details as Json,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

export async function getAuditLogs(options?: {
  page?: number;
  pageSize?: number;
  action?: string;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 50, action } = options || {};

  let query = supabase
    .from('admin_audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (action) {
    query = query.eq('action', action);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    logs: data || [],
    total: count || 0,
    page,
    pageSize,
  };
}

// ============================================
// Settings Management
// ============================================

export async function getSettings(category?: string) {
  const { supabase } = await verifyAdmin();

  let query = supabase
    .from('admin_settings')
    .select('*')
    .order('category')
    .order('key');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getSetting(key: string) {
  const { supabase } = await verifyAdmin();

  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function updateSetting(key: string, value: unknown) {
  const { supabase, userId } = await verifyAdmin();

  const { data, error } = await supabase
    .from('admin_settings')
    .update({
      value: { value } as Json,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(supabase, userId, 'update_setting', 'setting', undefined, {
    setting_key: key,
  });

  revalidatePath('/admin/settings');
  return data;
}

export async function updateSettings(settings: Array<{ key: string; value: unknown }>) {
  const { supabase, userId } = await verifyAdmin();

  // Update all settings in parallel
  const results = await Promise.all(
    settings.map(({ key, value }) =>
      supabase
        .from('admin_settings')
        .update({
          value: { value } as Json,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key)
        .select()
        .single()
    )
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to update ${errors.length} settings`);
  }

  await logAdminAction(supabase, userId, 'update_settings', 'setting', undefined, {
    updated_keys: settings.map((s) => s.key),
  });

  revalidatePath('/admin/settings');
  return results.map((r) => r.data);
}

// ============================================
// System Health
// ============================================

export async function getSystemHealth() {
  const { supabase } = await verifyAdmin();

  // Check database connectivity
  const dbStart = Date.now();
  const { error: dbError } = await supabase.from('users').select('id').limit(1);
  const dbLatency = Date.now() - dbStart;

  // Get table sizes (approximate row counts)
  const [users, sessions, messages, agents] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('chat_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase.from('agents').select('id', { count: 'exact', head: true }),
  ]);

  return {
    database: {
      status: dbError ? 'error' : 'healthy',
      latency: dbLatency,
      error: dbError?.message,
    },
    tables: {
      users: users.count || 0,
      chat_sessions: sessions.count || 0,
      messages: messages.count || 0,
      agents: agents.count || 0,
    },
    timestamp: new Date().toISOString(),
  };
}
