/**
 * Admin Components Barrel Export
 *
 * Centralizes all admin component exports for clean imports
 */

// Layout components
export { AdminProvider, useAdmin } from './AdminProvider';
export type { AdminUser } from './AdminProvider';
export { AdminSidebar } from './AdminSidebar';
export { AdminHeader } from './AdminHeader';

// Re-export all UI components
export * from './ui';
