'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Users, Target, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_LABELS, STAGE_COLORS } from '@/lib/utils/constants';
import Link from 'next/link';

export interface DashboardStats {
  purchases7d: number;
  qualifieds7d: number;
  conversionRate: string;
  totalLeads: number;
  readyForQualified: number;
  readyForPurchase: number;
  recentLeads: Array<Record<string, unknown>>;
  lowPurchaseVolume: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  const metrics = [
    { label: "Vendas", value: stats.purchases7d, icon: TrendingUp, accent: "text-green-400", sub: "Últimos 7 dias" },
    { label: "Conversão", value: `${stats.conversionRate}%`, icon: Target, accent: "text-slate-9", sub: "Qualificado → Venda" },
    { label: "Qualificados", value: stats.qualifieds7d, icon: ShieldCheck, accent: "text-slate-9", sub: "Últimos 7 dias" },
    { label: "Total Leads", value: stats.totalLeads, icon: Users, accent: "text-slate-9", sub: "Base completa" },
    { label: "P/ Qualificar", value: stats.readyForQualified, icon: Zap, accent: "text-blue-400", sub: "Score ≥ 50" },
    { label: "P/ Fechar", value: stats.readyForPurchase, icon: TrendingUp, accent: "text-green-400", sub: "Score ≥ 80" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Painel</h1>
          <p className="text-[13px] text-slate-7 mt-0.5">Visão geral do funil de vendas.</p>
        </div>
      </div>

      {/* Warning */}
      {stats.lowPurchaseVolume && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-yellow-500/[0.07] border border-yellow-500/15 text-yellow-500">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-[13px] leading-relaxed">
            <strong>Volume baixo.</strong> Apenas {stats.purchases7d} vendas em 7 dias. A Meta recomenda +50/semana para aprendizado.
          </p>
        </div>
      )}

      {/* KPI Grid — 2x3 desktop, 2x2 mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map((m, i) => (
          <Card key={i} className="card-hover cursor-default">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium uppercase tracking-widest text-slate-7">{m.label}</span>
                <m.icon className="w-3.5 h-3.5 text-slate-6" />
              </div>
              <div className={cn("text-2xl font-bold tracking-tight font-mono", m.accent)}>{m.value}</div>
              <p className="text-[11px] text-slate-6 mt-1">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Leads — Compact List */}
      <Card>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
          <span className="text-sm font-medium text-slate-8">Leads recentes</span>
          <Link href="/leads">
            <Button variant="ghost" className="h-7 text-[12px] text-slate-7 gap-1.5">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {stats.recentLeads.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-7">Nenhum lead ainda.</div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {stats.recentLeads.map((l) => (
              <Link
                key={l.id as string}
                href={`/leads/${l.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-2/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-slate-3 flex items-center justify-center text-[11px] font-bold text-slate-7 uppercase shrink-0">
                    {(l.name as string)?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-9 truncate group-hover:text-white transition-colors">
                      {l.name as string || 'Sem nome'}
                    </div>
                    <div className="text-[11px] text-slate-6 truncate">{l.email as string || l.phone as string || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <Badge
                    style={{
                      backgroundColor: `${STAGE_COLORS[l.stage as keyof typeof STAGE_COLORS]}12`,
                      color: STAGE_COLORS[l.stage as keyof typeof STAGE_COLORS],
                      borderColor: `${STAGE_COLORS[l.stage as keyof typeof STAGE_COLORS]}25`,
                    }}
                    className="border hidden sm:inline-flex"
                  >
                    {STAGE_LABELS[l.stage as keyof typeof STAGE_LABELS]}
                  </Badge>
                  <span className="text-[11px] text-slate-6 font-mono w-8 text-right">{timeAgo(l.created_at as string)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
