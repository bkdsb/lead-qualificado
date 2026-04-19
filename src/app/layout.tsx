import type { Metadata } from 'next';
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
      <body>{children}</body>
    </html>
  );
}
