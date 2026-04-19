import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch dashboard stats
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    purchasesResult,
    qualifiedsResult,
    totalLeadsResult,
    readyForQualifiedResult,
    readyForPurchaseResult,
    errorDispatchesResult,
    recentDispatchesResult,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'purchase').gte('closed_at', sevenDaysAgo),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'qualified').gte('updated_at', sevenDaysAgo),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).in('stage', ['conversing', 'proposal']).gte('score', 50),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'qualified').gte('score', 80),
    supabase.from('meta_event_dispatches').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('meta_event_dispatches').select('*').order('dispatched_at', { ascending: false }).limit(5),
  ]);

  const purchases7d = purchasesResult.count || 0;
  const qualifieds7d = qualifiedsResult.count || 0;
  const conversionRate = qualifieds7d > 0 ? ((purchases7d / qualifieds7d) * 100).toFixed(1) : '0';
  const readyForQualified = readyForQualifiedResult.count || 0;
  const readyForPurchase = readyForPurchaseResult.count || 0;
  const errorDispatches = errorDispatchesResult.count || 0;

  const stats = {
    purchases7d,
    qualifieds7d,
    conversionRate,
    totalLeads: totalLeadsResult.count || 0,
    readyForQualified,
    readyForPurchase,
    errorDispatches,
    recentDispatches: recentDispatchesResult.data || [],
    lowPurchaseVolume: purchases7d < 5,
  };

  return (
    <AppShell>
      <div className="app-header">
        <span className="app-header-title">Dashboard</span>
        <span className="text-xs text-muted">Últimos 7 dias</span>
      </div>
      <div className="app-content">
        <DashboardClient stats={stats} />
      </div>
    </AppShell>
  );
}
