'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, SCORE_BAND_LABELS } from '@/lib/utils/constants';
import type { DbLead, LeadStage, ScoreBand } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STAGE_COLORS } from '@/lib/utils/constants';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function LeadsClient() {
  const router = useRouter();
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSource, setNewSource] = useState('manual');
  const [creating, setCreating] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (search) params.set('search', search);
    if (stageFilter) params.set('stage', stageFilter);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, stageFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, email: newEmail || undefined, phone: newPhone || undefined, source: newSource }),
    });
    if (res.ok) {
      setShowCreate(false);
      setNewName(''); setNewEmail(''); setNewPhone('');
      fetchLeads();
    }
    setCreating(false);
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Leads</h1>
          <p className="text-[13px] text-slate-7 mt-0.5">{total} registros no pipeline.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-6" />
            <Input
              placeholder="Buscar..."
              className="pl-8 h-8 text-[13px]"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="relative">
            <select
              className="h-8 w-full sm:w-[130px] rounded-md border border-white/[0.08] bg-slate-1 px-2.5 text-[13px] text-slate-10 focus:outline-none focus:ring-1 focus:ring-slate-6 appearance-none cursor-pointer"
              value={stageFilter}
              onChange={e => { setStageFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todos</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-6 pointer-events-none" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="h-8 gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Novo</span>
          </Button>
        </div>
      </div>

      {/* Desktop Table — 4 columns */}
      <Card className="hidden md:block">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-2/40 text-[11px] uppercase tracking-widest text-slate-7 font-medium">
            <tr>
              <th className="px-4 py-2.5 border-b border-white/[0.04]">Nome</th>
              <th className="px-4 py-2.5 border-b border-white/[0.04]">Estágio</th>
              <th className="px-4 py-2.5 border-b border-white/[0.04]">Score</th>
              <th className="px-4 py-2.5 border-b border-white/[0.04] text-right">Entrada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-7 text-sm">Carregando...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-7 text-sm">Nenhum lead encontrado.</td></tr>
            ) : leads.map(lead => (
              <tr
                key={lead.id}
                className="group transition-colors hover:bg-slate-2/50 cursor-pointer"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-9 group-hover:text-white transition-colors">{lead.name || '—'}</div>
                  <div className="text-[11px] text-slate-6 mt-0.5">{lead.email || lead.phone || '—'}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    style={{
                      backgroundColor: `${STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS]}12`,
                      color: STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS],
                      borderColor: `${STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS]}25`,
                    }}
                    className="border"
                  >
                    {STAGE_LABELS[lead.stage as LeadStage]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono font-medium text-slate-9">{lead.score}</span>
                  <span className="text-[10px] text-slate-6 ml-1.5 uppercase">{SCORE_BAND_LABELS[lead.score_band as ScoreBand]}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[12px] text-slate-6">{timeAgo(lead.created_at)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="py-10 text-center text-slate-7 text-sm">Carregando...</div>
        ) : leads.length === 0 ? (
          <div className="py-10 text-center text-slate-7 text-sm">Nenhum lead encontrado.</div>
        ) : leads.map(lead => (
          <Card
            key={lead.id}
            className="p-3.5 cursor-pointer hover:bg-slate-2/50 transition-colors active:scale-[0.99]"
            onClick={() => router.push(`/leads/${lead.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-slate-3 flex items-center justify-center text-[11px] font-bold text-slate-7 uppercase shrink-0">
                  {lead.name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-9 truncate">{lead.name || '—'}</div>
                  <div className="text-[11px] text-slate-6 truncate">{lead.email || lead.phone || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Badge
                  style={{
                    backgroundColor: `${STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS]}12`,
                    color: STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS],
                    borderColor: `${STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS]}25`,
                  }}
                  className="border text-[10px]"
                >
                  {STAGE_LABELS[lead.stage as LeadStage]}
                </Badge>
                <ArrowRight className="w-3.5 h-3.5 text-slate-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-slate-7">{total} leads</span>
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Ant.
            </Button>
            <span className="text-slate-6 px-2 font-mono text-xs">{page}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={leads.length < 30} className="h-7 gap-1">
              Próx. <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center isolate p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm -z-10"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-surface border border-white/[0.08] shadow-popover w-full max-w-md rounded-xl p-6"
            >
              <h2 className="text-lg font-semibold text-white tracking-tight mb-5">Novo Lead</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest font-medium text-slate-7">Nome</label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest font-medium text-slate-7">Email</label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest font-medium text-slate-7">Telefone</label>
                  <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+5511999999999" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest font-medium text-slate-7">Origem</label>
                  <select className="flex h-8 w-full rounded-md border border-white/[0.08] bg-slate-1 px-3 text-[13px] text-slate-10 focus:outline-none focus:ring-1 focus:ring-slate-6 appearance-none cursor-pointer" value={newSource} onChange={e => setNewSource(e.target.value)}>
                    <option value="manual">Manual</option>
                    <option value="lp">Landing Page</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="ad">Tráfego Pago</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-2 border-t border-white/[0.04]">
                  <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'Salvando...' : 'Adicionar'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
