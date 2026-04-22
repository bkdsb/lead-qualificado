'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const EVENT_LABELS: Record<string, string> = {
  Lead: 'Lead',
  QualifiedLead: 'Qualificado',
  Schedule: 'Agendamento',
  Purchase: 'Venda',
};

export default function EventsClient({ dispatches }: { dispatches: Array<Record<string, unknown>> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const total = dispatches.length;
  const success = dispatches.filter(d => d.status === 'success').length;
  const failed = dispatches.filter(d => d.status === 'failed').length;

  return (
    <div className="p-4 md:p-8 space-y-5 animate-fade-in">
      {/* Header + inline stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Envios Meta</h1>
          <p className="text-[13px] text-slate-7 mt-0.5">Eventos transmitidos via Conversions API.</p>
        </div>
        <div className="flex items-center gap-3 text-[12px] font-mono">
          <span className="text-slate-7">Total <strong className="text-slate-9 ml-1">{total}</strong></span>
          <span className="text-slate-5">·</span>
          <span className="text-slate-7">OK <strong className="text-green-400 ml-1">{success}</strong></span>
          <span className="text-slate-5">·</span>
          <span className="text-slate-7">Falha <strong className={failed > 0 ? "text-red-400 ml-1" : "text-slate-6 ml-1"}>{failed}</strong></span>
        </div>
      </div>

      {/* Desktop Table — 5 columns */}
      <Card className="hidden md:block">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-2/40 text-[11px] uppercase tracking-widest text-slate-7 font-medium">
            <tr>
              <th className="px-4 py-2.5 border-b border-white/[0.04]">Lead</th>
              <th className="px-4 py-2.5 border-b border-white/[0.04]">Evento</th>
              <th className="px-4 py-2.5 border-b border-white/[0.04]">Status</th>
              <th className="px-4 py-2.5 border-b border-white/[0.04]">Data</th>
              <th className="px-4 py-2.5 border-b border-white/[0.04] w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {dispatches.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-7 text-sm">Nenhum evento enviado.</td></tr>
            ) : dispatches.map(d => (
              <tr key={d.id as string} className="transition-colors hover:bg-slate-2/50">
                <td className="px-4 py-3 text-slate-9 truncate max-w-[160px]">
                  {(d.leads as Record<string, unknown>)?.name as string || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-white">{EVENT_LABELS[d.event_name as string] || d.event_name as string}</span>
                  {d.environment === 'test' && <span className="ml-2 text-[10px] text-yellow-500 font-mono">TEST</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={d.status === 'success' ? 'success' : d.status === 'failed' ? 'danger' : 'neutral'}>
                    {d.status === 'success' ? 'Enviado' : d.status === 'failed' ? 'Erro' : d.status as string}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[12px] text-slate-6">
                  {new Date(d.dispatched_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpandedId(expandedId === d.id as string ? null : d.id as string)}
                    className="text-slate-6 hover:text-slate-9 transition-colors cursor-pointer p-1"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedId === d.id ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedId === d.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2"
                    >
                      <div className="text-[10px] text-slate-6 font-mono space-y-1 mb-2">
                        <div>Match: <span className="text-slate-8">{d.match_strength_at_send as string || '—'}</span></div>
                        <div>HTTP: <span className="text-slate-8">{d.response_status as number || '—'}</span></div>
                        <div>Ambiente: <span className="text-slate-8">{d.environment === 'test' ? 'Teste' : 'Produção'}</span></div>
                      </div>
                      <pre className="text-[10px] text-slate-7 font-mono bg-slate-1 border border-white/[0.04] rounded-md p-3 overflow-auto max-h-[180px]">
                        {JSON.stringify(d.payload_sent, null, 2)}
                      </pre>
                      {Boolean(d.error_message) && (
                        <div className="text-[11px] text-red-400 mt-2">{String(d.error_message)}</div>
                      )}
                    </motion.div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {dispatches.length === 0 ? (
          <div className="py-10 text-center text-slate-7 text-sm">Nenhum evento enviado.</div>
        ) : dispatches.map(d => (
          <Card key={d.id as string} className="p-3.5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-white text-sm">
                  {EVENT_LABELS[d.event_name as string] || d.event_name as string}
                  {d.environment === 'test' && <span className="ml-2 text-[10px] text-yellow-500 font-mono">TEST</span>}
                </div>
                <div className="text-[11px] text-slate-6 mt-0.5">
                  {(d.leads as Record<string, unknown>)?.name as string || '—'}
                </div>
              </div>
              <Badge variant={d.status === 'success' ? 'success' : d.status === 'failed' ? 'danger' : 'neutral'}>
                {d.status === 'success' ? 'Enviado' : d.status === 'failed' ? 'Erro' : d.status as string}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-6">
              <span>{new Date(d.dispatched_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            {Boolean(d.error_message) && (
              <div className="text-[11px] text-red-400 mt-2">{String(d.error_message)}</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
