import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { PortfolioProvider } from '@/context/PortfolioContext';
import PortfolioTabs from '@/components/layout/PortfolioTabs';

export const metadata: Metadata = {
  title: 'RK Portfolio Command Center',
  description: 'AI-powered portfolio tracking dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header />
            <PortfolioProvider>
              <PortfolioTabs />
              <main style={{ flex: 1, overflowY: 'auto' }}>
                {children}
              </main>
            </PortfolioProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
