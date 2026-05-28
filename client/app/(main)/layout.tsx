import { cookies } from 'next/headers';
import Header from '@/components/Header';
import SessionGuard from '@/components/SessionGuard';
import { NotificationSocketProvider } from '@/components/notifications/NotificationSocketProvider';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const username = cookieStore.get('username')?.value || 'Explorer';

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col h-screen overflow-hidden">
      <SessionGuard redirectTo="/login" />
      <NotificationSocketProvider />
      {/* Top Header Navigation Hub */}
      <Header username={username} />

      <main className="flex-1 overflow-y-auto bg-surface-container-lowest relative">
        {children}
      </main>
    </div>
  );
}
