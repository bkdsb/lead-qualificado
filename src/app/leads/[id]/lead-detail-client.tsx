'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, SCORE_BAND_LABELS, MATCH_STRENGTH_LABELS, STAGE_TRANSITIONS, DUAL_CONFIRM_EVENTS, META_EVENT_NAMES } from '@/lib/utils/constants';
import type { DbLead, DbLeadIdentitySignal, DbLeadNote, DbLeadStageHistory, DbLeadScoreEvent, DbMetaEventDispatch, LeadStage, ScoreBand, MatchStrength } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { ArrowLeft, User, Phone, Mail, Globe, MapPin, Search, Send, Activity, ShieldCheck, HelpCircle, CheckCircle2, AlertTriangle, Plus, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LeadData {
  lead: DbLead;
  signals: DbLeadIdentitySignal[];
  notes: DbLeadNote[];
  stageHistory: DbLeadStageHistory[];
  scoreEvents: DbLeadScoreEvent[];
  dispatches: DbMetaEventDispatch[];
  matchAnalysis: {
    strength: MatchStrength;
    numericValue: number;
    availableSignals: string[];
    missingSignals: string[];
    warnings: string[];
    recommendations: string[];
  };
}

export default function LeadDetailClient({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [data, setData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'signals' | 'dispatches' | 'notes'>('timeline');

  // Modal states
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchEvent, setDispatchEvent] = useState('Lead');
  const [dispatchStep, setDispatchStep] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<Record<string, unknown> | null>(null);
  const [previewPayload, setPreviewPayload] = useState<Record<string, unknown> | null>(null);
  const [purchaseValue, setPurchaseValue] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('BRL');

  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStageChange(toStage: string) {
    await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_stage: toStage }),
    });
    fetchData();
  }

  async function handleScoreEvent(eventType: string, customPoints?: number) {
    await fetch(`/api/leads/${leadId}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, points: customPoints, note: customPoints !== undefined ? `Ajuste manual: ${customPoints}` : undefined }),
    });
    fetchData();
  }

  async function handleDeleteScoreEvent(eventId: string) {
    if (!confirm('Remover este evento de score?')) return;
    await fetch(`/api/leads/${leadId}/score?event_id=${eventId}`, {
      method: 'DELETE',
    });
    fetchData();
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    setAddingNote(true);
    await fetch(`/api/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteContent }),
    });
    setNoteContent('');
    setAddingNote(false);
    fetchData();
  }

  async function openDispatchModal(eventName: string) {
    setDispatchEvent(eventName);
    setDispatchStep(1);
    setConfirmText('');
    setDispatchResult(null);
    setShowDispatch(true);

    const initialValue = data?.lead.purchase_value ? Number(data.lead.purchase_value) : 0;
    const initialCurrency = data?.lead.currency ? String(data.lead.currency) : 'BRL';
    setPurchaseValue(initialValue);
    setCurrency(initialCurrency);

    const res = await fetch('/api/meta/preview-payload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        event_name: eventName,
        is_test: true,
        custom_data: eventName === 'Purchase' ? { value: initialValue, currency: initialCurrency } : undefined,
      }),
    });
    const json = await res.json();
    setPreviewPayload(json);
  }

  async function handleDispatch() {
    setDispatching(true);
    const requiresConfirm = DUAL_CONFIRM_EVENTS.includes(dispatchEvent as typeof DUAL_CONFIRM_EVENTS[number]);

    const res = await fetch('/api/meta/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        event_name: dispatchEvent,
        is_test: true,
        override_idempotency: true,
        confirmation_text: requiresConfirm ? confirmText : undefined,
        custom_data: dispatchEvent === 'Purchase' ? { value: purchaseValue, currency: currency } : undefined,
      }),
    });
    const json = await res.json();
    setDispatchResult(json);
    setDispatching(false);
    if (json.success) fetchData();
  }

  if (loading || !data) {
    return <div className="p-8 text-slate-7 text-sm font-medium tracking-tight">Recuperando registros neurais...</div>;
  }

  const { lead, notes, stageHistory, scoreEvents, dispatches, matchAnalysis } = data;
  const requiresConfirm = DUAL_CONFIRM_EVENTS.includes(dispatchEvent as typeof DUAL_CONFIRM_EVENTS[number]);
  const allowedTransitions = STAGE_TRANSITIONS[lead.stage as LeadStage] || [];

  const EVENT_LABELS: Record<string, string> = {
    Lead: 'Lead',
    QualifiedLead: 'Lead Qualificado',
    Purchase: 'Venda',
    Schedule: 'Agendamento',
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-1 animate-fade-in">
      {/* Editorial Header */}
      <div className="sticky top-0 z-30 bg-slate-1/80 backdrop-blur-xl border-b border-white/[0.04] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads')} className="text-slate-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-serif italic text-2xl font-medium tracking-tight text-white leading-tight">
              {lead.name || 'Sem nome'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={lead.stage === 'purchase' ? 'success' : lead.stage === 'qualified' ? 'warning' : 'neutral'}>
                {STAGE_LABELS[lead.stage as LeadStage]}
              </Badge>
              <span className="text-slate-6 text-xs font-mono tracking-wider">{lead.id.split('-')[0]}</span>
            </div>
          </div>
        </div>
        
        {/* Primary Action Array */}
        <div className="hidden md:flex items-center gap-2">
          {allowedTransitions.map(s => (
            <Button key={s} variant="secondary" onClick={() => handleStageChange(s)} className="text-xs h-8">
              Mover para {STAGE_LABELS[s]} <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ))}
          <div className="w-px h-6 bg-white/[0.04] mx-2" />
          {META_EVENT_NAMES.map(ev => (
            <Button key={ev} variant="primary" onClick={() => openDispatchModal(ev)} className="text-xs h-8">
              <Send className="w-3 h-3 mr-1.5 opacity-70" /> {EVENT_LABELS[ev] || ev}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Ledger Layout */}
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
        
        {/* Left Column: Metrics & Identity */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-5 pb-3 border-b border-white/[0.04]">
              <CardTitle className="uppercase text-[11px] tracking-widest text-slate-7 flex items-center justify-between">
                Performance Score
                <Activity className="w-3.5 h-3.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-end justify-between">
                <div className="text-4xl font-mono font-bold tracking-tighter text-white">{lead.score}</div>
                <Badge variant="neutral" className="uppercase font-bold tracking-widest">{SCORE_BAND_LABELS[lead.score_band as ScoreBand]}</Badge>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleScoreEvent('conversation_started')} className="text-xs bg-slate-2 border border-slate-3">+ Conversa</Button>
                <Button variant="ghost" size="sm" onClick={() => handleScoreEvent('proposal_sent')} className="text-xs bg-slate-2 border border-slate-3">+ Proposta</Button>
                <Button variant="ghost" size="sm" onClick={() => handleScoreEvent('no_response')} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">- Sem resposta</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-5 pb-3 border-b border-white/[0.04]">
              <CardTitle className="uppercase text-[11px] tracking-widest text-slate-7 flex items-center justify-between">
                <Tooltip content="Qualidade dos dados de identidade do lead comparado aos requisitos do Facebook.">
                  <span className="flex items-center gap-1.5 cursor-help">Força do Match <HelpCircle className="w-3 h-3" /></span>
                </Tooltip>
                <ShieldCheck className="w-3.5 h-3.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium text-white">{MATCH_STRENGTH_LABELS[matchAnalysis.strength]}</div>
                <span className="text-xs text-slate-6 font-mono">{matchAnalysis.availableSignals.length}/10 sinais</span>
              </div>
              
              {matchAnalysis.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  {matchAnalysis.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-yellow-500/90 leading-relaxed mb-1 last:mb-0">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-5 pb-3 border-b border-white/[0.04]">
              <CardTitle className="uppercase text-[11px] tracking-widest text-slate-7">Contato Central</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/[0.04]">
                <div className="flex items-center gap-3 p-4">
                  <Mail className="w-4 h-4 text-slate-7" />
                  <span className="text-sm text-slate-9 tracking-tight">{lead.email || '—'}</span>
                </div>
                <div className="flex items-center gap-3 p-4">
                  <Phone className="w-4 h-4 text-slate-7" />
                  <span className="text-sm text-slate-9 tracking-tight font-mono">{lead.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-3 p-4">
                  <Globe className="w-4 h-4 text-slate-7" />
                  <span className="text-sm text-slate-9 tracking-tight capitalize">{lead.source}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ledger Log */}
        <div className="flex flex-col min-h-0 bg-surface border border-white/[0.04] rounded-xl shadow-subtle overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-white/[0.04] bg-slate-2/50 px-2 lg:px-4">
            {([
              { key: 'timeline', label: 'Histórico' },
              { key: 'signals', label: 'Sinais e Atribuição' },
              { key: 'dispatches', label: 'Disparos Meta' },
              { key: 'notes', label: 'Anotações' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                className={cn(
                  "px-4 py-3 text-xs font-medium tracking-wide transition-all border-b-2 whitespace-nowrap",
                  activeTab === tab.key 
                    ? "border-slate-9 text-slate-10" 
                    : "border-transparent text-slate-7 hover:text-slate-9 hover:border-slate-7"
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {/* Timeline Ledger */}
                {activeTab === 'timeline' && (
                  <div className="relative border-l border-white/[0.06] ml-3 pb-8">
                    {[...stageHistory.map(h => ({ type: 'stage' as const, date: h.created_at, data: h })),
                      ...scoreEvents.map(e => ({ type: 'score' as const, date: e.created_at, data: e })),
                      ...dispatches.map(d => ({ type: 'dispatch' as const, date: d.dispatched_at, data: d })),
                      ...notes.map(n => ({ type: 'note' as const, date: n.created_at, data: n })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, i) => (
                      <div key={i} className="relative pl-6 pb-6 last:pb-0">
                        {/* Bullet point */}
                        <div className={cn(
                          "absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-slate-1",
                          item.type === 'stage' ? 'bg-blue-400' :
                          item.type === 'score' ? 'bg-slate-5' :
                          item.type === 'dispatch' ? 'bg-green-400' : 'bg-slate-7'
                        )} />
                        
                        <div className="text-xs font-mono text-slate-6 mb-1">
                          {new Date(item.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                        
                        {item.type === 'stage' && (
                          <div className="text-sm text-slate-9 font-medium tracking-tight">
                            Mudança para <span className="text-blue-400">{STAGE_LABELS[(item.data as DbLeadStageHistory).to_stage as LeadStage]}</span>
                          </div>
                        )}

                        {item.type === 'score' && (
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-9 tracking-tight">
                              Score: <span className="font-mono">{(item.data as DbLeadScoreEvent).event_type}</span>
                              <span className={cn("ml-2 font-mono font-bold", (item.data as DbLeadScoreEvent).points > 0 ? "text-green-400" : "text-red-400")}>
                                {(item.data as DbLeadScoreEvent).points > 0 ? '+' : ''}{(item.data as DbLeadScoreEvent).points}
                              </span>
                            </div>
                            <button className="text-slate-7 hover:text-red-400 transition-colors" onClick={() => handleDeleteScoreEvent((item.data as DbLeadScoreEvent).id)}>✕</button>
                          </div>
                        )}

                        {item.type === 'dispatch' && (
                          <div>
                            <div className="text-sm text-slate-9 tracking-tight font-medium">
                              Envio API: {EVENT_LABELS[(item.data as DbMetaEventDispatch).event_name] || (item.data as DbMetaEventDispatch).event_name}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant={(item.data as DbMetaEventDispatch).status === 'success' ? 'success' : 'danger'}>
                                {(item.data as DbMetaEventDispatch).status === 'success' ? 'Sucesso 200' : 'Falha'}
                              </Badge>
                              <span className="text-xs text-slate-6 font-mono">{(item.data as DbMetaEventDispatch).match_strength_at_send}</span>
                            </div>
                          </div>
                        )}

                        {item.type === 'note' && (
                          <div className="text-sm text-slate-8 leading-relaxed">
                            "{(item.data as DbLeadNote).content}"
                          </div>
                        )}
                      </div>
                    ))}
                    {stageHistory.length === 0 && scoreEvents.length === 0 && dispatches.length === 0 && notes.length === 0 && (
                      <div className="text-sm text-slate-7 italic pl-6">Nenhum rastro encontrado no log.</div>
                    )}
                  </div>
                )}

                {/* Signals Map */}
                {activeTab === 'signals' && (
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-7 uppercase tracking-widest mb-3">Vetor Disponível</h4>
                      <div className="flex flex-wrap gap-2">
                        {matchAnalysis.availableSignals.map(s => (
                          <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-mono border border-green-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-7 uppercase tracking-widest mb-3">Sinais Cegos (Faltantes)</h4>
                      <div className="flex flex-wrap gap-2">
                        {matchAnalysis.missingSignals.map(s => (
                          <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-3 text-slate-6 text-xs font-mono border border-slate-4">
                            <AlertTriangle className="w-3 h-3 opacity-50" /> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw Dispatches */}
                {activeTab === 'dispatches' && (
                  <div className="space-y-4">
                    {dispatches.length === 0 ? <p className="text-sm text-slate-7">Nenhum payload disparado via CAPI.</p> :
                      dispatches.map(d => (
                      <div key={d.id} className="p-4 rounded-lg border border-white/[0.04] bg-slate-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-white">{EVENT_LABELS[d.event_name] || d.event_name}</div>
                            <div className="text-xs text-slate-6 font-mono mt-0.5">{new Date(d.dispatched_at).toLocaleString('pt-BR', { timeStyle: 'medium', dateStyle: 'short' })}</div>
                          </div>
                          <Badge variant={d.status === 'success' ? 'success' : 'danger'}>{d.status.toUpperCase()}</Badge>
                        </div>
                        <details className="mt-4 group">
                          <summary className="text-xs text-blue-400 cursor-pointer font-medium tracking-wide flex items-center outline-none">
                            <ChevronRight className="w-3.5 h-3.5 mr-1 transition-transform group-open:rotate-90" />
                            VIEW RAW PAYLOAD
                          </summary>
                          <div className="mt-3 p-3 rounded bg-slate-1 border border-white/[0.04] overflow-x-auto">
                            <pre className="text-[10px] text-slate-7 font-mono">{JSON.stringify(d.payload_sent, null, 2)}</pre>
                            {d.response_body && (
                              <>
                                <div className="text-[10px] text-slate-6 font-mono mt-3 mb-1 border-t border-white/[0.04] pt-2">RESPONSE</div>
                                <pre className="text-[10px] text-slate-7 font-mono">{JSON.stringify(d.response_body, null, 2)}</pre>
                              </>
                            )}
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes Input */}
                {activeTab === 'notes' && (
                  <div>
                    <form onSubmit={handleAddNote} className="flex gap-2 mb-8">
                      <Input 
                        placeholder="Adicionar nota de inteligência..." 
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={addingNote || !noteContent.trim()}>Salvar</Button>
                    </form>
                    <div className="space-y-4">
                      {notes.map(n => (
                        <div key={n.id} className="p-4 bg-slate-2 border border-white/[0.04] rounded-md">
                          <p className="text-sm text-slate-9 leading-relaxed">{n.content}</p>
                          <span className="text-[10px] text-slate-6 font-mono mt-2 block">{new Date(n.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Dispatch Modal overrides using Resend precise style */}
      <AnimatePresence>
        {showDispatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center isolate p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm -z-10"
              onClick={() => setShowDispatch(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-surface border border-white/[0.08] shadow-popover w-full max-w-[500px] rounded-xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/[0.04]">
                <h2 className="text-lg font-serif italic text-white tracking-tight">Enviar Evento: {EVENT_LABELS[dispatchEvent]}</h2>
              </div>
              <div className="p-6">
                {dispatchResult ? (
                  <div className="space-y-4">
                    <div className={cn("p-4 border rounded-md text-sm font-medium", dispatchResult.success ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                      {dispatchResult.success ? '✓ Transmissão realizada com sucesso (200 OK)' : `✕ Rejeitado pela Meta: ${String(dispatchResult.error)}`}
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button variant="secondary" onClick={() => setShowDispatch(false)}>Fechar</Button>
                    </div>
                  </div>
                ) : dispatchStep === 1 ? (
                  <div className="space-y-6">
                    {dispatchEvent === 'Purchase' && (
                      <div className="grid grid-cols-[1fr_80px] gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-7">Valor (R$)</label>
                          <Input type="number" value={purchaseValue} onChange={e => setPurchaseValue(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-7">Moeda</label>
                          <Input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-7 bg-slate-2 border border-slate-3 rounded p-4 font-mono">
                      Lead ID: {lead.id.split('-')[0]}<br/>
                      Força do Match: {MATCH_STRENGTH_LABELS[matchAnalysis.strength]}<br/>
                      <span className="text-yellow-500/80">Forçar Reenvio: Ativo</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.04]">
                      <Button variant="ghost" onClick={() => setShowDispatch(false)}>Cancelar</Button>
                      {requiresConfirm ? (
                        <Button 
                          onClick={() => setDispatchStep(2)}
                          disabled={dispatchEvent === 'Purchase' && (isNaN(purchaseValue) || purchaseValue <= 0)}
                        >
                          Continuar
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleDispatch} 
                          disabled={dispatching || (dispatchEvent === 'Purchase' && (isNaN(purchaseValue) || purchaseValue <= 0))}
                        >
                          {dispatching ? 'Enviando...' : 'Enviar Evento'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-md text-sm leading-relaxed">
                      <strong>Confirmação dupla necessária.</strong><br/>
                      Você está prestes a forçar um envio manual deste evento crítico para o Facebook. Essa arquitetura não pode ser desfeita.
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-7">Digite CONFIRMAR para prosseguir</label>
                      <Input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} autoFocus />
                    </div>
                    <div className="flex justify-between pt-4 border-t border-white/[0.04]">
                      <Button variant="ghost" onClick={() => setDispatchStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
                      <Button variant="danger" onClick={handleDispatch} disabled={dispatching || confirmText !== 'CONFIRMAR'}>
                        {dispatching ? 'Executando...' : 'Forçar Envio'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
