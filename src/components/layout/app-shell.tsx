'use client';

import { useState } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'local';
  const isTest = appEnv !== 'production';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function handleNavClick(href: string) {
    setIsMobileMenuOpen(false);
    router.push(href);
  }

  return (
    <>
      {isTest && (
        <div className="test-banner">
          ● MODO TESTE — Eventos usarão test_event_code
        </div>
      )}
      
      {/* Mobile Header (Only visible on mobile via CSS) */}
      <div className="mobile-header">
        <div className="sidebar-logo" style={{ padding: 0, border: 'none', marginBottom: 0 }}>Lead Qualificado</div>
        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="app-layout">
        <div className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
        
        <aside className={`app-sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={isTest ? { top: 28 } : undefined}>
          <div className="sidebar-logo flex items-center justify-between">
            <span>Lead Qualificado</span>
            <button className="close-sidebar-btn" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section-label">Principal</div>
            {NAV_ITEMS.slice(0, 2).map(item => (
              <button
                key={item.href}
                className={`sidebar-link ${pathname === item.href || (item.href === '/leads' && pathname.startsWith('/leads/')) ? 'active' : ''}`}
                onClick={() => handleNavClick(item.href)}
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
                onClick={() => handleNavClick(item.href)}
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
                onClick={() => handleNavClick(item.href)}
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
