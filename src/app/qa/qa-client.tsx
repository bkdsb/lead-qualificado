'use client';

import { useState } from 'react';
import type { DbMetaEventDispatch, DbDatasetQualitySnapshot } from '@/types/database';

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
      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="card">
          <div className="card-title">Últimos Envios</div>
          <div className="card-value">{dispatches.length}</div>
          <div className="card-subtitle">Teste: {testDispatches.length} | Prod: {prodDispatches.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Com Erro</div>
          <div className="card-value" style={{ color: failedDispatches.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {failedDispatches.length}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Dataset Quality</div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchDatasetQuality} disabled={fetchingDQ}>
              {fetchingDQ ? 'Buscando...' : 'Atualizar DQ'}
            </button>
          </div>
        </div>
      </div>

      {/* DQ Results */}
      {dqResult && (
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Dataset Quality — Última Consulta</span>
          </div>
          {dqResult.error ? (
            <div style={{ color: 'var(--danger)', fontSize: 13 }}>Erro: {dqResult.error as string}</div>
          ) : (
            <div className="payload-block">{JSON.stringify(dqResult.data, null, 2)}</div>
          )}
        </div>
      )}

      {/* Stored Snapshots */}
      {dqSnapshots.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <span className="card-title">Snapshots Salvos</span>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>EMQ Score</th>
                  <th>Cobertura</th>
                  <th>Freshness</th>
                  <th>ACR %</th>
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
        </div>
      )}

      {/* Recent Events with Details */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Últimos Eventos</span>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Amb</th>
                <th>Status</th>
                <th>Match</th>
                <th>Sinais Usados</th>
                <th>Sinais Faltando</th>
                <th>Warnings</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map(d => {
                const rawSignals = d.payload_raw_signals as Record<string, unknown> || {};
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.event_name}</td>
                    <td><span className={`badge ${d.environment === 'test' ? 'badge-warning' : 'badge-success'}`}>{d.environment}</span></td>
                    <td><span className={`badge ${d.status === 'success' ? 'badge-success' : d.status === 'failed' ? 'badge-danger' : 'badge-neutral'}`}>{d.status}</span></td>
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
      </div>
    </>
  );
}
