'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Users, Send, ShieldCheck, Activity, Settings, LogOut, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/events', label: 'Envios Meta', icon: Send, adminOnly: true },
  { href: '/qa', label: 'Qualidade', icon: ShieldCheck, adminOnly: true },
  { href: '/audit', label: 'Auditoria', icon: Activity, adminOnly: true },
  { href: '/settings', label: 'Configurações', icon: Settings, adminOnly: true },
];

function getCachedRole(): 'admin' | 'operator' {
  if (typeof window === 'undefined') return 'operator';
  return (sessionStorage.getItem('user_role') as 'admin' | 'operator') || 'operator';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'operator'>(getCachedRole);
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'local';
  const isTest = appEnv !== 'production';

  // Fetch user role once — cache in sessionStorage to prevent flash on navigation
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').select('role').eq('id', user.id).single().then(({ data }) => {
          const role = data?.role === 'admin' ? 'admin' : 'operator';
          setUserRole(role);
          sessionStorage.setItem('user_role', role);
        });
      }
    });
  }, []);

  const visibleNavItems = NAV_ITEMS.filter(item => !item.adminOnly || userRole === 'admin');

  async function handleLogout() {
    const supabase = createClient();
    sessionStorage.removeItem('user_role');
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const NavLink = ({ item }: { item: typeof NAV_ITEMS[number] }) => {
    const active = pathname === item.href || (item.href === '/leads' && pathname.startsWith('/leads/'));
    return (
      <Link
        href={item.href}
        onClick={() => setIsMobileMenuOpen(false)}
        prefetch
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-200 ease-out group",
          active ? "bg-white/[0.06] text-slate-10" : "text-slate-8 hover:bg-white/[0.04] hover:text-slate-9"
        )}
      >
        <item.icon className={cn("w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110", active && "text-white")} />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-1 text-slate-9 overflow-x-hidden">
      {isTest && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-500 text-[11px] font-medium tracking-widest uppercase py-1 text-center backdrop-blur-md">
          ● Modo Teste Ativo
        </div>
      )}

      {/* Mobile Topbar */}
      <div className={cn("md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-slate-1/80 backdrop-blur-xl", isTest && "top-6")}>
        <span className="font-semibold text-[15px] tracking-tight text-white/90">Lead Qualificado</span>
        <button className="p-2 text-slate-7 rounded-md active:bg-white/[0.04]" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar — always visible on md+ */}
      <aside className={cn(
        "hidden md:flex flex-col sticky top-0 h-screen w-[240px] shrink-0 border-r border-white/[0.04] bg-slate-1",
        isTest && "top-6 h-[calc(100vh-24px)]"
      )}>
        <div className="flex items-center px-5 py-4 border-b border-white/[0.04]">
          <span className="font-semibold text-[15px] tracking-tight text-white/90">Lead Qualificado</span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          <div>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-7">Principal</div>
            <div className="space-y-0.5">
              {visibleNavItems.filter(i => !i.adminOnly).map(item => <NavLink key={item.href} item={item} />)}
            </div>
          </div>
          {userRole === 'admin' && (
            <div>
              <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-7">Admin</div>
              <div className="space-y-0.5">
                {visibleNavItems.filter(i => i.adminOnly).map(item => <NavLink key={item.href} item={item} />)}
              </div>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-white/[0.04]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-slate-7 hover:bg-white/[0.04] hover:text-slate-9 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar — slide drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed top-0 left-0 bottom-0 z-50 w-[260px] border-r border-white/[0.04] bg-slate-1 flex flex-col shadow-popover md:hidden",
              isTest && "top-6"
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <span className="font-semibold text-[15px] tracking-tight text-white/90">Lead Qualificado</span>
              <button className="p-1 text-slate-7" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
              <div>
                <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-7">Principal</div>
                <div className="space-y-0.5">
                  {visibleNavItems.filter(i => !i.adminOnly).map(item => <NavLink key={item.href} item={item} />)}
                </div>
              </div>
              {userRole === 'admin' && (
                <div>
                  <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-7">Admin</div>
                  <div className="space-y-0.5">
                    {visibleNavItems.filter(i => i.adminOnly).map(item => <NavLink key={item.href} item={item} />)}
                  </div>
                </div>
              )}
            </nav>

            <div className="p-3 border-t border-white/[0.04]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-slate-7 hover:bg-white/[0.04] hover:text-slate-9 transition-all duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn("flex-1 min-w-0 flex flex-col", "pt-[52px] md:pt-0", isTest && "pt-[76px] md:pt-6")}>
        {children}
      </main>
    </div>
  );
}
