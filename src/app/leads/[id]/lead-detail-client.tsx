'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, SCORE_BAND_LABELS, MATCH_STRENGTH_LABELS, STAGE_TRANSITIONS, DUAL_CONFIRM_EVENTS, META_EVENT_NAMES } from '@/lib/utils/constants';
import type { DbLead, DbLeadIdentitySignal, DbLeadNote, DbLeadStageHistory, DbLeadScoreEvent, DbMetaEventDispatch, LeadStage, ScoreBand, MatchStrength } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Phone, Mail, Globe, Send, Activity, ShieldCheck, CheckCircle2, AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'technical'>('timeline');
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showEventMenu, setShowEventMenu] = useState(false);

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
    QualifiedLead: 'Qualificado',
    Purchase: 'Venda',
    Schedule: 'Agendamento',
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-1 animate-fade-in">
      {/* Header — Clean */}
      <div className="sticky top-0 z-30 bg-slate-1/80 backdrop-blur-xl border-b border-white/[0.04] px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads')} className="text-slate-7 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-white truncate">
              {lead.name || 'Sem nome'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={lead.stage === 'purchase' ? 'success' : lead.stage === 'qualified' ? 'warning' : 'neutral'}>
                {STAGE_LABELS[lead.stage as LeadStage]}
              </Badge>
              <span className="text-[11px] text-slate-6 font-mono">{lead.score} pts</span>
            </div>
          </div>
        </div>
        
        {/* Action Dropdowns */}
        <div className="flex items-center gap-2">
          {allowedTransitions.length > 0 && (
            <div className="relative">
              <Button variant="secondary" onClick={() => { setShowStageMenu(!showStageMenu); setShowEventMenu(false); }} className="text-[12px] h-8 gap-1.5">
                Mover <ChevronDown className={cn("w-3 h-3 transition-transform", showStageMenu && "rotate-180")} />
              </Button>
              {showStageMenu && (
                <div className="absolute right-0 top-full mt-1 bg-surface border border-white/[0.08] rounded-lg shadow-popover py-1 w-44 z-50">
                  {allowedTransitions.map(s => (
                    <button key={s} onClick={() => { handleStageChange(s); setShowStageMenu(false); }} className="w-full text-left px-3 py-2 text-[13px] text-slate-8 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer">
                      {STAGE_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="relative">
            <Button variant="primary" onClick={() => { setShowEventMenu(!showEventMenu); setShowStageMenu(false); }} className="text-[12px] h-8 gap-1.5">
              <Send className="w-3 h-3" /> Enviar <ChevronDown className={cn("w-3 h-3 transition-transform", showEventMenu && "rotate-180")} />
            </Button>
            {showEventMenu && (
              <div className="absolute right-0 top-full mt-1 bg-surface border border-white/[0.08] rounded-lg shadow-popover py-1 w-44 z-50">
                {META_EVENT_NAMES.map(ev => (
                  <button key={ev} onClick={() => { openDispatchModal(ev); setShowEventMenu(false); }} className="w-full text-left px-3 py-2 text-[13px] text-slate-8 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer">
                    {EVENT_LABELS[ev] || ev}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Layout */}
      <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        
        {/* Left Column: Metrics & Identity */}
        <div className="space-y-6">
          {/* Score + Match — Merged */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-7 mb-1">Score</div>
                  <div className="text-3xl font-mono font-bold tracking-tighter text-white">{lead.score}</div>
                </div>
                <Badge variant="neutral" className="uppercase font-bold tracking-widest text-[10px]">{SCORE_BAND_LABELS[lead.score_band as ScoreBand]}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => handleScoreEvent('conversation_started')} className="text-[11px] h-7 bg-slate-2 border border-slate-3">+ Conversa</Button>
                <Button variant="ghost" size="sm" onClick={() => handleScoreEvent('proposal_sent')} className="text-[11px] h-7 bg-slate-2 border border-slate-3">+ Proposta</Button>
                <Button variant="ghost" size="sm" onClick={() => handleScoreEvent('no_response')} className="text-[11px] h-7 text-red-400 hover:bg-red-500/10">- S/ Resposta</Button>
              </div>
              <div className="pt-3 border-t border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-7 uppercase tracking-widest">
                    <ShieldCheck className="w-3 h-3" /> Match
                  </div>
                  <span className="text-[12px] text-slate-6 font-mono">{matchAnalysis.availableSignals.length}/10</span>
                </div>
                <div className="text-sm font-medium text-white mt-1">{MATCH_STRENGTH_LABELS[matchAnalysis.strength]}</div>
              </div>
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
              { key: 'notes', label: 'Anotações' },
              { key: 'technical', label: 'Técnico' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                className={cn(
                  "px-4 py-3 text-xs font-medium tracking-wide transition-all border-b-2 whitespace-nowrap cursor-pointer",
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

          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
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
                              <span className={cn("font-mono font-bold", (item.data as DbLeadScoreEvent).points > 0 ? "text-green-400" : "text-red-400")}>
                                {(item.data as DbLeadScoreEvent).points > 0 ? '+' : ''}{(item.data as DbLeadScoreEvent).points} pts
                              </span>
                              <span className="text-slate-7 ml-1.5">{(item.data as DbLeadScoreEvent).note || (item.data as DbLeadScoreEvent).event_type}</span>
                            </div>
                            <button className="text-slate-7 hover:text-red-400 transition-colors cursor-pointer" onClick={() => handleDeleteScoreEvent((item.data as DbLeadScoreEvent).id)}>✕</button>
                          </div>
                        )}

                        {item.type === 'dispatch' && (
                          <div>
                            <div className="text-sm text-slate-9 tracking-tight font-medium">
                              Envio: {EVENT_LABELS[(item.data as DbMetaEventDispatch).event_name] || (item.data as DbMetaEventDispatch).event_name}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant={(item.data as DbMetaEventDispatch).status === 'success' ? 'success' : 'danger'}>
                                {(item.data as DbMetaEventDispatch).status === 'success' ? 'Enviado ✓' : 'Falha'}
                              </Badge>
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

                {/* Technical Tab — Signals + Dispatches merged */}
                {activeTab === 'technical' && (
                  <div className="space-y-8">
                    {/* Signals */}
                    <div>
                      <h4 className="text-[11px] font-medium text-slate-7 uppercase tracking-widest mb-3">Sinais disponíveis</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {matchAnalysis.availableSignals.map(s => (
                          <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-[11px] font-mono border border-green-500/20">
                            <CheckCircle2 className="w-3 h-3" /> {s}
                          </span>
                        ))}
                      </div>
                      {matchAnalysis.missingSignals.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-[11px] font-medium text-slate-7 uppercase tracking-widest mb-2">Sinais faltantes</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {matchAnalysis.missingSignals.map(s => (
                              <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-3 text-slate-6 text-[11px] font-mono border border-slate-4">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dispatches */}
                    <div>
                      <h4 className="text-[11px] font-medium text-slate-7 uppercase tracking-widest mb-3">Disparos CAPI</h4>
                      {dispatches.length === 0 ? <p className="text-sm text-slate-7">Nenhum disparo.</p> :
                        <div className="space-y-2">
                          {dispatches.map(d => (
                            <details key={d.id} className="group rounded-md border border-white/[0.04] bg-slate-2 overflow-hidden">
                              <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <Badge variant={d.status === 'success' ? 'success' : 'danger'} className="text-[10px]">
                                    {d.status === 'success' ? 'OK' : 'Erro'}
                                  </Badge>
                                  <span className="text-[13px] font-medium text-slate-9">{EVENT_LABELS[d.event_name] || d.event_name}</span>
                                  <span className="text-[11px] text-slate-6">{new Date(d.dispatched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-6 transition-transform group-open:rotate-90" />
                              </summary>
                              <div className="px-3 pb-3">
                                <div className="text-[10px] text-slate-6 font-mono mb-2">Match: {d.match_strength_at_send} · HTTP: {d.response_status}</div>
                                <pre className="text-[10px] text-slate-7 font-mono bg-slate-1 border border-white/[0.04] rounded p-2.5 overflow-auto max-h-[150px]">{JSON.stringify(d.payload_sent, null, 2)}</pre>
                              </div>
                            </details>
                          ))}
                        </div>
                      }
                    </div>
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
                <h2 className="text-lg font-semibold text-white tracking-tight">Enviar Evento: {EVENT_LABELS[dispatchEvent]}</h2>
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

                    <div className="text-[12px] text-slate-6 bg-slate-2 border border-slate-3 rounded-md p-3">
                      Match: {MATCH_STRENGTH_LABELS[matchAnalysis.strength]} · Reenvio forçado
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
