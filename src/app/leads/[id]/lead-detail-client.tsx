'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, STAGE_COLORS, SCORE_BAND_LABELS, SCORE_BAND_COLORS, MATCH_STRENGTH_LABELS, MATCH_STRENGTH_COLORS, STAGE_TRANSITIONS, DUAL_CONFIRM_EVENTS, META_EVENT_NAMES } from '@/lib/utils/constants';
import type { DbLead, DbLeadIdentitySignal, DbLeadNote, DbLeadStageHistory, DbLeadScoreEvent, DbMetaEventDispatch, LeadStage, ScoreBand, MatchStrength } from '@/types/database';

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

function Tooltip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="tooltip-wrapper">
      {label}
      <span className="tooltip-icon">?</span>
      <span className="tooltip-text">{tip}</span>
    </span>
  );
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

  // Note
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

    // Load preview
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
    return <div style={{ padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Carregando...</div>;
  }

  const { lead, signals, notes, stageHistory, scoreEvents, dispatches, matchAnalysis } = data;
  const requiresConfirm = DUAL_CONFIRM_EVENTS.includes(dispatchEvent as typeof DUAL_CONFIRM_EVENTS[number]);
  const allowedTransitions = STAGE_TRANSITIONS[lead.stage as LeadStage] || [];

  const EVENT_LABELS: Record<string, string> = {
    Lead: 'Lead',
    QualifiedLead: 'Lead Qualificado',
    Purchase: 'Venda',
    Schedule: 'Agendamento',
  };

  return (
    <>
      {/* Header */}
      <div className="app-header">
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/leads')}>← Leads</button>
          <span className="app-header-title">{lead.name || 'Sem nome'}</span>
          <span className="badge" style={{
            background: `${STAGE_COLORS[lead.stage as LeadStage]}18`,
            color: STAGE_COLORS[lead.stage as LeadStage],
          }}>
            {STAGE_LABELS[lead.stage as LeadStage]}
          </span>
        </div>
      </div>

      <div className="app-content">
        {/* Cards de Informação */}
        <div className="stats-grid">
          <div className="card">
            <div className="card-title">Score</div>
            <div className="card-value">{lead.score}</div>
            <span className="badge" style={{
              background: `${SCORE_BAND_COLORS[lead.score_band as ScoreBand]}18`,
              color: SCORE_BAND_COLORS[lead.score_band as ScoreBand],
            }}>
              {SCORE_BAND_LABELS[lead.score_band as ScoreBand]}
            </span>
          </div>
          <div className="card">
            <div className="card-title">
              <Tooltip label="Força do Match" tip="Qualidade dos dados de identidade deste lead para correspondência com a Meta. Quanto mais forte, melhor a atribuição das conversões." />
            </div>
            <div className="card-value" style={{ fontSize: 20 }}>
              {MATCH_STRENGTH_LABELS[matchAnalysis.strength]}
            </div>
            <div className="text-xs text-muted mt-2">{matchAnalysis.availableSignals.length} sinais disponíveis</div>
          </div>
          <div className="card">
            <div className="card-title">Contato</div>
            <div style={{ fontSize: 13 }}>{lead.email || '—'}</div>
            <div style={{ fontSize: 13 }}>{lead.phone || '—'}</div>
            <div className="text-xs text-muted mt-2">Origem: {lead.source}</div>
          </div>
          <div className="card">
            <div className="card-title">Campanha</div>
            <div style={{ fontSize: 12 }}>{lead.campaign_name || '—'}</div>
            <div className="text-xs text-muted">{lead.adset_name || ''}</div>
            <div className="text-xs text-muted">{lead.ad_name || ''}</div>
          </div>
        </div>

        {/* Alertas de Match */}
        {matchAnalysis.warnings.length > 0 && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--warning-subtle)',
            border: '1px solid rgba(234,179,8,0.2)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            fontSize: 12,
            color: 'var(--warning)',
          }}>
            {matchAnalysis.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
          </div>
        )}

        {/* Barra de Ações — scroll horizontal no mobile */}
        <div className="action-scroller mb-6">
          {allowedTransitions.map(s => (
            <button key={s} className="btn btn-secondary btn-sm" onClick={() => handleStageChange(s)}>
              → {STAGE_LABELS[s]}
            </button>
          ))}
          <span className="action-divider" />
          {META_EVENT_NAMES.map(ev => (
            <button key={ev} className="btn btn-primary btn-sm" onClick={() => openDispatchModal(ev)}>
              Enviar {EVENT_LABELS[ev] || ev}
            </button>
          ))}
          <span className="action-divider" />
          <button className="btn btn-ghost btn-sm" onClick={() => handleScoreEvent('cta_click')}>+CTA</button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleScoreEvent('conversation_started')}>+Conversa</button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleScoreEvent('proposal_sent')}>+Proposta</button>
          <span className="action-divider" />
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleScoreEvent('no_response')}>−Sem Resposta</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleScoreEvent('curious_no_fit')}>−Curioso</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleScoreEvent('no_budget')}>−Sem Verba</button>
        </div>

        {/* Abas */}
        <div className="action-scroller mb-4">
          {([
            { key: 'timeline', label: 'Histórico' },
            { key: 'signals', label: 'Sinais' },
            { key: 'dispatches', label: 'Envios Meta' },
            { key: 'notes', label: 'Notas' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              className={`btn btn-ghost btn-sm ${activeTab === tab.key ? 'active' : ''}`}
              style={activeTab === tab.key ? { background: 'var(--accent-subtle)', color: 'var(--accent)' } : {}}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'timeline' && (
          <div className="card">
            <div className="timeline">
              {[...stageHistory.map(h => ({ type: 'stage' as const, date: h.created_at, data: h })),
                ...scoreEvents.map(e => ({ type: 'score' as const, date: e.created_at, data: e })),
                ...dispatches.map(d => ({ type: 'dispatch' as const, date: d.dispatched_at, data: d })),
                ...notes.map(n => ({ type: 'note' as const, date: n.created_at, data: n })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, i) => (
                <div key={i} className={`timeline-item ${item.type}`}>
                  <div className="timeline-content">
                    {item.type === 'stage' && (
                      <>
                        <div className="timeline-label">
                          {STAGE_LABELS[(item.data as DbLeadStageHistory).from_stage as LeadStage] || 'Início'} → {STAGE_LABELS[(item.data as DbLeadStageHistory).to_stage as LeadStage]}
                        </div>
                        <div className="timeline-meta">{(item.data as DbLeadStageHistory).reason || ''}</div>
                      </>
                    )}
                    {item.type === 'score' && (
                      <div className="timeline-label flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                        <span>
                          Score: {(item.data as DbLeadScoreEvent).event_type} ({(item.data as DbLeadScoreEvent).points > 0 ? '+' : ''}{(item.data as DbLeadScoreEvent).points})
                          {(item.data as DbLeadScoreEvent).note ? <span className="text-muted"> — {(item.data as DbLeadScoreEvent).note}</span> : null}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)', fontSize: 11, padding: '0 4px' }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteScoreEvent((item.data as DbLeadScoreEvent).id); }}
                          title="Remover este score"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {item.type === 'dispatch' && (
                      <>
                        <div className="timeline-label">
                          Envio Meta: {EVENT_LABELS[(item.data as DbMetaEventDispatch).event_name] || (item.data as DbMetaEventDispatch).event_name}
                          <span className={`badge ${(item.data as DbMetaEventDispatch).status === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 8 }}>
                            {(item.data as DbMetaEventDispatch).status === 'success' ? 'Sucesso' : 'Erro'}
                          </span>
                        </div>
                        <div className="timeline-meta">
                          Match: {(item.data as DbMetaEventDispatch).match_strength_at_send} | Amb: {(item.data as DbMetaEventDispatch).environment === 'test' ? 'Teste' : 'Produção'}
                        </div>
                      </>
                    )}
                    {item.type === 'note' && (
                      <div className="timeline-label">{(item.data as DbLeadNote).content}</div>
                    )}
                    <div className="timeline-meta">{new Date(item.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                  </div>
                </div>
              ))}
              {stageHistory.length === 0 && scoreEvents.length === 0 && dispatches.length === 0 && notes.length === 0 && (
                <div className="empty-state"><div className="empty-state-text">Nenhum evento ainda</div></div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="card">
            <div className="card-title mb-4">
              <Tooltip label="Sinais de Identidade" tip="Dados do lead usados para correspondência com perfis da Meta (email, telefone, IP, user agent, etc). Mais sinais = melhor atribuição." />
            </div>
            <div className="signals-grid-2col">
              <div>
                <div className="text-xs font-semibold text-muted mb-2" style={{ textTransform: 'uppercase' }}>Disponíveis</div>
                <div className="signal-grid">
                  {matchAnalysis.availableSignals.map(s => (
                    <span key={s} className="signal-tag present">✓ {s}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted mb-2" style={{ textTransform: 'uppercase' }}>Ausentes</div>
                <div className="signal-grid">
                  {matchAnalysis.missingSignals.map(s => (
                    <span key={s} className="signal-tag missing">✕ {s}</span>
                  ))}
                </div>
              </div>
            </div>
            {matchAnalysis.recommendations.length > 0 && (
              <div className="mt-4" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <strong>Recomendações:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {matchAnalysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dispatches' && (
          <>
            {/* Desktop */}
            <div className="table-container desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Ambiente</th>
                    <th>Status</th>
                    <th>Correspondência</th>
                    <th>HTTP</th>
                    <th>Data</th>
                    <th>Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Nenhum envio</td></tr>
                  ) : dispatches.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{EVENT_LABELS[d.event_name] || d.event_name}</td>
                      <td>
                        <span className={`badge ${d.environment === 'test' ? 'badge-warning' : 'badge-success'}`}>
                          {d.environment === 'test' ? 'Teste' : 'Produção'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${d.status === 'success' ? 'badge-success' : d.status === 'failed' ? 'badge-danger' : 'badge-neutral'}`}>
                          {d.status === 'success' ? 'Sucesso' : d.status === 'failed' ? 'Erro' : d.status}
                        </span>
                      </td>
                      <td className="text-xs">{d.match_strength_at_send || '—'}</td>
                      <td className="text-xs font-mono">{d.response_status || '—'}</td>
                      <td className="text-xs text-muted">{new Date(d.dispatched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        <details>
                          <summary className="text-xs" style={{ cursor: 'pointer', color: 'var(--accent)' }}>ver</summary>
                          <div className="payload-block mt-2">{JSON.stringify(d.payload_sent, null, 2)}</div>
                          {d.response_body && (
                            <>
                              <div className="text-xs text-muted mt-2">Resposta:</div>
                              <div className="payload-block mt-1">{JSON.stringify(d.response_body, null, 2)}</div>
                            </>
                          )}
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="mobile-card-list">
              {dispatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Nenhum envio</div>
              ) : dispatches.map(d => (
                <div key={d.id} className="mobile-card-item">
                  <div className="mobile-card-item-header">
                    <span className="mobile-card-item-title">{EVENT_LABELS[d.event_name] || d.event_name}</span>
                    <span className={`badge ${d.status === 'success' ? 'badge-success' : d.status === 'failed' ? 'badge-danger' : 'badge-neutral'}`}>
                      {d.status === 'success' ? 'Sucesso' : d.status === 'failed' ? 'Erro' : d.status}
                    </span>
                  </div>
                  <div className="mobile-card-item-body">
                    <div className="mobile-card-item-row">
                      <span className="mobile-card-item-label">Ambiente</span>
                      <span className="mobile-card-item-value">
                        <span className={`badge ${d.environment === 'test' ? 'badge-warning' : 'badge-success'}`}>
                          {d.environment === 'test' ? 'Teste' : 'Produção'}
                        </span>
                      </span>
                    </div>
                    <div className="mobile-card-item-row">
                      <span className="mobile-card-item-label">Correspondência</span>
                      <span className="mobile-card-item-value">{d.match_strength_at_send || '—'}</span>
                    </div>
                    <div className="mobile-card-item-row">
                      <span className="mobile-card-item-label">HTTP</span>
                      <span className="mobile-card-item-value font-mono">{d.response_status || '—'}</span>
                    </div>
                    <div className="mobile-card-item-row">
                      <span className="mobile-card-item-label">Data</span>
                      <span className="mobile-card-item-value">
                        {new Date(d.dispatched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                  <details style={{ marginTop: 'var(--space-2)' }}>
                    <summary className="text-xs" style={{ cursor: 'pointer', color: 'var(--accent)' }}>Ver payload</summary>
                    <div className="payload-block mt-2" style={{ fontSize: 11 }}>{JSON.stringify(d.payload_sent, null, 2)}</div>
                  </details>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'notes' && (
          <div className="card">
            <form onSubmit={handleAddNote} className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
              <input
                className="form-input"
                placeholder="Adicionar nota..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                style={{ flex: 1, minWidth: 180 }}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingNote || !noteContent.trim()}>Adicionar</button>
            </form>
            {notes.map(n => (
              <div key={n.id} style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 13 }}>{n.content}</div>
                <div className="text-xs text-muted mt-1">{new Date(n.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
              </div>
            ))}
            {notes.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>Nenhuma nota</div>}
          </div>
        )}
      </div>

      {/* Modal de Envio */}
      {showDispatch && (
        <div className="modal-overlay" onClick={() => setShowDispatch(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2 className="modal-title">Enviar {EVENT_LABELS[dispatchEvent] || dispatchEvent} (Teste)</h2>

            {dispatchResult ? (
              <div>
                <div className={`badge ${dispatchResult.success ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 14, padding: '6px 16px', marginBottom: 'var(--space-4)' }}>
                  {dispatchResult.success ? '✓ Enviado com sucesso' : `✕ Erro: ${String(dispatchResult.error)}`}
                </div>
                {Array.isArray(dispatchResult.warnings) && (dispatchResult.warnings as string[]).length > 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 'var(--space-3)' }}>
                    {(dispatchResult.warnings as string[]).map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </div>
                ) : null}
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowDispatch(false)}>Fechar</button>
                </div>
              </div>
            ) : dispatchStep === 1 ? (
              <div>
                {dispatchEvent === 'Purchase' && (
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                      <label className="form-label" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Valor da Venda</label>
                      <input
                        type="number"
                        className="form-input"
                        value={purchaseValue}
                        onChange={e => setPurchaseValue(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="form-group" style={{ width: 100 }}>
                      <label className="form-label" style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Moeda</label>
                      <input
                        type="text"
                        className="form-input"
                        value={currency}
                        onChange={e => setCurrency(e.target.value.toUpperCase())}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}
                {/* Resumo */}
                <div className="text-sm text-secondary mb-4">
                  Lead: <strong>{lead.name}</strong> | Match: <strong>{MATCH_STRENGTH_LABELS[matchAnalysis.strength]}</strong> | Score: <strong>{lead.score}</strong>
                </div>
                {previewPayload && (
                  <>
                    <div className="text-xs font-semibold text-muted mb-1">SINAIS UTILIZADOS</div>
                    <div className="signal-grid mb-4" style={{ flexWrap: 'wrap' }}>
                      {(previewPayload.signals_used as string[] || []).map(s => <span key={s} className="signal-tag present">✓ {s}</span>)}
                      {(previewPayload.signals_missing as string[] || []).map(s => <span key={s} className="signal-tag missing">✕ {s}</span>)}
                    </div>
                    {(previewPayload.warnings as string[] || []).length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 'var(--space-3)' }}>
                        {(previewPayload.warnings as string[]).map((w, i) => <div key={i}>⚠ {w}</div>)}
                      </div>
                    )}
                    <div className="text-xs font-semibold text-muted mb-1">PAYLOAD</div>
                    <div className="payload-block">{JSON.stringify(previewPayload.payload, null, 2)}</div>
                  </>
                )}
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowDispatch(false)}>Cancelar</button>
                  {requiresConfirm ? (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => setDispatchStep(2)}
                      disabled={dispatchEvent === 'Purchase' && (isNaN(purchaseValue) || purchaseValue <= 0)}
                    >
                      Continuar →
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary" 
                      onClick={handleDispatch} 
                      disabled={dispatching || (dispatchEvent === 'Purchase' && (isNaN(purchaseValue) || purchaseValue <= 0))}
                    >
                      {dispatching ? 'Enviando...' : 'Enviar Evento'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Step 2: Confirmação inteligente */}
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'var(--warning-subtle)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                  fontSize: 13,
                  color: 'var(--warning)',
                  lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Você está prestes a enviar um evento real</div>
                  <div style={{ opacity: 0.85 }}>
                    O evento <strong>{EVENT_LABELS[dispatchEvent] || dispatchEvent}</strong> será enviado para a API de Conversões da Meta para o lead <strong>{lead.name}</strong>. Essa ação não pode ser desfeita.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Para prosseguir, digite CONFIRMAR
                  </label>
                  <input
                    className="form-input"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="CONFIRMAR"
                    autoFocus
                  />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setDispatchStep(1)}>← Voltar</button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDispatch}
                    disabled={dispatching || confirmText !== 'CONFIRMAR'}
                  >
                    {dispatching ? 'Enviando...' : `Enviar ${EVENT_LABELS[dispatchEvent] || dispatchEvent}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
