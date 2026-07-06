import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Scene } from '@/components/scene/Scene';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Solution',
  description: 'Noll & DeMichele family command center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased relative">
        <ThemeProvider>
          <Scene />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}