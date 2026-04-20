'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Activity, Terminal, Code, Settings, ChevronRight, UserPlus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditLog {
  id: string;
  entity_type: string;
  action: string;
  environment?: string;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  dispatch_success: { icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Envio CAPI Realizado' },
  dispatch_failed: { icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Falha no CAPI' },
  dispatch_attempt: { icon: Terminal, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', label: 'Tentativa CAPI' },
  stage_change: { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Estágio Alterado' },
  score_change: { icon: ShieldCheck, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Score Ajustado' },
  lead_created: { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Lead Indexado' },
  settings_change: { icon: Settings, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', label: 'Configuração do Core' },
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos os Logs' },
  { key: 'dispatch', label: 'Transmissão Meta' },
  { key: 'stage', label: 'Pipeline' },
  { key: 'score', label: 'Scoring' },
  { key: 'error', label: 'Anomalias/Erros' },
];

function getActionConfig(action: string) {
  if (ACTION_CONFIG[action]) return ACTION_CONFIG[action];
  if (action.includes('dispatch') && action.includes('fail')) return ACTION_CONFIG.dispatch_failed;
  if (action.includes('dispatch') || action.includes('send')) return ACTION_CONFIG.dispatch_success;
  if (action.includes('stage')) return ACTION_CONFIG.stage_change;
  if (action.includes('score')) return ACTION_CONFIG.score_change;
  if (action.includes('creat')) return ACTION_CONFIG.lead_created;
  if (action.includes('setting')) return ACTION_CONFIG.settings_change;
  return { icon: Code, color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20', label: action };
}

function formatDetail(details: Record<string, unknown>, action: string): string | null {
  if (!details || Object.keys(details).length === 0) return null;
  if (action.includes('stage') && details.from_stage && details.to_stage) {
    return `${details.from_stage} → ${details.to_stage}${details.reason ? ` (${details.reason})` : ''}`;
  }
  if (action.includes('score') && details.event_type !== undefined) {
    const pts = details.points as number;
    return `${details.event_type}: ${pts > 0 ? '+' : ''}${pts} pontuação${details.note ? ` — ${details.note}` : ''}`;
  }
  if (action.includes('dispatch') && details.event_name) {
    return [
      `Evento: ${details.event_name}`,
      details.environment ? `Ambiente: ${details.environment === 'test' ? 'TESTE' : 'PROD'}` : null,
      details.match_strength ? `Força Vetorial: ${details.match_strength}` : null,
      details.error_message ? `Falha: ${details.error_message}` : null
    ].filter(Boolean).join(' | ');
  }
  const pairs = Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .slice(0, 3);
  return pairs.length > 0 ? pairs.join(' | ') : null;
}

function matchFilter(log: AuditLog, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'dispatch') return log.action.includes('dispatch') || log.action.includes('send') || log.entity_type === 'meta_event';
  if (filter === 'stage') return log.action.includes('stage');
  if (filter === 'score') return log.action.includes('score');
  if (filter === 'error') return log.action.includes('fail') || log.action.includes('error');
  return true;
}

export default function AuditClient({ logs }: { logs: AuditLog[] }) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => logs.filter(l => matchFilter(l, filter)), [logs, filter]);

  const now = Date.now();
  const last24h = logs.filter(l => now - new Date(l.created_at).getTime() < 86400000);
  const errorCount = logs.filter(l => l.action.includes('fail') || l.action.includes('error')).length;
  const dispatchCount = logs.filter(l => l.action.includes('dispatch') || l.action.includes('send') || l.entity_type === 'meta_event').length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-1 mb-8">
        <h1 className="font-serif italic text-3xl font-medium tracking-tight text-white mb-2">Auditoria de Sistema</h1>
        <p className="text-sm text-slate-7">Rastro infraestrutural, operações manuais e chamadas de API.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Registros de Log", val: logs.length, sub: "Total guardado" },
          { title: "Nas últimas 24h", val: last24h.length, sub: "Eventos contínuos" },
          { title: "Chamadas CAPI", val: dispatchCount, sub: "Pings via API", color: "text-blue-400" },
          { title: "Anomalias/Erros", val: errorCount, sub: "Processos falhos", color: errorCount > 0 ? "text-red-400" : "text-slate-6" },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-widest text-slate-7 font-medium mb-2">{k.title}</div>
              <div className={cn("text-2xl font-mono font-bold", k.color || "text-white")}>{k.val}</div>
              <div className="text-xs text-slate-6 mt-1">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center flex-wrap gap-2 py-2">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              filter === opt.key 
                ? "bg-slate-3 text-white border-slate-5 shadow-sm" 
                : "bg-transparent text-slate-7 border-transparent hover:bg-slate-2"
            )}
            onClick={() => setFilter(opt.key)}
          >
            {opt.label}
          </button>
        ))}
        <div className="ml-auto text-xs text-slate-6 font-mono">{filtered.length} logs indexados</div>
      </div>

      <Card className="bg-transparent border-none shadow-none">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center bg-slate-2 rounded-xl text-slate-7 text-sm">
              Nenhum fragmento de log coincide com este vetor temporal.
            </div>
          ) : (
            filtered.map(log => {
              const config = getActionConfig(log.action);
              const detail = formatDetail(log.details, log.action);
              const isExpanded = expandedId === log.id;

              return (
                <div
                  key={log.id}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-white/[0.04] bg-surface transition-all duration-200",
                    detail && "cursor-pointer hover:border-white/[0.08] hover:bg-[#151514]"
                  )}
                  onClick={() => detail && setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="p-4 flex items-start gap-4">
                    <div className={cn("flex shrink-0 items-center justify-center w-10 h-10 rounded-full border", config.bg)}>
                      <config.icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="font-medium text-slate-9 tracking-tight flex items-center gap-2">
                          {config.label}
                          <Badge variant="neutral" className="px-1.5 py-0 text-[9px] h-4 leading-4 opacity-70 group-hover:opacity-100 transition-opacity">
                            {log.entity_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-6 font-mono">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>

                      {detail && (
                        <div className="text-sm text-slate-7 font-mono truncate max-w-full">
                          {detail}
                        </div>
                      )}

                      <AnimatePresence>
                        {isExpanded && log.details && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-white/[0.04]">
                              <div className="text-[10px] uppercase tracking-widest text-slate-6 mb-2">Detailed Context</div>
                              <pre className="p-3 bg-slate-1 rounded border border-white/[0.04] text-xs font-mono text-slate-8 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {detail && (
                      <div className="shrink-0 pt-2 text-slate-6">
                        <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-90")} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
