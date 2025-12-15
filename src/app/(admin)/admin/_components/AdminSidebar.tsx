'use client';

/**
 * Admin Sidebar Navigation
 *
 * Features:
 * - Collapsible on mobile
 * - Active state indicators
 * - Grouped navigation items
 * - User profile section
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin, AdminUser } from './AdminProvider';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Activity,
  ScrollText,
  Settings,
  X,
  CreditCard,
  Shield,
  Sparkles,
  BookOpen,
  Brain,
} from 'lucide-react';

// Navigation configuration - easy to extend
const NAV_ITEMS = [
  {
    group: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { href: '/admin/prompts', label: 'AI Prompts', icon: Sparkles },
      { href: '/admin/knowledge', label: 'Knowledge Base', icon: BookOpen },
      { href: '/admin/memories', label: 'User Memories', icon: Brain },
    ],
  },
  {
    group: 'Insights',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/system', label: 'System Health', icon: Activity },
    ],
  },
  {
    group: 'Security',
    items: [
      { href: '/admin/logs', label: 'Audit Logs', icon: ScrollText },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;

interface AdminSidebarProps {
  admin: AdminUser;
}

export function AdminSidebar({ admin }: AdminSidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAdmin();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64
          bg-white dark:bg-[#111111]
          border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-500" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Admin Panel
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {NAV_ITEMS.map((group) => (
            <div key={group.group}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {group.group}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg
                          transition-colors duration-150
                          ${active
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Admin Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              {admin.avatar_url ? (
                <img
                  src={admin.avatar_url}
                  alt={admin.name || 'Admin'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {(admin.name || admin.email || 'A').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {admin.name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {admin.email}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="mt-3 flex items-center justify-center w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Back to App
          </Link>
        </div>
      </aside>
    </>
  );
}
