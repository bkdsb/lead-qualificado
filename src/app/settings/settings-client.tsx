'use client';

import { useState } from 'react';

interface Setting {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

interface CredentialRef {
  id: string;
  provider: string;
  credential_type: string;
  env_var_name: string;
  status: string;
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

export default function SettingsClient({
  settings,
  credentialRefs,
}: {
  settings: Setting[];
  credentialRefs: CredentialRef[];
}) {
  const [verifying, setVerifying] = useState(false);
  const [capiStatus, setCapiStatus] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function verifyCapiConnection() {
    setVerifying(true);
    try {
      const res = await fetch('/api/meta/dataset-quality');
      const data = await res.json();
      setCapiStatus(data);
    } catch {
      setCapiStatus({ error: 'Falha na verificação' });
    }
    setVerifying(false);
  }

  async function toggleTestMode() {
    const current = settings.find(s => s.key === 'test_mode_enabled');
    const newValue = current?.value === true || current?.value === 'true' ? false : true;
    setSaving('test_mode_enabled');
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test_mode_enabled', value: newValue }),
    });
    setSaving(null);
    window.location.reload();
  }

  const testModeEnabled = settings.find(s => s.key === 'test_mode_enabled');
  const isTestMode = testModeEnabled?.value === true || testModeEnabled?.value === 'true';

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Configuração CAPI */}
      <div className="card mb-6">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <span className="card-title">
            <Tooltip label="API de Conversões Meta" tip="A API de Conversões (CAPI) permite enviar eventos do servidor diretamente para a Meta, melhorando a atribuição e otimização das suas campanhas." />
          </span>
          <button className="btn btn-secondary btn-sm" onClick={verifyCapiConnection} disabled={verifying}>
            {verifying ? 'Verificando...' : 'Verificar Conexão'}
          </button>
        </div>

        {capiStatus && (
          <div style={{
            padding: 'var(--space-3)',
            background: capiStatus.success ? 'var(--success-subtle)' : 'var(--danger-subtle)',
            color: capiStatus.success ? 'var(--success)' : 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            marginBottom: 'var(--space-4)',
          }}>
            {capiStatus.success ? '✓ Conexão OK' : `✕ ${capiStatus.error}`}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            <Tooltip label="Modo Teste" tip="Quando ativo, todos os eventos enviados incluem o código de teste da Meta. Eventos de teste não afetam suas campanhas reais." />
          </label>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${isTestMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleTestMode}
              disabled={saving === 'test_mode_enabled'}
            >
              {isTestMode ? '● Ativo' : '○ Inativo'}
            </button>
            <span className="text-xs text-muted">
              {isTestMode ? 'Eventos usarão código de teste' : 'Modo produção — eventos reais'}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-muted mb-2" style={{ textTransform: 'uppercase' }}>Variáveis de Ambiente Configuradas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-2)' }}>
            {credentialRefs.map(ref => (
              <div key={ref.id} className="flex items-center gap-2" style={{ padding: 'var(--space-2)', background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)' }}>
                <span className={`badge ${ref.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 9 }}>
                  {ref.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
                <span className="text-xs font-mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ref.env_var_name}</span>
                <span className="text-xs text-muted">{ref.provider}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regras de Pontuação */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">
            <Tooltip label="Regras de Pontuação" tip="Define quantos pontos cada ação do lead vale. O score determina quando o lead está pronto para avançar de estágio." />
          </span>
        </div>
        {settings.filter(s => s.key === 'score_rules').map(s => (
          <div key={s.id} className="payload-block">
            {JSON.stringify(s.value, null, 2)}
          </div>
        ))}
        <div className="text-xs text-muted mt-2">
          Pontuação por tipo de evento. Editável via API (/api/settings).
        </div>
      </div>

      {/* Todas as Configurações */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Todas as Configurações</span>
        </div>

        {/* Desktop */}
        <div className="table-container desktop-table" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Chave</th>
                <th>Valor</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {settings.map(s => (
                <tr key={s.id}>
                  <td className="font-mono text-xs" style={{ fontWeight: 600 }}>{s.key}</td>
                  <td className="text-xs" style={{ maxWidth: 300 }}>
                    <div className="truncate">{typeof s.value === 'string' ? s.value : JSON.stringify(s.value)}</div>
                  </td>
                  <td className="text-xs text-muted">
                    {new Date(s.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="mobile-card-list">
          {settings.map(s => (
            <div key={s.id} className="mobile-card-item">
              <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 4 }}>{s.key}</div>
              <div className="text-xs" style={{ wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                {typeof s.value === 'string' ? s.value : JSON.stringify(s.value)}
              </div>
              <div className="text-xs text-muted mt-2">
                {new Date(s.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
