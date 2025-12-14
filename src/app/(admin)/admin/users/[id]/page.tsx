/**
 * User Detail Page
 *
 * Shows user information and stats (without chat content)
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Calendar, Shield, Crown, User as UserIcon, MessageSquare, MessagesSquare } from 'lucide-react';
import { PageHeader, Badge, StatCard } from '../../_components';
import { getUserById } from '../../_lib/actions';
import { UserRole } from '@/lib/supabase/types';

const ROLE_CONFIG: Record<UserRole, { variant: 'default' | 'success' | 'info'; icon: typeof UserIcon; label: string }> = {
  user: { variant: 'default', icon: UserIcon, label: 'Standard User' },
  premium: { variant: 'info', icon: Crown, label: 'Premium User' },
  admin: { variant: 'success', icon: Shield, label: 'Administrator' },
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user;
  try {
    user = await getUserById(id);
  } catch {
    notFound();
  }

  const roleConfig = ROLE_CONFIG[user.role as UserRole];
  const RoleIcon = roleConfig.icon;
  const isSuspended = Boolean((user.metadata as Record<string, unknown>)?.suspended);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-gray-600 dark:text-gray-400 font-medium">
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.name || 'Unnamed User'}
              </h1>
              <Badge variant={roleConfig.variant}>
                <RoleIcon className="w-3 h-3 mr-1" />
                {user.role}
              </Badge>
              {isSuspended && (
                <Badge variant="error">Suspended</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              {user.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {user.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Chat Sessions"
          value={user.stats.totalSessions}
          icon={MessagesSquare}
          color="purple"
        />
        <StatCard
          title="Total Messages"
          value={user.stats.totalMessages}
          icon={MessageSquare}
          color="blue"
        />
        <StatCard
          title="Account Status"
          value={isSuspended ? 'Suspended' : 'Active'}
          icon={Shield}
          color={isSuspended ? 'red' : 'green'}
        />
      </div>

      {/* Subscription Info */}
      {user.subscription && (
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Subscription
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
              <p className="text-gray-900 dark:text-white font-medium capitalize">
                {user.subscription.plan}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <Badge
                variant={
                  user.subscription.status === 'active'
                    ? 'success'
                    : user.subscription.status === 'trial'
                    ? 'info'
                    : 'warning'
                }
              >
                {user.subscription.status}
              </Badge>
            </div>
            {user.subscription.current_period_end && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Renews</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(user.subscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Privacy Notice
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          In accordance with our privacy-first design, chat content and uploaded files
          are not accessible from this admin panel. Only aggregated statistics are shown.
        </p>
      </div>
    </div>
  );
}
