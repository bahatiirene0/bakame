'use client';

/**
 * Audit Logs Page
 *
 * View admin action history
 */

import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Filter, RefreshCw } from 'lucide-react';
import { PageHeader, DataTable, Badge, LoadingState, EmptyState } from '../_components';
import { getAuditLogs } from '../_lib/actions';
import type { Column } from '../_components/ui/DataTable';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  update_user_role: { label: 'Role Changed', variant: 'info' },
  suspend_user: { label: 'User Suspended', variant: 'warning' },
  unsuspend_user: { label: 'User Unsuspended', variant: 'success' },
  delete_user: { label: 'User Deleted', variant: 'error' },
  update_subscription: { label: 'Subscription Updated', variant: 'info' },
  update_setting: { label: 'Setting Updated', variant: 'info' },
  update_settings: { label: 'Settings Updated', variant: 'info' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAuditLogs({
        action: actionFilter || undefined,
      });
      setLogs(result.logs as AuditLog[]);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (log) => {
        const config = ACTION_LABELS[log.action] || { label: log.action.replace(/_/g, ' '), variant: 'default' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'target',
      header: 'Target',
      render: (log) => {
        if (!log.target_type && !log.target_id) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {log.target_type && <span className="capitalize">{log.target_type}: </span>}
            {log.target_id && <span className="font-mono">{log.target_id.slice(0, 8)}...</span>}
          </span>
        );
      },
    },
    {
      key: 'details',
      header: 'Details',
      render: (log) => {
        const details = log.details || {};
        const entries = Object.entries(details).slice(0, 2);

        if (entries.length === 0) {
          return <span className="text-sm text-gray-400">-</span>;
        }

        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {entries.map(([key, val]) => `${key}: ${val}`).join(' • ')}
          </span>
        );
      },
    },
    {
      key: 'admin_id',
      header: 'Admin',
      render: (log) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {log.admin_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (log) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(log.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description={`${total} admin actions recorded`}
        actions={
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-10 pr-8 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action.replace('admin_', '')}>
                {ACTION_LABELS[action]?.label || action.replace('admin_', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <LoadingState message="Loading audit logs..." />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs yet"
          description="Admin actions will appear here once performed"
        />
      ) : (
        <DataTable
          data={logs}
          columns={columns}
          keyExtractor={(log) => log.id}
          pageSize={20}
          emptyMessage="No logs found"
        />
      )}

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <strong>Note:</strong> Audit logs track administrative actions such as user role changes,
          suspensions, and agent modifications. They do not contain any user chat content.
        </p>
      </div>
    </div>
  );
}
