'use client';

/**
 * Subscription Management Page
 *
 * View and manage user subscriptions
 */

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Filter, Crown, Star, Building, User } from 'lucide-react';
import { PageHeader, DataTable, Badge, LoadingState, EmptyState, StatCard } from '../_components';
import { getSubscriptions, updateSubscription } from '../_lib/actions';
import { SubscriptionPlan, SubscriptionStatus } from '@/lib/supabase/types';
import type { Column } from '../_components/ui/DataTable';

interface SubscriptionWithUser {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  users: {
    name: string | null;
    email: string | null;
  } | null;
}

const PLAN_CONFIG: Record<SubscriptionPlan, { icon: typeof User; color: string; label: string }> = {
  free: { icon: User, color: 'text-gray-500', label: 'Free' },
  basic: { icon: Star, color: 'text-blue-500', label: 'Basic' },
  premium: { icon: Crown, color: 'text-purple-500', label: 'Premium' },
  enterprise: { icon: Building, color: 'text-green-500', label: 'Enterprise' },
};

const STATUS_VARIANT: Record<SubscriptionStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  trial: 'info',
  cancelled: 'warning',
  expired: 'error',
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan | ''>('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | ''>('');

  // Edit modal state
  const [editing, setEditing] = useState<SubscriptionWithUser | null>(null);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>('free');
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('active');
  const [editLoading, setEditLoading] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSubscriptions({
        plan: planFilter || undefined,
        status: statusFilter || undefined,
      });
      setSubscriptions(result.subscriptions as SubscriptionWithUser[]);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }, [planFilter, statusFilter]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleEdit = async () => {
    if (!editing) return;

    setEditLoading(true);
    try {
      await updateSubscription(editing.id, {
        plan: editPlan,
        status: editStatus,
      });
      await loadSubscriptions();
      setEditing(null);
    } catch (error) {
      console.error('Failed to update subscription:', error);
    } finally {
      setEditLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === 'active').length,
    premium: subscriptions.filter((s) => s.plan === 'premium' || s.plan === 'enterprise').length,
  };

  const columns: Column<SubscriptionWithUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (sub) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {sub.users?.name || 'Unnamed'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sub.users?.email || 'No email'}
          </p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      sortable: true,
      render: (sub) => {
        const config = PLAN_CONFIG[sub.plan];
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="font-medium capitalize">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (sub) => (
        <Badge variant={STATUS_VARIANT[sub.status]}>
          {sub.status}
        </Badge>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (sub) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {sub.current_period_end ? (
            <>
              Ends {new Date(sub.current_period_end).toLocaleDateString()}
            </>
          ) : (
            'No end date'
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (sub) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(sub.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (sub) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(sub);
            setEditPlan(sub.plan);
            setEditStatus(sub.status);
          }}
          className="px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Manage user subscription plans"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Subscriptions"
          value={stats.total}
          icon={CreditCard}
          color="blue"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={Star}
          color="green"
        />
        <StatCard
          title="Premium Users"
          value={stats.premium}
          icon={Crown}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as SubscriptionPlan | '')}
            className="pl-10 pr-8 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | '')}
            className="pl-10 pr-8 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Loading subscriptions..." />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="Subscriptions will appear here when users subscribe"
        />
      ) : (
        <DataTable
          data={subscriptions}
          columns={columns}
          keyExtractor={(sub) => sub.id}
          emptyMessage="No subscriptions found"
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="relative bg-white dark:bg-[#111111] rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Subscription
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {editing.users?.name || editing.users?.email || 'User'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Plan
                </label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as SubscriptionPlan)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
