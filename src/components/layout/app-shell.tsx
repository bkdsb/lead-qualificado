'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/leads', label: 'Leads', icon: '☰' },
  { href: '/events', label: 'Eventos Meta', icon: '↗' },
  { href: '/qa', label: 'QA Panel', icon: '✓' },
  { href: '/audit', label: 'Auditoria', icon: '⊙' },
  { href: '/settings', label: 'Configurações', icon: '⚙' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'local';
  const isTest = appEnv !== 'production';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {isTest && (
        <div className="test-banner">
          ● MODO TESTE — Eventos usarão test_event_code
        </div>
      )}
      <div className="app-layout">
        <aside className="app-sidebar" style={isTest ? { top: 28 } : undefined}>
          <div className="sidebar-logo">Lead Qualificado</div>
          <nav className="sidebar-nav">
            <div className="sidebar-section-label">Principal</div>
            {NAV_ITEMS.slice(0, 2).map(item => (
              <button
                key={item.href}
                className={`sidebar-link ${pathname === item.href || (item.href === '/leads' && pathname.startsWith('/leads/')) ? 'active' : ''}`}
                onClick={() => router.push(item.href)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div className="sidebar-section-label">Meta CAPI</div>
            {NAV_ITEMS.slice(2, 4).map(item => (
              <button
                key={item.href}
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                onClick={() => router.push(item.href)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div className="sidebar-section-label">Sistema</div>
            {NAV_ITEMS.slice(4).map(item => (
              <button
                key={item.href}
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                onClick={() => router.push(item.href)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="sidebar-link" onClick={handleLogout} style={{ color: 'var(--text-muted)' }}>
              ← Sair
            </button>
          </div>
        </aside>
        <main className="app-main" style={isTest ? { paddingTop: 28 } : undefined}>
          {children}
        </main>
      </div>
    </>
  );
}
