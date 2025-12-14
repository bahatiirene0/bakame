/**
 * System Health Page
 *
 * Monitor system status and health metrics
 */

import { Suspense } from 'react';
import { CheckCircle, XCircle, AlertCircle, Database, Server, Zap, Clock } from 'lucide-react';
import { PageHeader, LoadingState } from '../_components';
import { getSystemHealth } from '../_lib/actions';

type StatusType = 'healthy' | 'warning' | 'error';

const STATUS_CONFIG: Record<StatusType, { icon: typeof CheckCircle; color: string; bg: string }> = {
  healthy: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  warning: { icon: AlertCircle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  error: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
};

function StatusIndicator({ status, label, detail }: { status: StatusType; label: string; detail?: string }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {detail && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{detail}</p>
          )}
        </div>
      </div>
      <span className={`text-sm font-medium capitalize ${config.color}`}>
        {status}
      </span>
    </div>
  );
}

async function SystemHealthContent() {
  const health = await getSystemHealth();

  // Determine overall status
  const dbStatus: StatusType = health.database.status === 'healthy'
    ? health.database.latency > 500 ? 'warning' : 'healthy'
    : 'error';

  // Mock external service checks (in production, implement actual checks)
  const services = [
    { name: 'OpenAI API', status: 'healthy' as StatusType, detail: 'Connected' },
    { name: 'Supabase Auth', status: 'healthy' as StatusType, detail: 'Connected' },
    { name: 'File Storage', status: 'healthy' as StatusType, detail: 'Available' },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Database</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {health.database.latency}ms
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Response time</p>
        </div>

        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Records</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(
              health.tables.users +
              health.tables.chat_sessions +
              health.tables.messages +
              health.tables.agents
            ).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Across all tables</p>
        </div>

        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Services</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {services.filter((s) => s.status === 'healthy').length}/{services.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
        </div>

        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Last Check</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            Now
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Service Status */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Service Status
        </h2>
        <div className="space-y-3">
          <StatusIndicator
            status={dbStatus}
            label="PostgreSQL Database"
            detail={`Latency: ${health.database.latency}ms`}
          />
          {services.map((service) => (
            <StatusIndicator
              key={service.name}
              status={service.status}
              label={service.name}
              detail={service.detail}
            />
          ))}
        </div>
      </div>

      {/* Table Statistics */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Database Tables
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Table
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Row Count
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(health.tables).map(([table, count]) => (
                <tr key={table} className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-mono text-sm">
                    {table}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Environment
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Runtime</p>
            <p className="font-medium text-gray-900 dark:text-white">Node.js</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Framework</p>
            <p className="font-medium text-gray-900 dark:text-white">Next.js 16</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Database</p>
            <p className="font-medium text-gray-900 dark:text-white">PostgreSQL (Supabase)</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI Provider</p>
            <p className="font-medium text-gray-900 dark:text-white">OpenAI / OpenRouter</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description="Monitor system status and performance"
      />

      <Suspense fallback={<LoadingState message="Checking system health..." />}>
        <SystemHealthContent />
      </Suspense>
    </div>
  );
}
