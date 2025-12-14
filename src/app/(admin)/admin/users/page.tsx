'use client';

/**
 * User Management Page
 *
 * Lists all users with:
 * - Search and filter
 * - Role management
 * - User actions
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, MoreVertical, Shield, Crown, User as UserIcon } from 'lucide-react';
import { PageHeader, DataTable, Badge, ConfirmDialog, LoadingState } from '../_components';
import { getUsers, updateUserRole, suspendUser, deleteUser } from '../_lib/actions';
import { User, UserRole } from '@/lib/supabase/types';
import type { Column } from '../_components/ui/DataTable';

const ROLE_BADGES: Record<UserRole, { variant: 'default' | 'success' | 'warning' | 'info'; icon: typeof UserIcon }> = {
  user: { variant: 'default', icon: UserIcon },
  premium: { variant: 'info', icon: Crown },
  admin: { variant: 'success', icon: Shield },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [total, setTotal] = useState(0);

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'role' | 'suspend' | 'delete' | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [actionLoading, setActionLoading] = useState(false);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(result.users);
      setTotal(result.total);
    } catch (error) {
      // Error loading users
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    setActionLoading(true);
    try {
      if (actionType === 'role') {
        await updateUserRole(selectedUser.id, newRole);
      } else if (actionType === 'suspend') {
        const isSuspended = (selectedUser.metadata as Record<string, unknown>)?.suspended;
        await suspendUser(selectedUser.id, !isSuspended);
      } else if (actionType === 'delete') {
        await deleteUser(selectedUser.id);
      }
      await loadUsers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      render: (user) => (
        <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 hover:opacity-80">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {user.name || 'Unnamed'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.email || user.phone || 'No contact'}
            </p>
          </div>
        </Link>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (user) => {
        const roleConfig = ROLE_BADGES[user.role];
        const Icon = roleConfig.icon;
        return (
          <Badge variant={roleConfig.variant}>
            <Icon className="w-3 h-3 mr-1" />
            {user.role}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      render: (user) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Active',
      sortable: true,
      render: (user) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(user.updated_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (user) => {
        const isSuspended = (user.metadata as Record<string, unknown>)?.suspended;
        return (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(openDropdown === user.id ? null : user.id);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {openDropdown === user.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpenDropdown(null)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setNewRole(user.role);
                      setActionType('role');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Change Role
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setActionType('suspend');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setActionType('delete');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Delete User
                  </button>
                </div>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description={`${total} registered users`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            className="pl-10 pr-8 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="premium">Premium</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingState message="Loading users..." />
      ) : (
        <DataTable
          data={users}
          columns={columns}
          keyExtractor={(user) => user.id}
          emptyMessage="No users found"
        />
      )}

      {/* Role Change Dialog */}
      {actionType === 'role' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setActionType(null)} />
          <div className="relative bg-white dark:bg-[#111111] rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Change User Role
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Change role for {selectedUser.name || selectedUser.email}
            </p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white mb-4"
            >
              <option value="user">User</option>
              <option value="premium">Premium</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setActionType(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation */}
      <ConfirmDialog
        open={actionType === 'suspend' && !!selectedUser}
        onClose={() => setActionType(null)}
        onConfirm={handleAction}
        title={(selectedUser?.metadata as Record<string, unknown>)?.suspended ? 'Unsuspend User' : 'Suspend User'}
        message={`Are you sure you want to ${(selectedUser?.metadata as Record<string, unknown>)?.suspended ? 'unsuspend' : 'suspend'} ${selectedUser?.name || selectedUser?.email}?`}
        confirmLabel={(selectedUser?.metadata as Record<string, unknown>)?.suspended ? 'Unsuspend' : 'Suspend'}
        variant="warning"
        loading={actionLoading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={actionType === 'delete' && !!selectedUser}
        onClose={() => setActionType(null)}
        onConfirm={handleAction}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.name || selectedUser?.email}? This action cannot be undone and will remove all their data.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
