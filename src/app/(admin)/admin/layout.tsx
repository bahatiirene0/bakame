/**
 * Admin Layout
 *
 * Provides the admin shell with:
 * - Role-based access control (admin only)
 * - Admin navigation sidebar
 * - Consistent styling
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminSidebar } from './_components/AdminSidebar';
import { AdminHeader } from './_components/AdminHeader';
import { AdminProvider } from './_components/AdminProvider';

export const metadata = {
  title: 'Admin Dashboard | Bakame.ai',
  description: 'Bakame.ai Administration Dashboard',
};

// Force dynamic rendering for admin pages (requires auth cookies)
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createServerSupabaseClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect if not logged in
  if (!user) {
    redirect('/auth/login?redirect=/admin');
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, avatar_url, role')
    .eq('id', user.id)
    .single();

  // Redirect if not admin
  if (!profile || profile.role !== 'admin') {
    redirect('/?error=unauthorized');
  }

  return (
    <AdminProvider admin={profile}>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
        {/* Admin Header - Mobile */}
        <AdminHeader admin={profile} />

        <div className="flex">
          {/* Admin Sidebar - Desktop */}
          <AdminSidebar admin={profile} />

          {/* Main Content */}
          <main className="flex-1 lg:ml-64">
            <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
