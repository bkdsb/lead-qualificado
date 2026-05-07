'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getClientEnv } from '@/lib/config/env';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

type AuthView = 'login' | 'forgot' | 'reset';
type PendingAction = 'login' | 'forgot' | 'reset' | null;

function normalizeAuthError(message: string): string {
  if (message === 'Invalid login credentials') return 'Email ou senha inválidos.';
  if (message.toLowerCase().includes('email')) return 'Confira o email informado.';
  if (message.toLowerCase().includes('password')) return 'Confira a senha informada.';
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

export default function LoginPage() {
  const hasRecoveryHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
  const [view, setView] = useState<AuthView>(() => (hasRecoveryHash ? 'reset' : 'login'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(() => (
    hasRecoveryHash ? 'Defina sua nova senha para concluir a recuperação.' : ''
  ));
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset');
        setError('');
        setMessage('Defina sua nova senha para concluir a recuperação.');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setPendingAction('login');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(normalizeAuthError(authError.message));
      setPendingAction(null);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setPendingAction('forgot');

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getResetRedirectUrl(),
    });

    if (resetError) {
      setError(normalizeAuthError(resetError.message));
      setPendingAction(null);
      return;
    }

    setMessage('Se o email existir, enviamos um link de recuperação. Verifique caixa de entrada e spam.');
    setPendingAction(null);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setPendingAction('reset');

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(normalizeAuthError(updateError.message));
      setPendingAction(null);
      return;
    }

    setMessage('Senha atualizada com sucesso. Entrando...');
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-1 relative overflow-hidden">
      {/* Subtle background gradient — Resend-style depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(120,119,198,0.08),transparent)]" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px] px-8"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <Image src="/logoRastroBranca.svg" alt="Rastro" width={540} height={156} className="h-[72px] w-auto object-contain" />
          <p className="text-[13px] text-slate-7 mt-2">Gestão de Leads & Meta CAPI</p>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-7">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full h-10 px-3 bg-slate-2 border border-white/[0.08] rounded-md text-sm text-slate-10 placeholder:text-slate-6 outline-none transition-all duration-200 focus:border-white/20 focus:ring-2 focus:ring-white/[0.06]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-7">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    setError('');
                    setMessage('');
                  }}
                  className="text-[12px] text-slate-7 hover:text-slate-9 transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h-10 px-3 pr-12 bg-slate-2 border border-white/[0.08] rounded-md text-sm text-slate-10 placeholder:text-slate-6 outline-none transition-all duration-200 focus:border-white/20 focus:ring-2 focus:ring-white/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md border border-white/[0.24] bg-slate-2 text-slate-10 hover:text-white hover:bg-slate-3 transition-colors flex items-center justify-center z-10"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pendingAction !== null}
              className="w-full h-10 bg-slate-10 text-slate-1 text-[13px] font-semibold rounded-md transition-all duration-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {pendingAction === 'login' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-7">
                Email da conta
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full h-10 px-3 bg-slate-2 border border-white/[0.08] rounded-md text-sm text-slate-10 placeholder:text-slate-6 outline-none transition-all duration-200 focus:border-white/20 focus:ring-2 focus:ring-white/[0.06]"
              />
            </div>

            <button
              type="submit"
              disabled={pendingAction !== null}
              className="w-full h-10 bg-slate-10 text-slate-1 text-[13px] font-semibold rounded-md transition-all duration-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {pendingAction === 'forgot' ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <button
              type="button"
              onClick={() => {
                setView('login');
                setError('');
                setMessage('');
              }}
              className="w-full h-10 border border-white/[0.12] text-slate-8 text-[13px] font-medium rounded-md hover:bg-white/[0.03] transition"
            >
              Voltar para o login
            </button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-7">
                Nova senha
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoComplete="new-password"
                  className="w-full h-10 px-3 pr-12 bg-slate-2 border border-white/[0.08] rounded-md text-sm text-slate-10 placeholder:text-slate-6 outline-none transition-all duration-200 focus:border-white/20 focus:ring-2 focus:ring-white/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md border border-white/[0.24] bg-slate-2 text-slate-10 hover:text-white hover:bg-slate-3 transition-colors flex items-center justify-center z-10"
                  aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-7">
                Confirmar nova senha
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  autoComplete="new-password"
                  className="w-full h-10 px-3 pr-12 bg-slate-2 border border-white/[0.08] rounded-md text-sm text-slate-10 placeholder:text-slate-6 outline-none transition-all duration-200 focus:border-white/20 focus:ring-2 focus:ring-white/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md border border-white/[0.24] bg-slate-2 text-slate-10 hover:text-white hover:bg-slate-3 transition-colors flex items-center justify-center z-10"
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pendingAction !== null}
              className="w-full h-10 bg-slate-10 text-slate-1 text-[13px] font-semibold rounded-md transition-all duration-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {pendingAction === 'reset' ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-[13px]"
          >
            {error}
          </motion.div>
        )}

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[13px]"
          >
            {message}
          </motion.div>
        )}

        <div className="mt-8 pt-6 border-t border-white/[0.04]">
          <p className="text-[11px] text-slate-6 text-center tracking-wide">
            Sistema interno · Acesso restrito
          </p>
        </div>
      </motion.div>
    </div>
  );
}
