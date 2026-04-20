'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Email ou senha inválidos'
        : authError.message);
      setLoading(false);
      return;
    }

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
        className="relative w-full max-w-[380px] px-8"
      >
        <div className="mb-10">
          <h1 className="text-xl font-semibold text-slate-10 tracking-[-0.02em]">
            Lead Qualificado
          </h1>
          <p className="text-[13px] text-slate-7 mt-1.5">
            Gestão de Leads & Meta CAPI
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label 
              htmlFor="login-email" 
              className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-7"
            >
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
            <label 
              htmlFor="login-password" 
              className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-7"
            >
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full h-10 px-3 bg-slate-2 border border-white/[0.08] rounded-md text-sm text-slate-10 placeholder:text-slate-6 outline-none transition-all duration-200 focus:border-white/20 focus:ring-2 focus:ring-white/[0.06]"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-[13px]"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-slate-10 text-slate-1 text-[13px] font-semibold rounded-md transition-all duration-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
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

        <div className="mt-8 pt-6 border-t border-white/[0.04]">
          <p className="text-[11px] text-slate-6 text-center tracking-wide">
            Sistema interno · Acesso restrito
          </p>
        </div>
      </motion.div>
    </div>
  );
}
