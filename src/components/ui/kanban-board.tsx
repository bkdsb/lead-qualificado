'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { STAGE_LABELS, STAGE_COLORS, SCORE_BAND_LABELS, STAGE_TRANSITIONS } from '@/lib/utils/constants';
import type { DbLead, LeadStage, ScoreBand } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const KANBAN_STAGES: LeadStage[] = ['new', 'contacted', 'conversing', 'proposal', 'qualified', 'purchase'];

interface KanbanCardProps {
  lead: DbLead;
  onDoubleClick: () => void;
  isDragging?: boolean;
}

function KanbanCard({ lead, onDoubleClick, isDragging }: KanbanCardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-white/[0.06] rounded-lg p-3 cursor-grab active:cursor-grabbing",
        "hover:border-white/[0.12] hover:bg-[#151514] transition-all duration-150",
        isDragging && "opacity-50 scale-[0.98] ring-2 ring-white/10"
      )}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-[13px] text-slate-9 truncate leading-tight">
          {lead.name || 'Sem nome'}
        </div>
        <span className="text-[10px] font-mono text-slate-6 shrink-0 mt-0.5">
          {lead.score}pts
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-6">
        {lead.phone && (
          <span className="flex items-center gap-1 truncate">
            <Phone className="w-2.5 h-2.5" />
            {lead.phone.replace(/^(\+55)/, '').slice(-4)}
          </span>
        )}
        {lead.email && (
          <span className="flex items-center gap-1 truncate">
            <Mail className="w-2.5 h-2.5" />
            {lead.email.split('@')[0]}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <Badge
          variant="neutral"
          className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-widest"
          style={{
            color: (() => {
              const band = lead.score_band as ScoreBand;
              if (band === 'ready') return '#22c55e';
              if (band === 'hot') return '#f97316';
              if (band === 'warm') return '#eab308';
              return '#64748b';
            })(),
          }}
        >
          {SCORE_BAND_LABELS[lead.score_band as ScoreBand]}
        </Badge>
        <span className="text-[10px] text-slate-6 font-mono">
          {timeAgo(lead.created_at)}
        </span>
      </div>
    </div>
  );
}

function SortableCard({ lead, onDoubleClick }: { lead: DbLead; onDoubleClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-manipulation">
      <KanbanCard lead={lead} onDoubleClick={onDoubleClick} isDragging={isDragging} />
    </div>
  );
}

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

function DroppableColumn({ id, activeId, children }: { id: string; activeId: string | null; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 space-y-2 rounded-lg p-2 min-h-[100px]",
        "bg-white/[0.01] border border-dashed border-white/[0.04]",
        "transition-colors duration-150",
        activeId && "border-white/[0.06]",
        isOver && "border-white/[0.15] bg-white/[0.03]"
      )}
    >
      {children}
    </div>
  );
}

interface PendingMove {
  leadId: string;
  leadName: string;
  fromStage: LeadStage;
  toStage: LeadStage;
}

interface KanbanBoardProps {
  leads: DbLead[];
  onStageChange: (leadId: string, toStage: LeadStage) => Promise<boolean>;
  onRefresh: () => void;
}

export default function KanbanBoard({ leads, onStageChange, onRefresh }: KanbanBoardProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  
  // Local state for optimistic UI during drag
  const [boardLeads, setBoardLeads] = useState<DbLead[]>(leads);
  
  // Sync when props change
  import { useEffect } from 'react';
  useEffect(() => {
    setBoardLeads(leads);
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const columnLeads = useCallback((stage: LeadStage) => {
    return boardLeads.filter(l => l.stage === stage);
  }, [boardLeads]);

  const activeLead = activeId ? boardLeads.find(l => l.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    setBoardLeads(prev => {
      const activeIndex = prev.findIndex(l => l.id === activeId);
      if (activeIndex === -1) return prev;

      let overStage: LeadStage | null = null;
      if (KANBAN_STAGES.includes(overId as LeadStage)) {
        overStage = overId as LeadStage;
      } else {
        const targetLead = prev.find(l => l.id === overId);
        if (targetLead) overStage = targetLead.stage as LeadStage;
      }

      if (!overStage || prev[activeIndex].stage === overStage) {
        return prev;
      }

      // Optimistic move
      const newLeads = [...prev];
      newLeads[activeIndex] = { ...newLeads[activeIndex], stage: overStage };
      return newLeads;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;

    if (!over) {
      setBoardLeads(leads); // revert
      return;
    }

    const leadId = active.id as string;
    // Get original stage from props
    const originalLead = leads.find(l => l.id === leadId);
    if (!originalLead) return;

    let targetStage: LeadStage | null = null;
    if (KANBAN_STAGES.includes(over.id as LeadStage)) {
      targetStage = over.id as LeadStage;
    } else {
      const targetLead = boardLeads.find(l => l.id === over.id);
      if (targetLead) {
        targetStage = targetLead.stage as LeadStage;
      }
    }

    if (!targetStage || targetStage === originalLead.stage) {
      setBoardLeads(leads); // revert
      return;
    }

    // Validate transition using original stage
    const allowed = STAGE_TRANSITIONS[originalLead.stage as LeadStage] || [];
    if (!allowed.includes(targetStage)) {
      toast.error(`Transição inválida: ${STAGE_LABELS[originalLead.stage as LeadStage]} → ${STAGE_LABELS[targetStage]}`);
      setBoardLeads(leads); // revert
      return;
    }

    setPendingMove({
      leadId,
      leadName: originalLead.name || 'Sem nome',
      fromStage: originalLead.stage as LeadStage,
      toStage: targetStage
    });
  }

  function cancelMove() {
    setPendingMove(null);
    setBoardLeads(leads); // revert to original state
  }

  async function confirmMove() {
    if (!pendingMove) return;
    const { leadId, toStage } = pendingMove;
    setPendingMove(null);

    toast.promise(
      onStageChange(leadId, toStage),
      {
        loading: `Movendo para ${STAGE_LABELS[toStage]}...`,
        success: `✓ Lead movido para ${STAGE_LABELS[toStage]}`,
        error: 'Falha ao mover lead',
      }
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
        {KANBAN_STAGES.map(stage => {
          const stageLeads = columnLeads(stage);
          const stageColor = STAGE_COLORS[stage];

          return (
            <div
              key={stage}
              id={stage}
              className="flex flex-col min-w-[260px] w-[260px] shrink-0"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stageColor }}
                  />
                  <span className="text-[12px] font-semibold text-slate-8 uppercase tracking-widest">
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-6 bg-slate-3 px-1.5 py-0.5 rounded">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Drop Zone */}
              <SortableContext
                id={stage}
                items={stageLeads.map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
              <DroppableColumn id={stage} activeId={activeId}>
                  {stageLeads.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-[11px] text-slate-6 italic">
                      Arraste leads aqui
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <SortableCard
                        key={lead.id}
                        lead={lead}
                        onDoubleClick={() => router.push(`/leads/${lead.id}`)}
                      />
                    ))
                  )}
              </DroppableColumn>
              </SortableContext>
            </div>
          );
        })}
      </div>

      {/* Drag Overlay — The floating card while dragging */}
      <DragOverlay>
        {activeLead ? (
          <div className="w-[244px] pointer-events-none">
            <KanbanCard lead={activeLead} onDoubleClick={() => {}} isDragging />
          </div>
        ) : null}
      </DragOverlay>

      {/* Confirmation Modal */}
      {pendingMove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 space-y-4">
              <h3 className="text-lg font-semibold text-white tracking-tight">Confirmar Movimentação</h3>
              
              <div className="bg-slate-2 rounded-lg p-4 space-y-3 border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-5 font-medium uppercase tracking-wider mb-1">Lead</span>
                  <span className="text-sm font-medium text-slate-9">{pendingMove.leadName}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex flex-col">
                    <span className="text-[11px] text-slate-5 font-medium uppercase tracking-wider mb-1">De</span>
                    <span className="text-[13px] text-slate-8 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[pendingMove.fromStage] }} />
                      {STAGE_LABELS[pendingMove.fromStage]}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-6 mt-4 shrink-0" />
                  <div className="flex-1 flex flex-col pl-3">
                    <span className="text-[11px] text-slate-5 font-medium uppercase tracking-wider mb-1">Para</span>
                    <span className="text-[13px] font-medium text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[pendingMove.toStage] }} />
                      {STAGE_LABELS[pendingMove.toStage]}
                    </span>
                  </div>
                </div>
              </div>

              {(pendingMove.toStage === 'qualified' || pendingMove.toStage === 'contacted') && (
                <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                  <Zap className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-relaxed">
                    Esta ação irá disparar automaticamente um evento de <strong>{pendingMove.toStage === 'qualified' ? 'QualifiedLead' : 'Lead'}</strong> para o Meta CAPI (caso você seja admin).
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-3 justify-end">
              <Button variant="secondary" onClick={cancelMove}>Cancelar</Button>
              <Button onClick={confirmMove}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
