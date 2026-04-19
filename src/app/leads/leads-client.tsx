'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, STAGE_COLORS, SCORE_BAND_LABELS, SCORE_BAND_COLORS, MATCH_STRENGTH_LABELS, MATCH_STRENGTH_COLORS } from '@/lib/utils/constants';
import type { DbLead, LeadStage, ScoreBand, MatchStrength } from '@/types/database';

export default function LeadsClient() {
  const router = useRouter();
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create lead form
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
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nome, email ou phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 280 }}
          />
          <select className="form-input" value={stageFilter} onChange={e => { setStageFilter(e.target.value); setPage(1); }} style={{ width: 160 }}>
            <option value="">Todos os estágios</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Novo Lead</button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Origem</th>
              <th>Campanha</th>
              <th>Estágio</th>
              <th>Score</th>
              <th>Match</th>
              <th>Último Contato</th>
              <th>Sync</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Carregando...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Nenhum lead encontrado</td></tr>
            ) : leads.map(lead => (
              <tr key={lead.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/leads/${lead.id}`)}>
                <td>
                  <div style={{ fontWeight: 600 }}>{lead.name || '—'}</div>
                  <div className="text-xs text-muted">{lead.email || lead.phone || ''}</div>
                </td>
                <td className="text-xs">{lead.source}</td>
                <td className="text-xs truncate" style={{ maxWidth: 140 }}>{lead.campaign_name || '—'}</td>
                <td>
                  <span className="badge" style={{
                    background: `${STAGE_COLORS[lead.stage as LeadStage]}18`,
                    color: STAGE_COLORS[lead.stage as LeadStage],
                  }}>
                    {STAGE_LABELS[lead.stage as LeadStage]}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{lead.score}</span>
                  <span className="badge" style={{
                    marginLeft: 6,
                    background: `${SCORE_BAND_COLORS[lead.score_band as ScoreBand]}18`,
                    color: SCORE_BAND_COLORS[lead.score_band as ScoreBand],
                    fontSize: 10,
                  }}>
                    {SCORE_BAND_LABELS[lead.score_band as ScoreBand]}
                  </span>
                </td>
                <td>
                  <span className="badge" style={{
                    background: `${MATCH_STRENGTH_COLORS[lead.match_strength as MatchStrength]}18`,
                    color: MATCH_STRENGTH_COLORS[lead.match_strength as MatchStrength],
                  }}>
                    {MATCH_STRENGTH_LABELS[lead.match_strength as MatchStrength]}
                  </span>
                </td>
                <td className="text-xs text-muted">
                  {lead.last_contact_at
                    ? new Date(lead.last_contact_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : '—'}
                </td>
                <td>
                  <span className={`badge ${
                    lead.meta_sync_status === 'synced' ? 'badge-success' :
                    lead.meta_sync_status === 'error' ? 'badge-danger' :
                    'badge-neutral'
                  }`}>
                    {lead.meta_sync_status}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/leads/${lead.id}`)}>
                    Ver →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted">{total} leads no total</span>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Anterior</button>
            <span className="text-xs text-muted" style={{ padding: '4px 8px' }}>Página {page}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={leads.length < 30}>Próxima →</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Novo Lead</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-lead-name">Nome *</label>
                <input id="new-lead-name" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-lead-email">Email</label>
                <input id="new-lead-email" className="form-input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-lead-phone">Telefone</label>
                <input id="new-lead-phone" className="form-input" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+5511999999999" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-lead-source">Origem</label>
                <select id="new-lead-source" className="form-input" value={newSource} onChange={e => setNewSource(e.target.value)}>
                  <option value="manual">Manual</option>
                  <option value="lp">Landing Page</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="ad">Anúncio</option>
                  <option value="cta">CTA</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Criando...' : 'Criar Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
