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
      {/* CAPI Config */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">Meta CAPI</span>
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
          <label className="form-label">Modo Teste</label>
          <div className="flex items-center gap-3">
            <button
              className={`btn btn-sm ${isTestMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleTestMode}
              disabled={saving === 'test_mode_enabled'}
            >
              {isTestMode ? '● Ativo' : '○ Inativo'}
            </button>
            <span className="text-xs text-muted">
              {isTestMode ? 'Eventos usarão test_event_code' : 'Modo produção — eventos reais'}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold text-muted mb-2" style={{ textTransform: 'uppercase' }}>Variáveis de Ambiente Configuradas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            {credentialRefs.map(ref => (
              <div key={ref.id} className="flex items-center gap-2" style={{ padding: 'var(--space-2)', background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)' }}>
                <span className={`badge ${ref.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 9 }}>
                  {ref.status}
                </span>
                <span className="text-xs font-mono">{ref.env_var_name}</span>
                <span className="text-xs text-muted">{ref.provider}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score Rules */}
      <div className="card mb-6">
        <div className="card-header">
          <span className="card-title">Regras de Score</span>
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

      {/* All Settings Raw */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Todas as Configurações</span>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
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
      </div>
    </div>
  );
}
