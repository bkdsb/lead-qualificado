'use client';

interface DashboardStats {
  purchases7d: number;
  qualifieds7d: number;
  conversionRate: string;
  totalLeads: number;
  readyForQualified: number;
  readyForPurchase: number;
  errorDispatches: number;
  recentDispatches: Array<Record<string, unknown>>;
  lowPurchaseVolume: boolean;
}

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  return (
    <>
      {/* Alert: Low Purchase Volume */}
      {stats.lowPurchaseVolume && (
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--warning-subtle)',
          border: '1px solid rgba(234, 179, 8, 0.2)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--warning)',
          fontSize: 13,
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <strong>Volume de Purchase insuficiente para otimização</strong>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              Apenas {stats.purchases7d} purchases nos últimos 7 dias. Considere usar QualifiedLead como fallback para otimização de campanhas.
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card">
          <div className="card-title">Purchases 7d</div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{stats.purchases7d}</div>
          <div className="card-subtitle">Evento principal de otimização</div>
        </div>

        <div className="card">
          <div className="card-title">Qualifieds 7d</div>
          <div className="card-value">{stats.qualifieds7d}</div>
          <div className="card-subtitle">Leads qualificados no período</div>
        </div>

        <div className="card">
          <div className="card-title">Qual → Purchase</div>
          <div className="card-value">{stats.conversionRate}%</div>
          <div className="card-subtitle">Taxa de conversão do funil</div>
        </div>

        <div className="card">
          <div className="card-title">Total de Leads</div>
          <div className="card-value">{stats.totalLeads}</div>
          <div className="card-subtitle">Base completa</div>
        </div>
      </div>

      {/* Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <div className="card-title">Prontos p/ Qualified</div>
          <div className="card-value" style={{ color: 'var(--accent)' }}>{stats.readyForQualified}</div>
          <div className="card-subtitle">Score ≥ 50 em conversing/proposal</div>
        </div>

        <div className="card">
          <div className="card-title">Prontos p/ Purchase</div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{stats.readyForPurchase}</div>
          <div className="card-subtitle">Score ≥ 80 em qualified</div>
        </div>

        <div className="card">
          <div className="card-title">Dispatches com Erro</div>
          <div className="card-value" style={{ color: stats.errorDispatches > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {stats.errorDispatches}
          </div>
          <div className="card-subtitle">Eventos que falharam no envio</div>
        </div>
      </div>

      {/* Recent Dispatches */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Últimos Envios</span>
        </div>
        {stats.recentDispatches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">Nenhum evento enviado ainda</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Ambiente</th>
                  <th>Status</th>
                  <th>Match</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDispatches.map((d: Record<string, unknown>) => (
                  <tr key={d.id as string}>
                    <td style={{ fontWeight: 600 }}>{d.event_name as string}</td>
                    <td>
                      <span className={`badge ${d.environment === 'test' ? 'badge-warning' : 'badge-success'}`}>
                        {d.environment as string}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        d.status === 'success' ? 'badge-success' :
                        d.status === 'failed' ? 'badge-danger' : 'badge-neutral'
                      }`}>
                        {d.status as string}
                      </span>
                    </td>
                    <td className="text-xs">{d.match_strength_at_send as string || '—'}</td>
                    <td className="text-xs text-muted">
                      {new Date(d.dispatched_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
