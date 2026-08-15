import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { UserRole } from '@/types';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Viruzverse Solutions HRM — Enterprise Workforce Management',
  description: 'Full-cycle Human Resource Management System with Role-Based Access Control',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const savedRole = cookieStore.get('hrms_active_role')?.value as UserRole | undefined;

  return (
    <html lang="en" suppressHydrationWarning className={`h-full light ${plusJakarta.variable} ${jetbrainsMono.variable}`} style={{ colorScheme: 'light' }}>
      <body suppressHydrationWarning className="min-h-full flex flex-col antialiased bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <AuthProvider initialRole={savedRole}>{children}</AuthProvider>
      </body>
    </html>
  );
}
