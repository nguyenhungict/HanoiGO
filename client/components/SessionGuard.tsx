'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type SessionGuardProps = {
  redirectTo: string;
  pollIntervalMs?: number;
};

export default function SessionGuard({
  redirectTo,
  pollIntervalMs = 10000,
}: SessionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (redirectingRef.current) return;

      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'same-origin',
      }).catch(() => null);

      if (cancelled || !response) return;

      if (response.status === 401) {
        redirectingRef.current = true;
        const target = `${redirectTo}?next=${encodeURIComponent(pathname)}`;
        router.replace(target);
        router.refresh();
      }
    }

    const intervalId = window.setInterval(verifySession, pollIntervalMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void verifySession();
      }
    };

    void verifySession();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, pollIntervalMs, redirectTo, router]);

  return null;
}
