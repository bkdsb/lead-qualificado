import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/leads/stats — Dashboard statistics with weekly trends
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();

  // Generate last 8 weeks boundaries
  const weeks: { start: string; end: string; label: string }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    weeks.push({
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
    });
  }

  // Get weekly purchase counts
  const weeklyPurchases = await Promise.all(
    weeks.map(async (w) => {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'purchase')
        .gte('updated_at', w.start)
        .lt('updated_at', w.end);
      return { week: w.label, vendas: count || 0 };
    })
  );

  // Get weekly new leads
  const weeklyNewLeads = await Promise.all(
    weeks.map(async (w) => {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', w.start)
        .lt('created_at', w.end);
      return { week: w.label, novos: count || 0 };
    })
  );

  // Merge weekly data
  const weeklyData = weeklyPurchases.map((p, i) => ({
    week: p.week,
    vendas: p.vendas,
    novos: weeklyNewLeads[i]?.novos || 0,
  }));

  // Funnel: count leads by stage
  const stages = ['new', 'contacted', 'conversing', 'proposal', 'qualified', 'purchase', 'lost'];
  const stageLabels: Record<string, string> = {
    new: 'Novo', contacted: 'Contatado', conversing: 'Conversando',
    proposal: 'Proposta', qualified: 'Qualificado', purchase: 'Comprou', lost: 'Perdido',
  };

  const funnelData = await Promise.all(
    stages.map(async (stage) => {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('stage', stage);
      return { stage: stageLabels[stage] || stage, count: count || 0, key: stage };
    })
  );

  // Stale leads: leads without update in 48h in active stages
  const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const { data: staleLeads } = await supabase
    .from('leads')
    .select('id, name, stage, score, updated_at')
    .in('stage', ['new', 'contacted', 'conversing', 'proposal', 'qualified'])
    .lt('updated_at', staleThreshold)
    .order('updated_at', { ascending: true })
    .limit(10);

  // Week-over-week comparison
  const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [thisWeekPurchases, lastWeekPurchases, thisWeekNewLeads, lastWeekNewLeads] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'purchase').gte('updated_at', thisWeekStart),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'purchase').gte('updated_at', lastWeekStart).lt('updated_at', thisWeekStart),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', thisWeekStart),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', lastWeekStart).lt('created_at', thisWeekStart),
  ]);

  const purchasesDelta = (thisWeekPurchases.count || 0) - (lastWeekPurchases.count || 0);
  const newLeadsDelta = (thisWeekNewLeads.count || 0) - (lastWeekNewLeads.count || 0);

  return NextResponse.json({
    weeklyData,
    funnelData,
    staleLeads: staleLeads || [],
    deltas: {
      purchases: purchasesDelta,
      newLeads: newLeadsDelta,
      purchasesThisWeek: thisWeekPurchases.count || 0,
      purchasesLastWeek: lastWeekPurchases.count || 0,
      newLeadsThisWeek: thisWeekNewLeads.count || 0,
      newLeadsLastWeek: lastWeekNewLeads.count || 0,
    },
  });
}
