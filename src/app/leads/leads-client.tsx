'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, SCORE_BAND_LABELS, STAGE_COLORS } from '@/lib/utils/constants';
import type { DbLead, LeadStage, ScoreBand } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton, SkeletonTableRow, SkeletonLeadCard } from '@/components/ui/skeleton';
import KanbanBoard from '@/components/ui/kanban-board';
import { Search, Plus, Filter, ChevronLeft, ChevronRight, ArrowRight, LayoutGrid, List, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

type ViewMode = 'table' | 'kanban';

export default function LeadsClient() {
  const router = useRouter();
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSource, setNewSource] = useState('manual');
  const [creating, setCreating] = useState(false);

  // For kanban, fetch ALL leads (no pagination)
  const isKanban = viewMode === 'kanban';

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: isKanban ? '1' : String(page),
      limit: isKanban ? '500' : '30',
    });
    if (search) params.set('search', search);
    if (stageFilter && !isKanban) params.set('stage', stageFilter);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, stageFilter, isKanban]);

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
      toast.success('Lead adicionado com sucesso');
      fetchLeads();
    } else {
      toast.error('Erro ao criar lead');
    }
    setCreating(false);
  }

  async function handleKanbanStageChange(leadId: string, toStage: LeadStage): Promise<boolean> {
    const res = await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_stage: toStage }),
    });
    if (res.ok) {
      fetchLeads();
      return true;
    }
    return false;
  }

  async function handleExportCSV() {
    const params = new URLSearchParams({ page: '1', limit: '10000' });
    if (search) params.set('search', search);
    if (stageFilter) params.set('stage', stageFilter);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    const allLeads = data.leads || [];

    if (allLeads.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }

    const headers = ['Nome', 'Email', 'Telefone', 'Estágio', 'Score', 'Band', 'Origem', 'Campanha', 'Entrada', 'Último Contato'];
    const rows = allLeads.map((l: DbLead) => [
      l.name || '',
      l.email || '',
      l.phone || '',
      STAGE_LABELS[l.stage as LeadStage] || l.stage,
      l.score,
      SCORE_BAND_LABELS[l.score_band as ScoreBand] || l.score_band,
      l.source || '',
      l.campaign_name || '',
      new Date(l.created_at).toLocaleDateString('pt-BR'),
      l.last_contact_at ? new Date(l.last_contact_at).toLocaleDateString('pt-BR') : '',
    ]);

    const csvContent = [headers, ...rows].map(row =>
      row.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${allLeads.length} leads exportados`);
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
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
          {!isKanban && (
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
          )}

          {/* View Toggle */}
          <div className="hidden md:flex items-center bg-slate-2 border border-white/[0.06] rounded-md p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-white/[0.08] text-white' : 'text-slate-6 hover:text-slate-9'}`}
              title="Tabela"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${viewMode === 'kanban' ? 'bg-white/[0.08] text-white' : 'text-slate-6 hover:text-slate-9'}`}
              title="Kanban"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button variant="secondary" onClick={handleExportCSV} className="h-8 gap-1.5 shrink-0 hidden sm:inline-flex" title="Exportar CSV">
            <Download className="w-3.5 h-3.5" />
          </Button>

          <Button onClick={() => setShowCreate(true)} className="h-8 gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Novo</span>
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {isKanban && !loading && (
        <KanbanBoard
          leads={leads}
          onStageChange={handleKanbanStageChange}
          onRefresh={fetchLeads}
        />
      )}
      {isKanban && loading && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[260px] w-[260px] shrink-0 space-y-2">
              <Skeleton className="h-6 w-24 mb-3" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg opacity-50" />
            </div>
          ))}
        </div>
      )}

      {/* Table View — Desktop */}
      {!isKanban && (
        <>
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
                  Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} cols={4} />)
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-3 flex items-center justify-center">
                          <Search className="w-5 h-5 text-slate-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-8">Nenhum lead encontrado</p>
                          <p className="text-[12px] text-slate-6 mt-1">Ajuste seus filtros ou adicione um novo lead.</p>
                        </div>
                        <Button onClick={() => setShowCreate(true)} className="h-8 text-[12px] mt-1">
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Lead
                        </Button>
                      </div>
                    </td>
                  </tr>
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
              Array.from({ length: 5 }).map((_, i) => <SkeletonLeadCard key={i} />)
            ) : leads.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-3 flex items-center justify-center">
                  <Search className="w-5 h-5 text-slate-6" />
                </div>
                <p className="text-sm text-slate-7">Nenhum lead encontrado.</p>
                <Button onClick={() => setShowCreate(true)} className="h-8 text-[12px]">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Lead
                </Button>
              </div>
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
        </>
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
