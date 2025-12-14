'use client';

/**
 * Admin Header
 *
 * Mobile-friendly header with:
 * - Hamburger menu toggle
 * - Breadcrumb (optional)
 * - Quick actions
 */

import { usePathname } from 'next/navigation';
import { useAdmin, AdminUser } from './AdminProvider';
import { Menu, Bell, Search } from 'lucide-react';

interface AdminHeaderProps {
  admin: AdminUser;
}

// Map paths to titles
const PATH_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/agents': 'AI Agents',
  '/admin/subscriptions': 'Subscriptions',
  '/admin/analytics': 'Analytics',
  '/admin/system': 'System Health',
  '/admin/logs': 'Audit Logs',
  '/admin/settings': 'Settings',
};

export function AdminHeader({ admin }: AdminHeaderProps) {
  const pathname = usePathname();
  const { toggleSidebar } = useAdmin();

  // Get current page title
  const getTitle = () => {
    if (PATH_TITLES[pathname]) {
      return PATH_TITLES[pathname];
    }
    for (const [path, title] of Object.entries(PATH_TITLES)) {
      if (pathname.startsWith(path) && path !== '/admin') {
        return title;
      }
    }
    return 'Dashboard';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left: Menu toggle */}
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Center: Title */}
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {getTitle()}
        </h1>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
