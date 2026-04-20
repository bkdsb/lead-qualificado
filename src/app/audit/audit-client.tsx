'use client';

import { useState, useMemo } from 'react';

interface AuditLog {
  id: string;
  entity_type: string;
  action: string;
  environment?: string;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  dispatch_success: { icon: '✓', color: 'var(--success)', bg: 'var(--success-subtle)', label: 'Envio realizado' },
  dispatch_failed: { icon: '✕', color: 'var(--danger)', bg: 'var(--danger-subtle)', label: 'Envio falhou' },
  dispatch_attempt: { icon: '↗', color: 'var(--accent)', bg: 'var(--accent-subtle)', label: 'Tentativa de envio' },
  stage_change: { icon: '→', color: 'var(--accent)', bg: 'var(--accent-subtle)', label: 'Mudança de estágio' },
  score_change: { icon: '◆', color: 'var(--warning)', bg: 'var(--warning-subtle)', label: 'Alteração de score' },
  lead_created: { icon: '+', color: 'var(--success)', bg: 'var(--success-subtle)', label: 'Lead criado' },
  settings_change: { icon: '⚙', color: 'var(--text-secondary)', bg: 'rgba(113,113,122,0.12)', label: 'Configuração alterada' },
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'dispatch', label: 'Envios Meta' },
  { key: 'stage', label: 'Estágios' },
  { key: 'score', label: 'Score' },
  { key: 'error', label: 'Erros' },
];

function getActionConfig(action: string): { icon: string; color: string; bg: string; label: string } {
  if (ACTION_CONFIG[action]) return ACTION_CONFIG[action];
  if (action.includes('dispatch') && action.includes('fail')) return ACTION_CONFIG.dispatch_failed;
  if (action.includes('dispatch') || action.includes('send')) return ACTION_CONFIG.dispatch_success;
  if (action.includes('stage')) return ACTION_CONFIG.stage_change;
  if (action.includes('score')) return ACTION_CONFIG.score_change;
  if (action.includes('creat')) return ACTION_CONFIG.lead_created;
  if (action.includes('setting')) return ACTION_CONFIG.settings_change;
  return { icon: '•', color: 'var(--text-muted)', bg: 'rgba(113,113,122,0.12)', label: action };
}

function formatDetail(details: Record<string, unknown>, action: string): string | null {
  if (!details || Object.keys(details).length === 0) return null;

  // Render readable details instead of raw JSON
  if (action.includes('stage') && details.from_stage && details.to_stage) {
    return `${details.from_stage} → ${details.to_stage}${details.reason ? ` (${details.reason})` : ''}`;
  }
  if (action.includes('score') && details.event_type !== undefined) {
    const pts = details.points as number;
    return `${details.event_type}: ${pts > 0 ? '+' : ''}${pts} pts${details.note ? ` — ${details.note}` : ''}`;
  }
  if (action.includes('dispatch') && details.event_name) {
    const parts = [`Evento: ${details.event_name}`];
    if (details.environment) parts.push(`Amb: ${details.environment === 'test' ? 'Teste' : 'Produção'}`);
    if (details.match_strength) parts.push(`Match: ${details.match_strength}`);
    if (details.error_message) parts.push(`Erro: ${details.error_message}`);
    return parts.join(' · ');
  }

  // Fallback: key-value pairs
  const pairs = Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .slice(0, 5);
  return pairs.length > 0 ? pairs.join(' · ') : null;
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

  // Summary counters
  const now = Date.now();
  const last24h = logs.filter(l => now - new Date(l.created_at).getTime() < 86400000);
  const errorCount = logs.filter(l => l.action.includes('fail') || l.action.includes('error')).length;
  const dispatchCount = logs.filter(l => l.action.includes('dispatch') || l.action.includes('send') || l.entity_type === 'meta_event').length;

  return (
    <>
      {/* Cards de Resumo */}
      <div className="stats-grid">
        <div className="card">
          <div className="card-title">Total de Registros</div>
          <div className="card-value">{logs.length}</div>
          <div className="card-subtitle">Últimos 100 registros</div>
        </div>
        <div className="card">
          <div className="card-title">Últimas 24h</div>
          <div className="card-value">{last24h.length}</div>
          <div className="card-subtitle">Ações registradas hoje</div>
        </div>
        <div className="card">
          <div className="card-title">Envios Meta</div>
          <div className="card-value" style={{ color: 'var(--accent)' }}>{dispatchCount}</div>
          <div className="card-subtitle">Eventos CAPI</div>
        </div>
        <div className="card">
          <div className="card-title">Erros</div>
          <div className="card-value" style={{ color: errorCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {errorCount}
          </div>
          <div className="card-subtitle">Falhas registradas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filter-bar">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={`filter-chip ${filter === opt.key ? 'active' : ''}`}
            onClick={() => setFilter(opt.key)}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista de registros */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-text">Nenhum registro encontrado para este filtro</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtered.map(log => {
            const config = getActionConfig(log.action);
            const detail = formatDetail(log.details, log.action);
            const isExpanded = expandedId === log.id;

            return (
              <div
                key={log.id}
                className="audit-card"
                style={{ cursor: detail ? 'pointer' : 'default' }}
                onClick={() => detail && setExpandedId(isExpanded ? null : log.id)}
              >
                <div className="audit-icon" style={{ background: config.bg, color: config.color }}>
                  {config.icon}
                </div>
                <div className="audit-card-content">
                  <div className="audit-card-title">{config.label}</div>
                  <div className="audit-card-meta">
                    <span>
                      <span className="badge badge-neutral">{log.entity_type}</span>
                    </span>
                    {log.environment && (
                      <span>{log.environment === 'test' ? '🧪 Teste' : '🟢 Produção'}</span>
                    )}
                    <span>{new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  {detail && (
                    <div className="audit-card-detail" style={{
                      display: isExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: isExpanded ? undefined : 1,
                      WebkitBoxOrient: isExpanded ? undefined : 'vertical',
                      overflow: isExpanded ? 'visible' : 'hidden',
                    }}>
                      {detail}
                    </div>
                  )}
                  {isExpanded && log.details && Object.keys(log.details).length > 0 && (
                    <details style={{ marginTop: 'var(--space-2)' }}>
                      <summary className="text-xs" style={{ cursor: 'pointer', color: 'var(--accent)' }}>Ver JSON completo</summary>
                      <div className="payload-block mt-2" style={{ maxWidth: '100%' }}>
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
