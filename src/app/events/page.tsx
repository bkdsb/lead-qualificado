import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';

const EVENT_LABELS: Record<string, string> = {
  Lead: 'Lead',
  QualifiedLead: 'Lead Qualificado',
  Purchase: 'Venda',
  Schedule: 'Agendamento',
};

export default async function EventsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: dispatches } = await supabase
    .from('meta_event_dispatches')
    .select('*, leads(name)')
    .order('dispatched_at', { ascending: false })
    .limit(100);

  return (
    <AppShell>
      <div className="app-header">
        <span className="app-header-title">Histórico de Envios Meta</span>
      </div>
      <div className="app-content">
        {/* Desktop */}
        <div className="table-container desktop-table">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Evento</th>
                <th>Ambiente</th>
                <th>Status</th>
                <th>Correspondência</th>
                <th>HTTP</th>
                <th>ID do Evento</th>
                <th>Data</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {(!dispatches || dispatches.length === 0) ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Nenhum evento enviado</td></tr>
              ) : dispatches.map((d: Record<string, unknown>) => (
                <tr key={d.id as string}>
                  <td style={{ fontWeight: 500 }}>
                    {(d.leads as Record<string, unknown>)?.name as string || '—'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{EVENT_LABELS[d.event_name as string] || d.event_name as string}</td>
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
                  <td className="text-xs font-mono">{d.response_status as number || '—'}</td>
                  <td className="text-xs font-mono truncate" style={{ maxWidth: 120 }}>{d.event_id as string}</td>
                  <td className="text-xs text-muted">
                    {new Date(d.dispatched_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td>
                    <details>
                      <summary className="text-xs" style={{ cursor: 'pointer', color: 'var(--accent)' }}>ver</summary>
                      <div className="payload-block mt-2" style={{ maxWidth: 400 }}>
                        {JSON.stringify(d.payload_sent, null, 2)}
                      </div>
                      {d.error_message ? (
                        <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
                          Erro: {String(d.error_message)}
                        </div>
                      ) : null}
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="mobile-card-list">
          {(!dispatches || dispatches.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Nenhum evento enviado</div>
          ) : dispatches.map((d: Record<string, unknown>) => (
            <div key={d.id as string} className="mobile-card-item">
              <div className="mobile-card-item-header">
                <div>
                  <span className="mobile-card-item-title">{EVENT_LABELS[d.event_name as string] || d.event_name as string}</span>
                  <div className="text-xs text-muted" style={{ marginTop: 1 }}>
                    {(d.leads as Record<string, unknown>)?.name as string || '—'}
                  </div>
                </div>
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
                  <span className="mobile-card-item-label">Correspondência</span>
                  <span className="mobile-card-item-value">{d.match_strength_at_send as string || '—'}</span>
                </div>
                <div className="mobile-card-item-row">
                  <span className="mobile-card-item-label">HTTP</span>
                  <span className="mobile-card-item-value font-mono">{d.response_status as number || '—'}</span>
                </div>
                <div className="mobile-card-item-row">
                  <span className="mobile-card-item-label">Data</span>
                  <span className="mobile-card-item-value">
                    {new Date(d.dispatched_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
              {Boolean(d.error_message) && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 'var(--space-2)' }}>
                  Erro: {String(d.error_message)}
                </div>
              )}
              <details style={{ marginTop: 'var(--space-2)' }}>
                <summary className="text-xs" style={{ cursor: 'pointer', color: 'var(--accent)' }}>Ver payload</summary>
                <div className="payload-block mt-2" style={{ fontSize: 11 }}>
                  {JSON.stringify(d.payload_sent, null, 2)}
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
