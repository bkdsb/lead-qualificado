'use client';

import { useState } from 'react';
import type { DbMetaEventDispatch, DbDatasetQualitySnapshot } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QAClient({
  dispatches,
  dqSnapshots,
}: {
  dispatches: DbMetaEventDispatch[];
  dqSnapshots: DbDatasetQualitySnapshot[];
}) {
  const [fetchingDQ, setFetchingDQ] = useState(false);
  const [dqResult, setDqResult] = useState<Record<string, unknown> | null>(null);

  async function fetchDatasetQuality() {
    setFetchingDQ(true);
    const res = await fetch('/api/meta/dataset-quality');
    const data = await res.json();
    setDqResult(data);
    setFetchingDQ(false);
  }

  const failedDispatches = dispatches.filter(d => d.status === 'failed');
  const testDispatches = dispatches.filter(d => d.environment === 'test');
  const prodDispatches = dispatches.filter(d => d.environment === 'production');

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-1 mb-8">
        <h1 className="font-serif italic text-3xl font-medium tracking-tight text-white mb-2">Qualidade CAPI</h1>
        <p className="text-sm text-slate-7">Monitoramento de transmissão e Event Match Quality (EMQ).</p>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="uppercase text-[11px] tracking-widest text-slate-7 flex items-center justify-between">
              Volume Recente <Send className="w-3.5 h-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-mono tracking-tighter text-white font-bold">{dispatches.length}</div>
            <div className="text-xs text-slate-6 mt-1 flex items-center gap-2">
              <span className="text-slate-8">{prodDispatches.length} Prod</span>
              <span className="text-slate-8">{testDispatches.length} Test</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="uppercase text-[11px] tracking-widest text-slate-7 flex items-center justify-between">
              Taxa de Falha <AlertTriangle className="w-3.5 h-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className={`text-3xl font-mono tracking-tighter font-bold ${failedDispatches.length > 0 ? 'text-red-400' : 'text-slate-9'}`}>
              {failedDispatches.length}
            </div>
            <div className="text-xs text-slate-6 mt-1">Payloads não processados (4xx / 5xx)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
            <Tooltip content="Mede a qualidade dos dados enviados (EMQ). Acima de 6.0 é razoável.">
              <span className="uppercase text-[11px] font-semibold tracking-widest text-slate-8 cursor-help border-b border-dashed border-slate-7">
                Event Match Quality
              </span>
            </Tooltip>
            <ShieldCheck className="w-3.5 h-3.5 text-slate-7" />
          </CardHeader>
          <CardContent className="p-5 pt-0 flex justify-between items-end">
            <div className="text-xs text-slate-6 max-w-[140px] leading-relaxed">Avalie o EMQ direto do Facebook Graph API.</div>
            <Button size="sm" onClick={fetchDatasetQuality} disabled={fetchingDQ} className="h-8">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${fetchingDQ ? 'animate-spin' : ''}`} />
              {fetchingDQ ? 'Buscando...' : 'Sync Meta'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {(dqResult || fetchingDQ) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-blue-500/20 bg-[#0d1520] mt-6 relative overflow-hidden font-mono shadow-xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
              <CardHeader className="p-3 border-b border-blue-500/20 flex flex-row items-center justify-between bg-blue-500/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 ml-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50 hover:bg-red-500 cursor-pointer transition-colors" onClick={() => setDqResult(null)} />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                  <CardTitle className="text-blue-400 text-xs tracking-wider uppercase ml-3">Terminal · GraphAPI /dataset-quality</CardTitle>
                </div>
                {fetchingDQ && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 max-h-[400px] overflow-auto">
                  {fetchingDQ ? (
                    <div className="text-blue-300 text-xs flex flex-col gap-1 opacity-70">
                      <span>&gt; establishing connection to graph.facebook.com...</span>
                      <span>&gt; negotiating ssl handshake...</span>
                      <span className="animate-pulse">&gt; waiting for response dump_</span>
                    </div>
                  ) : dqResult?.error ? (
                    <div className="text-red-400 text-xs">&gt; FATAL ERROR: {String(dqResult.error)}</div>
                  ) : (
                    <pre className="text-[11px] text-blue-300">
                      <span className="text-blue-400 opacity-50 select-none mr-2">1</span><span className="text-blue-500">const</span> response = <br/>
                      {JSON.stringify(dqResult?.data, null, 2).split('\n').map((line, i) => (
                        <div key={i}><span className="text-blue-400 opacity-50 select-none mr-3 w-4 inline-block text-right">{i+2}</span>{line}</div>
                      ))}
                    </pre>
                  )}
                </div>
                {!fetchingDQ && (
                  <div className="p-2 border-t border-blue-500/20 bg-blue-500/5 flex justify-end">
                    <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 text-[10px] uppercase tracking-widest" onClick={() => setDqResult(null)}>
                      Clear Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader className="p-5 border-b border-white/[0.04]">
          <CardTitle>Histórico de Qualidade (Snapshots EMQ)</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-2/50 text-[11px] uppercase tracking-widest text-slate-7 font-semibold">
              <tr>
                <th className="px-5 py-3 border-b border-white/[0.04]">Evento</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">EMQ Score</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Cobertura</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Atualidade</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Atribuição (ACR)</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Data Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {dqSnapshots.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-7">Nenhum snapshot de EMQ capturado.</td></tr>
              ) : dqSnapshots.map(s => (
                <tr key={s.id} className="hover:bg-slate-2/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-white">{s.event_name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-mono font-bold text-lg ${(s.composite_score || 0) >= 7 ? 'text-green-400' : (s.composite_score || 0) >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {s.composite_score?.toFixed(1) || '—'}
                    </span>
                    <span className="text-xs text-slate-6 ml-0.5">/10</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-9 font-mono">{s.event_coverage_pct ? `${s.event_coverage_pct}%` : '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-7">{s.data_freshness || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-9 font-mono">{s.acr_percentage ? `${s.acr_percentage}%` : '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-6">{new Date(s.fetched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader className="p-5 border-b border-white/[0.04]">
          <CardTitle>Log de Transmissão Recente</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-2/50 text-[11px] uppercase tracking-widest text-slate-7 font-semibold">
              <tr>
                <th className="px-5 py-3 border-b border-white/[0.04]">Evento</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Ambiente</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Status</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Força Match</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Atribuição Analítica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {dispatches.map(d => {
                const rawSignals = d.payload_raw_signals as Record<string, unknown> || {};
                const sigUsed = rawSignals.signals_used as string[] || [];
                const warnings = rawSignals.warnings as string[] || [];
                
                return (
                  <tr key={d.id} className="hover:bg-slate-2/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-9">{d.event_name}</div>
                      <div className="text-[11px] text-slate-6 font-mono mt-1">{new Date(d.dispatched_at).toLocaleString('pt-BR')}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={d.environment === 'test' ? 'warning' : 'neutral'}>{d.environment === 'test' ? 'TEST' : 'PROD'}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={d.status === 'success' ? 'success' : 'danger'}>{d.status === 'success' ? '200 OK' : 'Falha'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs">{d.match_strength_at_send || '—'}</td>
                    <td className="px-5 py-3.5 max-w-sm">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {sigUsed.slice(0,4).map(s => <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20">{s}</span>)}
                        {sigUsed.length > 4 && <span className="text-xs text-slate-6">+{sigUsed.length - 4}</span>}
                      </div>
                      {warnings.map((w, i) => (
                        <div key={i} className="text-[10px] text-yellow-500/80 mt-1 leading-tight">⚠ {w}</div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
