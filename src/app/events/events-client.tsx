'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const EVENT_LABELS: Record<string, string> = {
  Lead: 'Lead',
  QualifiedLead: 'Lead Qualificado',
  Purchase: 'Venda',
  Schedule: 'Agendamento',
};

export default function EventsClient({ dispatches }: { dispatches: Array<Record<string, unknown>> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Envios Meta</h1>
        <p className="text-sm text-slate-7">Histórico completo de eventos transmitidos via Conversions API.</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-7 mb-1">Total</div>
              <div className="text-2xl font-mono font-bold tracking-tighter text-white">{dispatches.length}</div>
            </div>
            <Send className="w-4 h-4 text-slate-6" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-7 mb-1">Sucesso</div>
            <div className="text-2xl font-mono font-bold tracking-tighter text-green-400">{dispatches.filter(d => d.status === 'success').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-7 mb-1">Falha</div>
            <div className="text-2xl font-mono font-bold tracking-tighter text-red-400">{dispatches.filter(d => d.status === 'failed').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="p-5 border-b border-white/[0.04]">
          <CardTitle>Log de Transmissão</CardTitle>
        </CardHeader>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-2/50 text-[11px] uppercase tracking-widest text-slate-7 font-semibold">
              <tr>
                <th className="px-5 py-3 border-b border-white/[0.04]">Lead</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Evento</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Ambiente</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Status</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Match</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">HTTP</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Data</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {dispatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-7 text-sm">
                    Nenhum evento transmitido.
                  </td>
                </tr>
              ) : dispatches.map(d => (
                <tr key={d.id as string} className="transition-colors hover:bg-slate-2/50">
                  <td className="px-5 py-3 font-medium text-slate-9 max-w-[140px] truncate">
                    {(d.leads as Record<string, unknown>)?.name as string || '—'}
                  </td>
                  <td className="px-5 py-3 font-semibold text-white">
                    {EVENT_LABELS[d.event_name as string] || d.event_name as string}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={d.environment === 'test' ? 'warning' : 'success'}>
                      {d.environment === 'test' ? 'Teste' : 'Produção'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={d.status === 'success' ? 'success' : d.status === 'failed' ? 'danger' : 'neutral'}>
                      {d.status === 'success' ? 'Sucesso' : d.status === 'failed' ? 'Erro' : d.status as string}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-8 font-mono">{d.match_strength_at_send as string || '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-8 font-mono">{d.response_status as number || '—'}</td>
                  <td className="px-5 py-3 text-xs text-slate-7">
                    {new Date(d.dispatched_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === d.id as string ? null : d.id as string)}
                      className="text-[11px] text-slate-7 hover:text-slate-9 transition-colors flex items-center gap-1"
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedId === d.id ? 'rotate-180' : ''}`} />
                      ver
                    </button>
                    {expandedId === d.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 max-w-[400px]"
                      >
                        <pre className="text-[10px] text-slate-7 font-mono bg-slate-1 border border-white/[0.04] rounded-md p-3 overflow-auto max-h-[200px]">
                          {JSON.stringify(d.payload_sent, null, 2)}
                        </pre>
                        {Boolean(d.error_message) && (
                          <div className="text-[11px] text-red-400 mt-2">Erro: {String(d.error_message)}</div>
                        )}
                      </motion.div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-white/[0.04]">
          {dispatches.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-7 text-sm">Nenhum evento transmitido.</div>
          ) : dispatches.map(d => (
            <div key={d.id as string} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">
                    {EVENT_LABELS[d.event_name as string] || d.event_name as string}
                  </div>
                  <div className="text-[12px] text-slate-7 mt-0.5">
                    {(d.leads as Record<string, unknown>)?.name as string || '—'}
                  </div>
                </div>
                <Badge variant={d.status === 'success' ? 'success' : d.status === 'failed' ? 'danger' : 'neutral'}>
                  {d.status === 'success' ? 'Sucesso' : d.status === 'failed' ? 'Erro' : d.status as string}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-6">Amb.</span>
                  <span className="ml-2 text-slate-9">{d.environment === 'test' ? 'Teste' : 'Prod'}</span>
                </div>
                <div>
                  <span className="text-slate-6">Match</span>
                  <span className="ml-2 text-slate-9 font-mono">{d.match_strength_at_send as string || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-6">HTTP</span>
                  <span className="ml-2 text-slate-9 font-mono">{d.response_status as number || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-6">Data</span>
                  <span className="ml-2 text-slate-9">{new Date(d.dispatched_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
              {Boolean(d.error_message) && (
                <div className="text-[11px] text-red-400">Erro: {String(d.error_message)}</div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
