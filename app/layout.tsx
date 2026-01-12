import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/hooks/use-store';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Inter } from 'next/font/google';
import { SessionProvider } from '@/components/session-provider';
import { PWARegistration } from '@/components/pwa-registration';
import { OfflineIndicator } from '@/components/offline-indicator';
import { validateEnv } from '@/lib/env-validation';

// Validate environment variables on startup
validateEnv();

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'ProjectSetu',
  description: 'Professional construction management and finance platform.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ProjectSetu',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1E293B',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
      </head>
      <body className="font-body antialiased">
        <div className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <SessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AppProvider>
                <PWARegistration />
                <OfflineIndicator />
                <main>{children}</main>
                <Toaster />
              </AppProvider>
            </ThemeProvider>
          </SessionProvider>
        </div>
      </body>
    </html>
  );
}
