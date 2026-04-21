'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, SCORE_BAND_LABELS, MATCH_STRENGTH_LABELS } from '@/lib/utils/constants';
import type { DbLead, LeadStage, ScoreBand, MatchStrength } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeadsClient() {
  const router = useRouter();
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Form states
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
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Leads</h1>
          <p className="text-sm text-slate-7">Gerencie o pipeline de conversão e scoring de identidade.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-6" />
            <Input 
              placeholder="Buscar (nome, email...)" 
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="relative">
            <select 
              className="h-9 rounded-md border border-white/[0.08] bg-slate-1 px-3 text-sm text-slate-10 focus:outline-none focus:ring-2 focus:ring-slate-6 appearance-none w-[160px]"
              value={stageFilter}
              onChange={e => { setStageFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todos estágios</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-6 pointer-events-none" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> <span className="hidden md:inline">Novo Lead</span>
          </Button>
        </div>
      </div>

      {/* Main Table Layer */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-2/40 text-[11px] uppercase tracking-widest text-slate-7 font-semibold">
              <tr>
                <th className="px-5 py-3 border-b border-white/[0.04]">Nome</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Estágio</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Score</th>
                <th className="px-5 py-3 border-b border-white/[0.04] text-center">Correspondência</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Último Contato</th>
                <th className="px-5 py-3 border-b border-white/[0.04]">Sincronia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-7">Sincronizando pipeline...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-7">Nenhum evento letal detectado nesta janela.</td></tr>
              ) : leads.map(lead => (
                <tr 
                  key={lead.id} 
                  className="group transition-colors hover:bg-slate-2/60 cursor-pointer"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-9 tracking-tight">{lead.name || '—'}</div>
                    <div className="text-[12px] text-slate-6 mt-0.5 font-mono">{lead.email || lead.phone || 'Sem contato'}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={lead.stage === 'purchase' ? 'success' : lead.stage === 'qualified' ? 'warning' : 'neutral'}>
                      {STAGE_LABELS[lead.stage as LeadStage]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-9">{lead.score}</span>
                      <Badge variant="neutral" className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                        {SCORE_BAND_LABELS[lead.score_band as ScoreBand]}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Badge variant={
                      lead.match_strength === 'strong' || lead.match_strength === 'good' ? 'success' :
                      lead.match_strength === 'medium' ? 'warning' : 'danger'
                    }>
                      {MATCH_STRENGTH_LABELS[lead.match_strength as MatchStrength] || '—'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-slate-7">
                    {lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={lead.meta_sync_status === 'synced' ? 'success' : lead.meta_sync_status === 'error' ? 'danger' : 'neutral'}>
                      {lead.meta_sync_status === 'synced' ? 'OK' : lead.meta_sync_status === 'error' ? 'Erro' : 'Pendente'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination control */}
      {total > 30 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-7">{total} registros indexados.</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="text-slate-7 px-3 py-1 font-mono text-xs">Pg {page}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={leads.length < 30} className="gap-1">
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals & Dialogs (Custom implementation mapped with Framer Motion to skip complex Radix Dialog routing) */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center isolate">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm -z-10"
              onClick={() => setShowCreate(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-surface border border-white/[0.08] shadow-popover w-[90%] max-w-md rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold text-white tracking-tight mb-5">Adicionar Lead</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-slate-7">Nome</label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-slate-7">Email</label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-slate-7">Telefone</label>
                  <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+5511999999999" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-slate-7">Origem</label>
                  <select className="flex h-9 w-full rounded-md border border-white/[0.08] bg-slate-1 px-3 py-1 text-sm text-slate-10 focus:outline-none focus:ring-2 focus:ring-slate-6 appearance-none" value={newSource} onChange={e => setNewSource(e.target.value)}>
                    <option value="manual">Entrada Manual</option>
                    <option value="lp">Landing Page</option>
                    <option value="whatsapp">WhatsApp Inbound</option>
                    <option value="ad">Tráfego Frio</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-white/[0.04]">
                  <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'Indexando...' : 'Adicionar'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
