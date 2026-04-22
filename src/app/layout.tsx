import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lead Qualificado — Gestão & CAPI',
  description: 'Sistema de gestão de leads com integração Meta Conversions API',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#191918',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#ededec',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
            },
          }}
          closeButton
        />
      </body>
    </html>
  );
}
