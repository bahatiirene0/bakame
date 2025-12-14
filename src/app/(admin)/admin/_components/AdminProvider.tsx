'use client';

/**
 * Admin Context Provider
 *
 * Provides admin-specific state and utilities:
 * - Current admin user info
 * - Sidebar state
 * - Admin-specific actions
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
}

interface AdminContextType {
  admin: AdminUser;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

// Context
const AdminContext = createContext<AdminContextType | null>(null);

// Hook
export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}

// Provider
export function AdminProvider({
  children,
  admin,
}: {
  children: ReactNode;
  admin: AdminUser;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        admin,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
