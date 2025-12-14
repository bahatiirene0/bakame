/**
 * Admin Module Types
 *
 * Centralized type definitions for admin features
 */

import { User, Subscription, AdminAuditLog } from '@/lib/supabase/types';

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  activeToday: number;
}

export interface DailyActivity {
  label: string;
  value: number;
}

export interface ToolUsageStat {
  label: string;
  value: number;
  color?: string;
}

// ============================================
// User Management Types
// ============================================

export interface UserWithStats extends User {
  stats: {
    totalSessions: number;
    totalMessages: number;
  };
  subscription?: Subscription;
}

export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


// ============================================
// Subscription Types
// ============================================

export interface SubscriptionWithUser extends Subscription {
  users: {
    name: string | null;
    email: string | null;
  } | null;
}

export interface SubscriptionListResult {
  subscriptions: SubscriptionWithUser[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// Audit Log Types
// ============================================

export type AuditLogEntry = AdminAuditLog;

export interface AuditLogListResult {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// System Health Types
// ============================================

export interface SystemHealthStatus {
  database: {
    status: 'healthy' | 'warning' | 'error';
    latency: number;
    error?: string;
  };
  tables: {
    users: number;
    chat_sessions: number;
    messages: number;
    agents: number;
  };
  timestamp: string;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  detail?: string;
  latency?: number;
}

// ============================================
// Settings Types
// ============================================

export interface Setting {
  key: string;
  label: string;
  description: string;
  type: 'toggle' | 'number' | 'select' | 'text';
  value: boolean | number | string;
  options?: { label: string; value: string }[];
}

export interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  settings: Setting[];
}

// ============================================
// Common Types
// ============================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}
