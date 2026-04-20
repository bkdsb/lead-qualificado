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

function Tooltip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="tooltip-wrapper">
      {label}
      <span className="tooltip-icon">?</span>
      <span className="tooltip-text">{tip}</span>
    </span>
  );
}

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  return (
    <>
      {/* Alerta: Volume baixo de vendas */}
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
          alignItems: 'flex-start',
          gap: 'var(--space-3)',
        }}>
          <span style={{ fontSize: 18, marginTop: 2 }}>⚠</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>Volume de Vendas insuficiente para otimização</strong>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              Apenas {stats.purchases7d} vendas nos últimos 7 dias. A Meta precisa de no mínimo 50 eventos/semana para otimizar campanhas. Considere usar Qualificado como evento de fallback.
            </div>
          </div>
        </div>
      )}

      {/* KPIs Principais — ordenados por importância para gestor de tráfego */}
      <div className="stats-grid">
        <div className="card">
          <div className="card-title">
            <Tooltip label="Vendas 7d" tip="Total de vendas confirmadas nos últimos 7 dias. É o evento principal que otimiza suas campanhas na Meta." />
          </div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{stats.purchases7d}</div>
          <div className="card-subtitle">Evento principal de otimização</div>
        </div>

        <div className="card">
          <div className="card-title">
            <Tooltip label="Conversão" tip="Taxa de conversão do funil: de quantos leads qualificados, quantos viraram venda. Meta saudável: acima de 20%." />
          </div>
          <div className="card-value">{stats.conversionRate}%</div>
          <div className="card-subtitle">Qualificado → Venda</div>
        </div>

        <div className="card">
          <div className="card-title">
            <Tooltip label="Qualificados 7d" tip="Leads que atingiram o estágio Qualificado nos últimos 7 dias. Evento secundário de otimização na Meta." />
          </div>
          <div className="card-value">{stats.qualifieds7d}</div>
          <div className="card-subtitle">Leads qualificados no período</div>
        </div>

        <div className="card">
          <div className="card-title">Total de Leads</div>
          <div className="card-value">{stats.totalLeads}</div>
          <div className="card-subtitle">Base completa</div>
        </div>
      </div>

      {/* Cards de Ação */}
      <div className="action-grid">
        <div className="card">
          <div className="card-title">
            <Tooltip label="Prontos p/ Qualificar" tip="Leads com score ≥ 50 nos estágios Conversando ou Proposta. Prováveis candidatos a avançar para Qualificado." />
          </div>
          <div className="card-value" style={{ color: 'var(--accent)' }}>{stats.readyForQualified}</div>
          <div className="card-subtitle">Score ≥ 50 em conversando/proposta</div>
        </div>

        <div className="card">
          <div className="card-title">
            <Tooltip label="Prontos p/ Venda" tip="Leads qualificados com score ≥ 80. Alta probabilidade de conversão — priorize o contato." />
          </div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{stats.readyForPurchase}</div>
          <div className="card-subtitle">Score ≥ 80 em qualificado</div>
        </div>

        <div className="card">
          <div className="card-title">
            <Tooltip label="Envios com Erro" tip="Eventos que falharam ao enviar para a API de Conversões da Meta. Erros impactam a otimização das campanhas." />
          </div>
          <div className="card-value" style={{ color: stats.errorDispatches > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {stats.errorDispatches}
          </div>
          <div className="card-subtitle">Eventos que falharam no envio</div>
        </div>
      </div>

      {/* Últimos Envios */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Últimos Envios</span>
        </div>
        {stats.recentDispatches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">Nenhum evento enviado ainda</div>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="table-container desktop-table" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Ambiente</th>
                    <th>Status</th>
                    <th>
                      <Tooltip label="Correspondência" tip="Força de correspondência dos dados do lead com a Meta. Quanto maior, melhor a atribuição da conversão." />
                    </th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentDispatches.map((d: Record<string, unknown>) => (
                    <tr key={d.id as string}>
                      <td style={{ fontWeight: 600 }}>{d.event_name as string}</td>
                      <td>
                        <span className={`badge ${d.environment === 'test' ? 'badge-warning' : 'badge-success'}`}>
                          {d.environment === 'test' ? 'Teste' : 'Produção'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          d.status === 'success' ? 'badge-success' :
                          d.status === 'failed' ? 'badge-danger' : 'badge-neutral'
                        }`}>
                          {d.status === 'success' ? 'Sucesso' : d.status === 'failed' ? 'Erro' : d.status as string}
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

            {/* Mobile */}
            <div className="mobile-card-list">
              {stats.recentDispatches.map((d: Record<string, unknown>) => (
                <div key={d.id as string} className="mobile-card-item">
                  <div className="mobile-card-item-header">
                    <span className="mobile-card-item-title">{d.event_name as string}</span>
                    <span className={`badge ${
                      d.status === 'success' ? 'badge-success' :
                      d.status === 'failed' ? 'badge-danger' : 'badge-neutral'
                    }`}>
                      {d.status === 'success' ? 'Sucesso' : d.status === 'failed' ? 'Erro' : d.status as string}
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
                      <span className="mobile-card-item-label">Data</span>
                      <span className="mobile-card-item-value">
                        {new Date(d.dispatched_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
