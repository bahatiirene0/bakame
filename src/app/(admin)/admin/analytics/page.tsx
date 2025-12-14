/**
 * Analytics Page
 *
 * Detailed analytics and metrics (aggregated, privacy-respecting)
 */

import { Suspense } from 'react';
import { Users, MessageSquare, Bot, Zap } from 'lucide-react';
import { PageHeader, StatCard, Chart, LoadingState } from '../_components';
import { getDashboardStats, getRecentActivity, getToolUsageStats } from '../_lib/actions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Get extended analytics
async function getAnalytics() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createServerSupabaseClient() as any;

  // Get user role distribution
  const { data: roleData } = await supabase
    .from('users')
    .select('role');

  const roleCounts: Record<string, number> = { user: 0, premium: 0, admin: 0 };
  roleData?.forEach((u: { role: string }) => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });

  // Get subscription distribution
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('plan, status');

  const planCounts: Record<string, number> = { free: 0, basic: 0, premium: 0, enterprise: 0 };
  subData?.forEach((s: { plan: string; status: string }) => {
    if (s.status === 'active') {
      planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
    }
  });

  // Get agent usage
  const { data: agentData } = await supabase
    .from('chat_sessions')
    .select('agent_slug');

  const agentCounts: Record<string, number> = {};
  agentData?.forEach((s: { agent_slug: string | null }) => {
    const slug = s.agent_slug || 'default';
    agentCounts[slug] = (agentCounts[slug] || 0) + 1;
  });

  // Get messages per day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: messageData } = await supabase
    .from('messages')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo);

  const dailyMessages: Record<string, number> = {};
  messageData?.forEach((m: { created_at: string }) => {
    const date = new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyMessages[date] = (dailyMessages[date] || 0) + 1;
  });

  return {
    roleCounts,
    planCounts,
    agentCounts,
    dailyMessages,
  };
}

async function AnalyticsContent() {
  const [stats, analytics, toolStats] = await Promise.all([
    getDashboardStats(),
    getAnalytics(),
    getToolUsageStats(),
  ]);

  const roleChartData = [
    { label: 'Users', value: analytics.roleCounts.user, color: '#3B82F6' },
    { label: 'Premium', value: analytics.roleCounts.premium, color: '#8B5CF6' },
    { label: 'Admins', value: analytics.roleCounts.admin, color: '#22C55E' },
  ];

  const planChartData = [
    { label: 'Free', value: analytics.planCounts.free, color: '#6B7280' },
    { label: 'Basic', value: analytics.planCounts.basic, color: '#3B82F6' },
    { label: 'Premium', value: analytics.planCounts.premium, color: '#8B5CF6' },
    { label: 'Enterprise', value: analytics.planCounts.enterprise, color: '#22C55E' },
  ];

  const agentChartData = Object.entries(analytics.agentCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value], i) => ({
      label: label === 'default' ? 'Bakame (Default)' : label,
      value,
      color: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][i],
    }));

  const messageChartData = Object.entries(analytics.dailyMessages)
    .slice(-14) // Last 14 days
    .map(([label, value]) => ({ label, value, color: '#22C55E' }));

  const toolChartData = toolStats.map((tool, i) => ({
    ...tool,
    color: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'][i % 8],
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Messages"
          value={stats.totalMessages}
          icon={MessageSquare}
          color="green"
        />
        <StatCard
          title="Chat Sessions"
          value={stats.totalSessions}
          icon={Bot}
          color="purple"
        />
        <StatCard
          title="Active Today"
          value={stats.activeToday}
          icon={Zap}
          color="yellow"
        />
      </div>

      {/* Message Trend */}
      <Chart
        type="bar"
        title="Messages per Day (Last 14 Days)"
        data={messageChartData}
        height={200}
      />

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          type="donut"
          title="User Roles"
          data={roleChartData}
          height={180}
        />
        <Chart
          type="donut"
          title="Subscription Plans"
          data={planChartData}
          height={180}
        />
      </div>

      {/* Usage Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          type="horizontal-bar"
          title="Agent Usage"
          data={agentChartData}
        />
        <Chart
          type="horizontal-bar"
          title="Tool Usage"
          data={toolChartData}
        />
      </div>

      {/* Privacy Notice */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <strong>Privacy Note:</strong> All analytics shown are aggregated counts.
          Individual user behavior and chat content are not tracked or displayed.
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Platform usage metrics and trends"
      />

      <Suspense fallback={<LoadingState message="Loading analytics..." />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
