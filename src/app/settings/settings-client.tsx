'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, Play, ShieldCheck, ChevronDown, Mail, KeyRound, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getClientEnv } from '@/lib/config/env';
import { DEFAULT_SCORE_POINTS } from '@/lib/utils/constants';
import { toast } from 'sonner';

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

function normalizeAuthError(message: string): string {
  if (message === 'Invalid login credentials') return 'Senha atual inválida.';
  if (message.toLowerCase().includes('email')) return 'Confira o email informado.';
  if (message.toLowerCase().includes('password')) return 'Confira os dados de senha.';
  return message;
}

function getResetRedirectUrl(): string {
  const appUrl = getClientEnv().NEXT_PUBLIC_APP_URL;
  if (appUrl && appUrl.trim().length > 0) {
    return `${appUrl.replace(/\/$/, '')}/login`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login`;
  }
  return 'http://localhost:3000/login';
}

const SCORE_EVENT_LABELS: Record<string, string> = {
  lp_visit: 'Visita na LP',
  cta_click: 'Clique no CTA',
  conversation_started: 'Conversa iniciada',
  qualification_answered: 'Qualificação respondida',
  proposal_sent: 'Proposta enviada',
  qualified: 'Lead qualificado',
  purchase: 'Venda fechada',
  no_response: 'Sem resposta',
  curious_no_fit: 'Curioso sem fit',
  no_budget: 'Sem orçamento',
  manual_adjust: 'Ajuste manual',
};

export default function SettingsClient({
  settings,
  credentialRefs,
  currentUserEmail,
}: {
  settings: Setting[];
  credentialRefs: CredentialRef[];
  currentUserEmail: string;
}) {
  const [verifying, setVerifying] = useState(false);
  const [capiStatus, setCapiStatus] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [newEmail, setNewEmail] = useState(currentUserEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountSaving, setAccountSaving] = useState<'email' | 'password' | 'recovery' | null>(null);

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
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test_mode_enabled', value: newValue }),
    });
    setSaving(null);
    if (!res.ok) {
      toast.error('Falha ao alterar modo de teste');
      return;
    }
    window.location.reload();
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newEmail.trim();

    if (!trimmed) {
      toast.error('Informe um email válido.');
      return;
    }

    setAccountSaving('email');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) {
        toast.error(normalizeAuthError(error.message));
        return;
      }

      toast.success('Solicitação enviada. Confirme o novo email na sua caixa de entrada.');
    } finally {
      setAccountSaving(null);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error('Informe sua senha atual para confirmar a alteração.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    setAccountSaving('password');
    try {
      const supabase = createClient();

      if (currentUserEmail) {
        const { error: checkError } = await supabase.auth.signInWithPassword({
          email: currentUserEmail,
          password: currentPassword,
        });
        if (checkError) {
          toast.error(normalizeAuthError(checkError.message));
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(normalizeAuthError(error.message));
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha atualizada com sucesso.');
    } finally {
      setAccountSaving(null);
    }
  }

  async function handleSendRecovery() {
    if (!currentUserEmail) {
      toast.error('Não foi possível identificar o email da conta atual.');
      return;
    }

    setAccountSaving('recovery');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(currentUserEmail, {
        redirectTo: getResetRedirectUrl(),
      });

      if (error) {
        toast.error(normalizeAuthError(error.message));
        return;
      }

      toast.success('Link de recuperação enviado para seu email.');
    } finally {
      setAccountSaving(null);
    }
  }

  const testModeEnabled = settings.find(s => s.key === 'test_mode_enabled');
  const isTestMode = testModeEnabled?.value === true || testModeEnabled?.value === 'true';

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Configurações</h1>
        <p className="text-[13px] text-slate-7 mt-0.5">Controles globais do sistema e conexão Meta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CAPI Connection */}
        <Card className="h-fit">
        <CardHeader className="p-4 pb-3 border-b border-white/[0.04] flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-6" />
            <CardTitle>Conversions API</CardTitle>
          </div>
          <Button size="sm" variant="secondary" onClick={verifyCapiConnection} disabled={verifying} className="h-7 text-[12px]">
            {verifying ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {capiStatus && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div className={cn(
                "p-3 rounded-md border text-[13px] font-medium",
                capiStatus.success ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
              )}>
                {capiStatus.success ? '✓ Conexão com o Facebook Ativa' : `✕ Erro: ${capiStatus.error}`}
              </div>
            </motion.div>
          )}

          {/* Test Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-9">Modo de Teste</div>
              <div className="text-[12px] text-slate-6 mt-0.5">Eventos vão para o canal de teste da Meta.</div>
            </div>
            <Button
              onClick={toggleTestMode}
              disabled={saving === 'test_mode_enabled'}
              className={cn("w-28 h-8", isTestMode ? "bg-yellow-500 text-yellow-950 hover:bg-yellow-400 border-none" : "")}
            >
              {isTestMode ? (
                <><Play className="w-3.5 h-3.5 mr-1.5" /> Teste</>
              ) : (
                <><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Produção</>
              )}
            </Button>
          </div>

          {/* Credentials — Collapsible */}
          <div className="pt-3 border-t border-white/[0.04]">
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="flex items-center gap-2 text-[12px] font-medium text-slate-7 hover:text-slate-9 transition-colors cursor-pointer w-full"
            >
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCredentials && "rotate-180")} />
              Credenciais ({credentialRefs.length})
            </button>
            {showCredentials && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-1.5">
                {credentialRefs.map(ref => (
                  <div key={ref.id} className="flex items-center justify-between p-2 rounded bg-slate-2 border border-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Badge variant={ref.status === 'active' ? 'success' : 'danger'} className="text-[10px]">
                        {ref.status === 'active' ? 'OK' : '—'}
                      </Badge>
                      <span className="text-[11px] font-mono text-slate-8 truncate max-w-[180px]">{ref.env_var_name}</span>
                    </div>
                    <span className="text-[10px] text-slate-6">{ref.provider}</span>
                  </div>
                ))}
              </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card className="h-fit">
          <CardHeader className="p-4 pb-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-6" />
              <CardTitle>Conta & Segurança</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="p-3 rounded-md border border-white/[0.08] bg-slate-2/40">
              <div className="text-[11px] uppercase tracking-widest text-slate-7 mb-1">Email atual</div>
              <div className="text-sm text-slate-9 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-6" />
                {currentUserEmail || '—'}
              </div>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-2.5">
              <label className="text-[11px] uppercase tracking-widest font-medium text-slate-7">Alterar email</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novo@email.com"
                  required
                />
                <Button type="submit" disabled={accountSaving !== null} className="shrink-0">
                  {accountSaving === 'email' ? 'Salvando...' : 'Atualizar'}
                </Button>
              </div>
            </form>

            <form onSubmit={handleUpdatePassword} className="space-y-2.5 pt-2 border-t border-white/[0.04]">
              <label className="text-[11px] uppercase tracking-widest font-medium text-slate-7">Alterar senha</label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Senha atual"
                  autoComplete="current-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(v => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-slate-6 hover:text-slate-9 transition-colors"
                  aria-label={showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mín. 8 caracteres)"
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-slate-6 hover:text-slate-9 transition-colors"
                  aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar nova senha"
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-slate-6 hover:text-slate-9 transition-colors"
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button type="submit" disabled={accountSaving !== null} className="w-full">
                {accountSaving === 'password' ? 'Atualizando senha...' : 'Salvar nova senha'}
              </Button>
            </form>

            <div className="pt-2 border-t border-white/[0.04]">
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={handleSendRecovery}
                disabled={accountSaving !== null}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {accountSaving === 'recovery' ? 'Enviando recuperação...' : 'Enviar link de recuperação de senha'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scoring — Readable */}
      <Card>
        <CardHeader className="p-4 pb-3 border-b border-white/[0.04]">
          <CardTitle>Pontuação de Lead</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/[0.03]">
            {Object.entries(DEFAULT_SCORE_POINTS).map(([key, pts]) => (
              <div key={key} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-slate-8">{SCORE_EVENT_LABELS[key] || key}</span>
                <span className={cn("text-[13px] font-mono font-medium", pts > 0 ? "text-green-400" : pts < 0 ? "text-red-400" : "text-slate-6")}>
                  {pts > 0 ? `+${pts}` : pts}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced — Collapsible */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-[12px] font-medium text-slate-6 hover:text-slate-9 transition-colors cursor-pointer"
        >
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
          Configurações avançadas
        </button>
        {showAdvanced && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-2/40 text-[11px] uppercase tracking-widest text-slate-7 font-medium">
                    <tr>
                      <th className="px-4 py-2.5 border-b border-white/[0.04]">Key</th>
                      <th className="px-4 py-2.5 border-b border-white/[0.04]">Valor</th>
                      <th className="px-4 py-2.5 border-b border-white/[0.04]">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {settings.map(s => (
                      <tr key={s.id} className="hover:bg-slate-2/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-8">{s.key}</td>
                        <td className="px-4 py-3">
                          <pre className="text-[11px] text-slate-6 font-mono truncate max-w-sm">
                            {typeof s.value === 'string' ? s.value : JSON.stringify(s.value)}
                          </pre>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-6">
                          {new Date(s.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
