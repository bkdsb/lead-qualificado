import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';

export default async function AuditPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <AppShell>
      <div className="app-header">
        <span className="app-header-title">Auditoria</span>
      </div>
      <div className="app-content">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Ação</th>
                <th>Ambiente</th>
                <th>Detalhes</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {(!logs || logs.length === 0) ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Nenhum registro</td></tr>
              ) : logs.map((log: Record<string, unknown>) => (
                <tr key={log.id as string}>
                  <td>
                    <span className="badge badge-neutral">{log.entity_type as string}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.action as string}</td>
                  <td className="text-xs">{(log.environment as string) || '—'}</td>
                  <td>
                    <details>
                      <summary className="text-xs" style={{ cursor: 'pointer', color: 'var(--accent)' }}>ver</summary>
                      <div className="payload-block mt-2" style={{ maxWidth: 500 }}>
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    </details>
                  </td>
                  <td className="text-xs text-muted">
                    {new Date(log.created_at as string).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
