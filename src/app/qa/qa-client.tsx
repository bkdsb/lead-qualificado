'use client';

import { useState } from 'react';
import type { DbMetaEventDispatch, DbDatasetQualitySnapshot } from '@/types/database';

function Tooltip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="tooltip-wrapper">
      {label}
      <span className="tooltip-icon">?</span>
      <span className="tooltip-text">{tip}</span>
    </span>
  );
}

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
    <>
      {/* Cards de Resumo */}
      <div className="stats-grid">
        <div className="card">
          <div className="card-title">Últimos Envios</div>
          <div className="card-value">{dispatches.length}</div>
          <div className="card-subtitle">Teste: {testDispatches.length} | Produção: {prodDispatches.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Erros de Envio</div>
          <div className="card-value" style={{ color: failedDispatches.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {failedDispatches.length}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <Tooltip label="Qualidade do Dataset" tip="Indicador da Meta que mede a qualidade dos dados enviados via API de Conversões (CAPI). Impacta diretamente a atribuição e otimização das campanhas." />
          </div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchDatasetQuality} disabled={fetchingDQ}>
              {fetchingDQ ? 'Buscando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Resultado da Qualidade do Dataset */}
      {dqResult && (
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Qualidade do Dataset — Última Consulta</span>
          </div>
          {dqResult.error ? (
            <div style={{ color: 'var(--danger)', fontSize: 13 }}>Erro: {dqResult.error as string}</div>
          ) : (
            <div className="payload-block">{JSON.stringify(dqResult.data, null, 2)}</div>
          )}
        </div>
      )}

      {/* Snapshots Salvos */}
      {dqSnapshots.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Histórico de Qualidade</span>
          </div>

          {/* Desktop */}
          <div className="table-container desktop-table" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>
                    <Tooltip label="Score EMQ" tip="Event Match Quality — nota de 0 a 10 que a Meta atribui à qualidade dos dados de correspondência enviados. Acima de 6 é bom, acima de 8 é excelente." />
                  </th>
                  <th>
                    <Tooltip label="Cobertura" tip="Porcentagem de eventos que contêm os dados necessários para correspondência (email, telefone, etc)." />
                  </th>
                  <th>
                    <Tooltip label="Atualidade" tip="Quão recentes são os dados enviados. Dados mais frescos melhoram a atribuição." />
                  </th>
                  <th>
                    <Tooltip label="Taxa Corresp." tip="Attributed Conversions Rate (ACR) — porcentagem de conversões que a Meta conseguiu atribuir a um anúncio graças aos dados CAPI." />
                  </th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {dqSnapshots.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.event_name}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: (s.composite_score || 0) >= 7 ? 'var(--success)' :
                               (s.composite_score || 0) >= 4 ? 'var(--warning)' : 'var(--danger)',
                      }}>
                        {s.composite_score?.toFixed(1) || '—'}
                      </span>
                      <span className="text-muted"> / 10</span>
                    </td>
                    <td>{s.event_coverage_pct ? `${s.event_coverage_pct}%` : '—'}</td>
                    <td className="text-xs">{s.data_freshness || '—'}</td>
                    <td>{s.acr_percentage ? `${s.acr_percentage}%` : '—'}</td>
                    <td className="text-xs text-muted">
                      {new Date(s.fetched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="mobile-card-list">
            {dqSnapshots.map(s => (
              <div key={s.id} className="mobile-card-item">
                <div className="mobile-card-item-header">
                  <span className="mobile-card-item-title">{s.event_name}</span>
                  <span style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: (s.composite_score || 0) >= 7 ? 'var(--success)' :
                           (s.composite_score || 0) >= 4 ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {s.composite_score?.toFixed(1) || '—'}/10
                  </span>
                </div>
                <div className="mobile-card-item-body">
                  <div className="mobile-card-item-row">
                    <span className="mobile-card-item-label">Cobertura</span>
                    <span className="mobile-card-item-value">{s.event_coverage_pct ? `${s.event_coverage_pct}%` : '—'}</span>
                  </div>
                  <div className="mobile-card-item-row">
                    <span className="mobile-card-item-label">Taxa Corresp.</span>
                    <span className="mobile-card-item-value">{s.acr_percentage ? `${s.acr_percentage}%` : '—'}</span>
                  </div>
                  <div className="mobile-card-item-row">
                    <span className="mobile-card-item-label">Atualidade</span>
                    <span className="mobile-card-item-value">{s.data_freshness || '—'}</span>
                  </div>
                  <div className="mobile-card-item-row">
                    <span className="mobile-card-item-label">Data</span>
                    <span className="mobile-card-item-value">
                      {new Date(s.fetched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimos Eventos */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Últimos Eventos Enviados</span>
        </div>

        {/* Desktop */}
        <div className="table-container desktop-table" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Ambiente</th>
                <th>Status</th>
                <th>
                  <Tooltip label="Correspondência" tip="Força de correspondência dos dados do lead com perfis da Meta." />
                </th>
                <th>Sinais Usados</th>
                <th>Sinais Ausentes</th>
                <th>Alertas</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map(d => {
                const rawSignals = d.payload_raw_signals as Record<string, unknown> || {};
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.event_name}</td>
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
                    <td>
                      <div className="signal-grid">
                        {(rawSignals.signals_used as string[] || []).map(s => <span key={s} className="signal-tag present">{s}</span>)}
                      </div>
                    </td>
                    <td>
                      <div className="signal-grid">
                        {(rawSignals.signals_missing as string[] || []).map(s => <span key={s} className="signal-tag missing">{s}</span>)}
                      </div>
                    </td>
                    <td>
                      {(rawSignals.warnings as string[] || []).map((w, i) => (
                        <div key={i} className="text-xs" style={{ color: 'var(--warning)' }}>⚠ {w}</div>
                      ))}
                    </td>
                    <td className="text-xs text-muted">
                      {new Date(d.dispatched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="mobile-card-list">
          {dispatches.map(d => {
            const rawSignals = d.payload_raw_signals as Record<string, unknown> || {};
            const signalsUsed = rawSignals.signals_used as string[] || [];
            const signalsMissing = rawSignals.signals_missing as string[] || [];
            const warnings = rawSignals.warnings as string[] || [];
            return (
              <div key={d.id} className="mobile-card-item">
                <div className="mobile-card-item-header">
                  <span className="mobile-card-item-title">{d.event_name}</span>
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
                    <span className="mobile-card-item-label">Data</span>
                    <span className="mobile-card-item-value">
                      {new Date(d.dispatched_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
                {signalsUsed.length > 0 && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <div className="mobile-card-item-label" style={{ marginBottom: 4 }}>Sinais Usados</div>
                    <div className="signal-grid">
                      {signalsUsed.map(s => <span key={s} className="signal-tag present">{s}</span>)}
                    </div>
                  </div>
                )}
                {signalsMissing.length > 0 && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <div className="mobile-card-item-label" style={{ marginBottom: 4 }}>Sinais Ausentes</div>
                    <div className="signal-grid">
                      {signalsMissing.map(s => <span key={s} className="signal-tag missing">{s}</span>)}
                    </div>
                  </div>
                )}
                {warnings.length > 0 && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    {warnings.map((w, i) => (
                      <div key={i} className="text-xs" style={{ color: 'var(--warning)' }}>⚠ {w}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
