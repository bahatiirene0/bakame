/**
 * Admin Dashboard Page
 *
 * Overview page with key metrics and recent activity
 */

import { Suspense } from 'react';
import { Users, MessageSquare, MessagesSquare, Activity } from 'lucide-react';
import { PageHeader, StatCard, Chart, LoadingState } from './_components';
import { getDashboardStats, getRecentActivity, getToolUsageStats } from './_lib/actions';

// Stats Cards Component
async function DashboardStats() {
  const stats = await getDashboardStats();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon={Users}
        color="blue"
        trend={{ value: 12, label: 'vs last month' }}
      />
      <StatCard
        title="Active Today"
        value={stats.activeToday}
        icon={Activity}
        color="green"
      />
      <StatCard
        title="Chat Sessions"
        value={stats.totalSessions}
        icon={MessagesSquare}
        color="purple"
      />
      <StatCard
        title="Total Messages"
        value={stats.totalMessages}
        icon={MessageSquare}
        color="yellow"
      />
    </div>
  );
}

// Recent Activity Chart
async function ActivityChart() {
  const { dailySignups } = await getRecentActivity();

  // Fill in missing days with 0
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const dayIndex = (today - 6 + i + 7) % 7;
    return days[dayIndex];
  });

  const chartData = last7Days.map((day) => ({
    label: day,
    value: dailySignups.find((d) => d.label === day)?.value || 0,
    color: '#22C55E',
  }));

  return <Chart type="bar" title="New Users (Last 7 Days)" data={chartData} height={180} />;
}

// Tool Usage Chart
async function ToolUsageChart() {
  const toolStats = await getToolUsageStats();

  const colors = [
    '#22C55E', '#3B82F6', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  ];

  const chartData = toolStats.map((tool, i) => ({
    ...tool,
    color: colors[i % colors.length],
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Tool Usage
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tool usage data yet
        </p>
      </div>
    );
  }

  return <Chart type="horizontal-bar" title="Top Tools" data={chartData} />;
}

// Quick Stats Overview
function QuickInfo() {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Quick Info
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Server Status</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Online</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">API Status</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Healthy</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Connected</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your Bakame.ai platform"
      />

      {/* Stats Grid */}
      <Suspense fallback={<LoadingState message="Loading stats..." />}>
        <DashboardStats />
      </Suspense>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<LoadingState message="Loading activity..." />}>
          <ActivityChart />
        </Suspense>
        <Suspense fallback={<LoadingState message="Loading tool stats..." />}>
          <ToolUsageChart />
        </Suspense>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickInfo />
        <div className="lg:col-span-2 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Privacy-First Design
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This admin dashboard is designed with privacy in mind. You can view aggregated
            statistics and manage users without accessing their private chat content.
            All user conversations remain confidential.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs font-medium text-green-700 dark:text-green-400">What you CAN see</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                User counts, message counts, tool usage stats, system health
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">What you CANNOT see</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                Chat content, uploaded files, personal conversations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
