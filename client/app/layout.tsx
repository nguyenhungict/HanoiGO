import { Metadata } from 'next';
import './globals.css';
import { NotificationProvider } from '@/components/ui/NotificationProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export const metadata: Metadata = {
  title: 'HanoiGO',
  description: 'Curated Heritage, Hyper-Modern Hanoi.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" type="image/svg+xml" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@100..700,0..1,-50..200,20..48&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NotificationProvider />
        <ConfirmDialog />
        {children}
      </body>
    </html>
  );
}
