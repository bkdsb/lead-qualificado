'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { ArrowRight, TrendingUp, TrendingDown, Users, Target, ShieldCheck, Zap, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_LABELS, STAGE_COLORS } from '@/lib/utils/constants';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

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

interface WeeklyDataPoint {
  week: string;
  vendas: number;
  novos: number;
}

interface FunnelDataPoint {
  stage: string;
  count: number;
  key: string;
}

interface StaleLead {
  id: string;
  name: string;
  stage: string;
  score: number;
  updated_at: string;
}

interface StatsData {
  weeklyData: WeeklyDataPoint[];
  funnelData: FunnelDataPoint[];
  staleLeads: StaleLead[];
  deltas: {
    purchases: number;
    newLeads: number;
    purchasesThisWeek: number;
    purchasesLastWeek: number;
    newLeadsThisWeek: number;
    newLeadsLastWeek: number;
  };
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

function DeltaBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded",
      isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
    )}>
      {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {isPositive ? '+' : ''}{value}{suffix}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-2 border border-white/[0.08] rounded-lg px-3 py-2 shadow-popover text-[11px]">
      <div className="text-slate-7 font-mono mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-8">{p.name}: <strong className="text-white">{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  const [chartData, setChartData] = useState<StatsData | null>(null);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leads/stats')
      .then(r => r.json())
      .then(data => { setChartData(data); setChartLoading(false); })
      .catch(() => setChartLoading(false));
  }, []);

  const metrics = [
    {
      label: "Vendas", value: stats.purchases7d, icon: TrendingUp,
      accent: "text-green-400", sub: "Últimos 7 dias",
      delta: chartData?.deltas.purchases,
      tooltip: "Leads que chegaram na coluna 'Comprou'. Dispara o evento de Purchase no Meta.",
    },
    {
      label: "Conversão", value: `${stats.conversionRate}%`, icon: Target,
      accent: "text-slate-9", sub: "Qualificado → Venda",
      tooltip: "Porcentagem de leads qualificados que efetivamente fecharam a compra.",
    },
    {
      label: "Qualificados", value: stats.qualifieds7d, icon: ShieldCheck,
      accent: "text-slate-9", sub: "Últimos 7 dias",
      tooltip: "Leads marcados como qualificados. Dispara o evento QualifiedLead no Meta.",
    },
    {
      label: "Total Leads", value: stats.totalLeads, icon: Users,
      accent: "text-slate-9", sub: "Base completa",
      delta: chartData?.deltas.newLeads,
    },
    {
      label: "P/ Qualificar", value: stats.readyForQualified, icon: Zap,
      accent: "text-blue-400", sub: "Score ≥ 50",
      tooltip: "Leads em conversação que atingiram um score morno/quente. Sugestão: movê-os para Qualificado.",
    },
    {
      label: "P/ Fechar", value: stats.readyForPurchase, icon: TrendingUp,
      accent: "text-green-400", sub: "Score ≥ 80",
      tooltip: "Leads altamente engajados. Foque neles para o fechamento.",
    },
  ];

  const FUNNEL_COLORS: Record<string, string> = {
    new: '#3b82f6', contacted: '#6366f1', conversing: '#8b5cf6',
    proposal: '#eab308', qualified: '#22c55e', purchase: '#10b981', lost: '#ef4444',
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
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
                {m.tooltip ? (
                  <Tooltip content={m.tooltip}>
                    <span className="text-[11px] font-medium uppercase tracking-widest text-slate-7 border-b border-dashed border-slate-7 cursor-help">{m.label}</span>
                  </Tooltip>
                ) : (
                  <span className="text-[11px] font-medium uppercase tracking-widest text-slate-7">{m.label}</span>
                )}
                <m.icon className="w-3.5 h-3.5 text-slate-6" />
              </div>
              <div className="flex items-end gap-2">
                <div className={cn("text-2xl font-bold tracking-tight font-mono", m.accent)}>{m.value}</div>
                {m.delta !== undefined && <DeltaBadge value={m.delta} />}
              </div>
              <p className="text-[11px] text-slate-6 mt-1">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Trend */}
        <Card>
          <div className="p-4 border-b border-white/[0.04]">
            <span className="text-sm font-medium text-slate-8">Tendência Semanal</span>
            <p className="text-[11px] text-slate-6 mt-0.5">Vendas × Novos leads (8 semanas)</p>
          </div>
          <div className="p-4">
            {chartLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[180px] w-full rounded-lg" />
              </div>
            ) : chartData?.weeklyData ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData.weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNovos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#53534e' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#53534e' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="novos" name="Novos" stroke="#3b82f6" fill="url(#gradNovos)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="vendas" name="Vendas" stroke="#10b981" fill="url(#gradVendas)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-slate-7">Sem dados</div>
            )}
          </div>
        </Card>

        {/* Funnel */}
        <Card>
          <div className="p-4 border-b border-white/[0.04]">
            <span className="text-sm font-medium text-slate-8">Funil do Pipeline</span>
            <p className="text-[11px] text-slate-6 mt-0.5">Distribuição atual por estágio</p>
          </div>
          <div className="p-4">
            {chartLoading ? (
              <Skeleton className="h-[180px] w-full rounded-lg" />
            ) : chartData?.funnelData ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData.funnelData.filter(f => f.key !== 'lost')} margin={{ top: 5, right: 20, left: 10, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#53534e' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: '#706e67' }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {chartData.funnelData.filter(f => f.key !== 'lost').map((entry) => (
                      <Cell key={entry.key} fill={FUNNEL_COLORS[entry.key] || '#53534e'} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-slate-7">Sem dados</div>
            )}
          </div>
        </Card>
      </div>

      {/* Stale Leads Alert */}
      {chartData?.staleLeads && chartData.staleLeads.length > 0 && (
        <Card className="border-yellow-500/10">
          <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-500">Leads Parados</span>
              <Badge variant="warning" className="text-[10px]">{chartData.staleLeads.length}</Badge>
            </div>
            <Link href="/leads">
              <Button variant="ghost" className="h-7 text-[12px] text-slate-7 gap-1.5">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {chartData.staleLeads.slice(0, 5).map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-2/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-[11px] font-bold text-yellow-500 uppercase shrink-0">
                    {l.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-9 truncate group-hover:text-white transition-colors">
                      {l.name || 'Sem nome'}
                    </div>
                    <div className="text-[11px] text-slate-6">
                      {STAGE_LABELS[l.stage as keyof typeof STAGE_LABELS]} · {l.score} pts
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[11px] text-yellow-500/80 font-mono">
                    há {timeAgo(l.updated_at)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

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
