'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Users, Target, ShieldCheck, HelpCircle, Activity, AlertTriangle } from 'lucide-react';
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

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  const kpis = [
    {
      title: "Vendas 7d",
      value: stats.purchases7d,
      subtitle: "Evento principal de otimização",
      icon: TrendingUp,
      tooltip: "Total de vendas confirmadas nos últimos 7 dias.",
      trend: "success",
    },
    {
      title: "Conversão",
      value: `${stats.conversionRate}%`,
      subtitle: "Qualificado → Venda",
      icon: Target,
      tooltip: "Taxa de conversão do funil.",
      trend: "neutral",
    },
    {
      title: "Qualificados 7d",
      value: stats.qualifieds7d,
      subtitle: "Leads qualificados no período",
      icon: ShieldCheckIcon,
      tooltip: "Atingiram o estágio Qualificado.",
      trend: "neutral",
    },
    {
      title: "Total Leads",
      value: stats.totalLeads,
      subtitle: "Base completa",
      icon: Users,
      tooltip: "Base total.",
      trend: "neutral",
    }
  ];

  const actions = [
    {
      title: "Prontos p/ Qualificar",
      value: stats.readyForQualified,
      subtitle: "Score ≥ 50 em negociação",
      color: "text-blue-400",
      tooltip: "Leads com score alto prontos para virar Qualificado."
    },
    {
      title: "Prontos p/ Venda",
      value: stats.readyForPurchase,
      subtitle: "Score ≥ 80 qualificados",
      color: "text-green-400",
      tooltip: "Leads quentes. Alta probabilidade."
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Painel</h1>
        <p className="text-sm text-slate-7">Visão geral do funil e saúde da captação.</p>
      </div>

      {stats.lowPurchaseVolume && (
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-500">Volume de Vendas Ineficiente</h4>
              <p className="text-xs text-yellow-500/80 mt-1 leading-relaxed">
                Apenas {stats.purchases7d} vendas nos últimos 7 dias. A Meta recomenda 50 conversões semanais por conjunto para aprendizado eficaz.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="card-hover">
            <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
              <Tooltip content={kpi.tooltip}>
                <div className="flex items-center gap-2 cursor-help text-slate-8 hover:text-slate-9 transition-colors">
                  <CardTitle className="uppercase text-[11px] font-semibold tracking-widest">{kpi.title}</CardTitle>
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
              </Tooltip>
              <kpi.icon className="w-4 h-4 text-slate-6" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className={cn("text-3xl font-bold tracking-tight mt-1 font-mono", kpi.trend === 'success' ? 'text-green-400' : 'text-slate-9')}>
                {kpi.value}
              </div>
              <p className="text-xs text-slate-7 mt-1.5">{kpi.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((act, i) => (
          <Card key={i} className="card-hover">
            <CardHeader className="p-5 pb-2">
              <Tooltip content={act.tooltip}>
                <CardTitle className="uppercase text-[11px] font-semibold tracking-widest text-slate-8 cursor-help inline-flex items-center gap-2">
                  {act.title}
                </CardTitle>
              </Tooltip>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className={cn("text-2xl font-bold tracking-tight mt-1 font-mono", act.color)}>
                {act.value}
              </div>
              <p className="text-xs text-slate-7 mt-1.5">{act.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader className="p-5 border-b border-white/[0.04]">
          <div className="flex items-center justify-between">
            <CardTitle>Últimos Leads (Entradas e Atualizações)</CardTitle>
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-slate-7" />
              <Link href="/leads">
                <Button variant="secondary" className="h-7 text-[11px]">Ver todos <ArrowRight className="w-3 h-3 ml-1.5" /></Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-2/50 text-[11px] uppercase tracking-widest text-slate-7 font-semibold">
              <tr>
                <th className="px-5 py-3 font-medium border-b border-white/[0.04]">Nome</th>
                <th className="px-5 py-3 font-medium border-b border-white/[0.04]">Estágio</th>
                <th className="px-5 py-3 font-medium border-b border-white/[0.04]">Temperatura / Score</th>
                <th className="px-5 py-3 font-medium border-b border-white/[0.04]">Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats.recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-7 text-sm">
                    Nenhum lead capturado recentemente.
                  </td>
                </tr>
              ) : (
                stats.recentLeads.map((l) => (
                  <tr key={l.id as string} className="transition-colors hover:bg-slate-2/50">
                    <td className="px-5 py-3">
                      <Link href={`/leads/${l.id}`} className="font-medium text-slate-9 hover:underline">
                        {l.name as string || 'Sem Nome'}
                      </Link>
                      <div className="text-[11px] text-slate-6 mt-0.5">{l.email as string || l.phone as string || 'Sem contato extra'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge style={{ backgroundColor: `${STAGE_COLORS[l.stage as keyof typeof STAGE_COLORS]}15`, color: STAGE_COLORS[l.stage as keyof typeof STAGE_COLORS], border: `1px solid ${STAGE_COLORS[l.stage as keyof typeof STAGE_COLORS]}30` }}>
                        {STAGE_LABELS[l.stage as keyof typeof STAGE_LABELS]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-mono font-medium">{l.score as number} pts</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-7">
                      {new Date(l.created_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Inline fallback icon if not exported correctly by lucide-react (like ShieldCheckIcon which is ShieldCheck)
function ShieldCheckIcon(props: any) {
  return <ShieldCheck {...props} />;
}
