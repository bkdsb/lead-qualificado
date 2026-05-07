'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, Play, ShieldCheck, ChevronDown, KeyRound, RotateCcw, Eye, EyeOff } from 'lucide-react';
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
  const raw = message?.trim() || 'Falha na autenticação.';

  if (raw === 'Invalid login credentials') return 'Senha atual inválida.';
  if (/email rate limit/i.test(raw)) return 'Limite de envio de emails atingido. Tente novamente em alguns minutos.';
  if (/smtp|send.*email/i.test(raw)) return `Falha no envio de email do Supabase: ${raw}`;
  if (/redirect/i.test(raw) && /not allowed|invalid/i.test(raw)) {
    return 'URL de redirecionamento não autorizada no Supabase Auth.';
  }

  return raw;
}

function getResetRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login`;
  }
  const appUrl = getClientEnv().NEXT_PUBLIC_APP_URL;
  if (appUrl && appUrl.trim().length > 0) {
    return `${appUrl.replace(/\/$/, '')}/login`;
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
  const [confirmAction, setConfirmAction] = useState<'email' | 'password' | 'recovery' | null>(null);
  const [pendingTestModeValue, setPendingTestModeValue] = useState<boolean | null>(null);

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

  function requestToggleTestMode() {
    const current = settings.find(s => s.key === 'test_mode_enabled');
    const newValue = current?.value === true || current?.value === 'true' ? false : true;
    setPendingTestModeValue(newValue);
  }

  async function toggleTestMode() {
    if (pendingTestModeValue === null) return;

    setSaving('test_mode_enabled');
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test_mode_enabled', value: pendingTestModeValue }),
    });
    setSaving(null);
    if (!res.ok) {
      toast.error('Falha ao alterar modo de teste');
      return;
    }
    setPendingTestModeValue(null);
    window.location.reload();
  }

  function requestEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newEmail.trim();

    if (!trimmed) {
      toast.error('Informe um email válido.');
      return;
    }
    if (trimmed === currentUserEmail) {
      toast.error('Informe um email diferente do atual.');
      return;
    }
    setConfirmAction('email');
  }

  async function handleUpdateEmail() {
    const trimmed = newEmail.trim();
    setAccountSaving('email');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) {
        toast.error(normalizeAuthError(error.message));
        return;
      }

      toast.success('Solicitação enviada. Confirme o novo email na sua caixa de entrada e também no spam.');
      setConfirmAction(null);
    } finally {
      setAccountSaving(null);
    }
  }

  function requestPasswordUpdate(e: React.FormEvent) {
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
    setConfirmAction('password');
  }

  async function handleUpdatePassword() {
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
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      toast.success('Senha atualizada com sucesso.');
      setConfirmAction(null);
    } finally {
      setAccountSaving(null);
    }
  }

  function requestRecovery() {
    if (!currentUserEmail) {
      toast.error('Não foi possível identificar o email da conta atual.');
      return;
    }
    setConfirmAction('recovery');
  }

  async function handleSendRecovery() {
    setAccountSaving('recovery');
    try {
      const supabase = createClient();
      const redirectTo = getResetRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(currentUserEmail, {
        redirectTo,
      });

      if (error) {
        toast.error(normalizeAuthError(error.message));
        if (/redirect/i.test(error.message)) {
          toast.error(`Redirect usado: ${redirectTo}. Adicione esse domínio no Supabase Auth > URL Configuration.`);
        }
        return;
      }

      toast.success('Link de recuperação enviado para seu email. Verifique também spam/lixo eletrônico.');
      setConfirmAction(null);
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

      <Card>
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
              <div
                className={cn(
                  'p-3 rounded-md border text-[13px] font-medium',
                  capiStatus.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400',
                )}
              >
                {capiStatus.success ? '✓ Conexão com o Facebook Ativa' : `✕ Erro: ${String(capiStatus.error || 'desconhecido')}`}
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-9">Modo de Teste</div>
              <div className="text-[12px] text-slate-6 mt-0.5">Eventos vão para o canal de teste da Meta.</div>
            </div>
            <Button
              onClick={requestToggleTestMode}
              disabled={saving === 'test_mode_enabled'}
              className={cn('w-28 h-8', isTestMode ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400 border-none' : '')}
            >
              {isTestMode ? (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5" /> Teste
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Produção
                </>
              )}
            </Button>
          </div>

          {pendingTestModeValue !== null && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-2">
              <p className="text-[12px] text-amber-200">
                Confirmar troca para {pendingTestModeValue ? 'Modo de Teste' : 'Modo de Produção'}?
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="h-8" onClick={() => setPendingTestModeValue(null)}>
                  Cancelar
                </Button>
                <Button type="button" className="h-8" onClick={toggleTestMode} disabled={saving === 'test_mode_enabled'}>
                  {saving === 'test_mode_enabled' ? 'Salvando...' : 'Confirmar alteração'}
                </Button>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.04]">
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="flex items-center gap-2 text-[12px] font-medium text-slate-7 hover:text-slate-9 transition-colors cursor-pointer w-full"
            >
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showCredentials && 'rotate-180')} />
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

      <Card>
        <CardHeader className="p-4 pb-3 border-b border-white/[0.04]">
          <CardTitle>Pontuação de Lead</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/[0.03]">
            {Object.entries(DEFAULT_SCORE_POINTS).map(([key, pts]) => (
              <div key={key} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-slate-8">{SCORE_EVENT_LABELS[key] || key}</span>
                <span className={cn('text-[13px] font-mono font-medium', pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-slate-6')}>
                  {pts > 0 ? `+${pts}` : pts}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-[12px] font-medium text-slate-6 hover:text-slate-9 transition-colors cursor-pointer"
        >
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAdvanced && 'rotate-180')} />
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

      <Card>
        <CardHeader className="p-4 pb-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-6" />
            <CardTitle>Conta & Segurança</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-5">
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-9">Email da conta</div>
              <div className="text-xs text-slate-6 truncate max-w-[180px]" title={currentUserEmail || '—'}>
                {currentUserEmail || '—'}
              </div>
            </div>
            <form onSubmit={requestEmailUpdate} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (confirmAction === 'email') setConfirmAction(null);
                }}
                placeholder="novo@email.com"
                className="h-9"
                required
              />
              <Button type="submit" disabled={accountSaving !== null} className="h-9">
                Alterar email
              </Button>
            </form>
            {confirmAction === 'email' && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-2">
                <p className="text-[12px] text-amber-200">Confirmar alteração de email para {newEmail.trim()}?</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="h-8" onClick={() => setConfirmAction(null)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="h-8" onClick={handleUpdateEmail} disabled={accountSaving !== null}>
                    {accountSaving === 'email' ? 'Salvando...' : 'Confirmar alteração'}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <div className="h-px bg-white/[0.06]" />

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-9">Senha</div>
              <div className="text-[11px] text-slate-6">Mínimo 8 caracteres</div>
            </div>
            <form onSubmit={requestPasswordUpdate} className="space-y-2.5">
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentPassword(value);
                    if (!value) setShowCurrentPassword(false);
                    if (confirmAction === 'password') setConfirmAction(null);
                  }}
                  placeholder="Senha atual"
                  autoComplete="current-password"
                  className={currentPassword ? 'h-9 pr-12' : 'h-9'}
                  required
                />
                {currentPassword.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(v => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md border border-white/[0.24] bg-slate-2 text-slate-10 hover:text-white hover:bg-slate-3 transition-colors flex items-center justify-center z-10"
                    aria-label={showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    title={showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewPassword(value);
                      if (!value) setShowNewPassword(false);
                      if (confirmAction === 'password') setConfirmAction(null);
                    }}
                    placeholder="Nova senha"
                    autoComplete="new-password"
                    className={newPassword ? 'h-9 pr-12' : 'h-9'}
                    required
                  />
                  {newPassword.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(v => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md border border-white/[0.24] bg-slate-2 text-slate-10 hover:text-white hover:bg-slate-3 transition-colors flex items-center justify-center z-10"
                      aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      title={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConfirmPassword(value);
                      if (!value) setShowConfirmPassword(false);
                      if (confirmAction === 'password') setConfirmAction(null);
                    }}
                    placeholder="Confirmar nova senha"
                    autoComplete="new-password"
                    className={confirmPassword ? 'h-9 pr-12' : 'h-9'}
                    required
                  />
                  {confirmPassword.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md border border-white/[0.24] bg-slate-2 text-slate-10 hover:text-white hover:bg-slate-3 transition-colors flex items-center justify-center z-10"
                      aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={accountSaving !== null} className="w-full h-9">
                Salvar nova senha
              </Button>
            </form>
            {confirmAction === 'password' && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-2">
                <p className="text-[12px] text-amber-200">Confirmar atualização da senha da conta?</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="h-8" onClick={() => setConfirmAction(null)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="h-8" onClick={handleUpdatePassword} disabled={accountSaving !== null}>
                    {accountSaving === 'password' ? 'Atualizando...' : 'Confirmar senha'}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-3 space-y-2.5">
            <div className="text-sm font-medium text-slate-9">Recuperação de acesso</div>
            <p className="text-[12px] text-slate-6">Envia um link de redefinição para o email atual.</p>
            {confirmAction === 'recovery' ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="h-8" onClick={() => setConfirmAction(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="h-8 gap-2"
                  onClick={handleSendRecovery}
                  disabled={accountSaving !== null}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {accountSaving === 'recovery' ? 'Enviando...' : 'Confirmar envio'}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="w-full h-9 gap-2"
                onClick={requestRecovery}
                disabled={accountSaving !== null}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Enviar link de recuperação
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
