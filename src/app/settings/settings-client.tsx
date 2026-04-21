'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings2, Activity, Play, CheckCircle2, ShieldCheck, Database, SlidersHorizontal, Terminal, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Configurações Base</h1>
        <p className="text-sm text-slate-7">Gerencie variáveis de ambiente, estados globais e regras de negócio do motor.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* API CAPI Connection */}
        <Card>
          <CardHeader className="p-5 pb-4 border-b border-white/[0.04] flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-6" /> Meta Conversions API
            </CardTitle>
            <Button size="sm" variant="secondary" onClick={verifyCapiConnection} disabled={verifying} className="h-8">
              {verifying ? 'Diagnosticando...' : 'Testar Conexão Graph'}
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            {capiStatus && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <div className={cn(
                  "p-4 rounded-md border text-sm font-medium",
                  capiStatus.success ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                  {capiStatus.success ? '✓ Graph API Conexão Integrada c/ Sucesso' : `✕ Falha Crítica: ${capiStatus.error}`}
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-9 mb-1">CAPI Test Mode</div>
                  <div className="text-xs text-slate-6 max-w-xs">Sobrescreve eventos para usar test_event_code preservando infraestrutura de ML.</div>
                </div>
                <Button 
                  onClick={toggleTestMode} 
                  disabled={saving === 'test_mode_enabled'}
                  className={cn("w-32", isTestMode ? "bg-yellow-500 text-yellow-950 hover:bg-yellow-400 border-none" : "")}
                >
                  {isTestMode ? (
                    <><Play className="w-3.5 h-3.5 mr-2" /> Ativado</>
                  ) : (
                    <><ShieldCheck className="w-3.5 h-3.5 mr-2" /> Produção</>
                  )}
                </Button>
              </div>
            </div>

            <div className="pt-6 border-t border-white/[0.04]">
              <div className="text-xs font-semibold text-slate-7 uppercase tracking-widest mb-4">Credentials Ledger</div>
              <div className="space-y-2">
                {credentialRefs.map(ref => (
                  <div key={ref.id} className="flex items-center justify-between p-2.5 rounded bg-slate-2 border border-white/[0.02]">
                    <div className="flex items-center gap-3 w-full">
                      <Badge variant={ref.status === 'active' ? 'success' : 'danger'} className="scale-90 origin-left">
                        {ref.status === 'active' ? 'ACTIVE' : 'VOID'}
                      </Badge>
                      <span className="text-xs font-mono text-slate-9 truncate max-w-[200px]">{ref.env_var_name}</span>
                      <span className="text-[10px] text-slate-6 ml-auto">{ref.provider}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scoring System */}
        <Card>
          <CardHeader className="p-5 pb-4 border-b border-white/[0.04]">
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-6" /> Algoritmo de Scoring
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 bg-slate-1">
            {settings.filter(s => s.key === 'score_rules').map(s => (
              <pre key={s.id} className="p-5 text-xs text-blue-300 font-mono overflow-auto h-[350px]">
                {JSON.stringify(s.value, null, 2)}
              </pre>
            ))}
            <div className="p-4 border-t border-white/[0.04] bg-slate-2 flex items-center gap-2 text-xs text-slate-7">
              <Info className="w-3.5 h-3.5" /> Edição deste objeto restrita ao backend (/api/settings)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raw Setup Values Table */}
      <Card>
        <CardHeader className="p-5 pb-4 border-b border-white/[0.04]">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-6" /> Raw Database Settings
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-2/50 text-[11px] uppercase tracking-widest text-slate-7 font-semibold">
              <tr>
                <th className="px-5 py-3 border-b border-white/[0.04]">Config Key</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Valor Mutável</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Last Write</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {settings.map(s => (
                <tr key={s.id} className="hover:bg-slate-2/50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-9 font-medium">{s.key}</td>
                  <td className="px-5 py-4">
                    <pre className="text-xs text-slate-7 font-mono truncate max-w-sm whitespace-pre-wrap">
                      {typeof s.value === 'string' ? s.value : JSON.stringify(s.value, null, 2)}
                    </pre>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-6 font-mono">
                    {new Date(s.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
