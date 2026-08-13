import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'ViruzVerse HRM — Enterprise Workforce Management',
  description: 'Full-cycle Human Resource Management System with Role-Based Access Control',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
