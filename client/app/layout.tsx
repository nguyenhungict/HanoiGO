import './globals.css';
import { NotificationProvider } from '@/components/ui/NotificationProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
