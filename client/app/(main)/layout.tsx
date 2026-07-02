import { cookies } from 'next/headers';
import Header from '@/components/Header';
import SessionGuard from '@/components/SessionGuard';
import { NotificationSocketProvider } from '@/components/notifications/NotificationSocketProvider';
import { ChatSocketProvider } from '@/components/notifications/ChatSocketProvider';
import { getRoleFromToken } from '@/lib/auth-utils';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const username = cookieStore.get('username')?.value || 'Explorer';
  const token = cookieStore.get('accessToken')?.value;
  const role = token ? getRoleFromToken(token) : null;
  const isAdmin = role === 'ADMIN';

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col h-screen overflow-hidden">
      <SessionGuard redirectTo="/login" />
      <NotificationSocketProvider />
      <ChatSocketProvider />
      {/* Top Header Navigation Hub */}
      <Header username={username} isAdmin={isAdmin} />

      <main className="flex-1 overflow-y-auto bg-surface-container-lowest relative">
        {children}
      </main>
    </div>
  );
}
