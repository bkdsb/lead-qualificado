import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { STAGE_TRANSITIONS } from '@/lib/utils/constants';
import { auditStageChange } from '@/lib/services/audit-service';
import { tryAutoDispatch } from '@/lib/services/auto-dispatch-service';
import type { LeadStage } from '@/types/database';

/**
 * PATCH /api/leads/[id]/stage — Change lead stage
 * 
 * Now includes auto-dispatch: when a lead moves to certain stages,
 * automatically fires the corresponding Meta CAPI event.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { to_stage, reason, purchase_value } = body;

  if (!to_stage) {
    return NextResponse.json({ error: 'to_stage é obrigatório' }, { status: 400 });
  }

  // Fetch current lead
  const admin = createAdminClient();
  const { data: lead } = await admin
    .from('leads')
    .select('id, stage')
    .eq('id', id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  }

  const currentStage = lead.stage as LeadStage;
  const targetStage = to_stage as LeadStage;

  // Validate transition
  const allowedTransitions = STAGE_TRANSITIONS[currentStage];
  if (!allowedTransitions || !allowedTransitions.includes(targetStage)) {
    return NextResponse.json({
      error: `Transição inválida: ${currentStage} → ${targetStage}`,
      allowed: allowedTransitions,
    }, { status: 400 });
  }

  // Update lead stage
  const updates: Record<string, unknown> = { stage: targetStage };

  // Special handling for purchase
  if (targetStage === 'purchase') {
    updates.closed_at = new Date().toISOString();
    if (purchase_value !== undefined) {
      updates.purchase_value = purchase_value;
    }
  }

  const { error: updateError } = await admin
    .from('leads')
    .update(updates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record stage history
  await admin.from('lead_stage_history').insert({
    lead_id: id,
    from_stage: currentStage,
    to_stage: targetStage,
    changed_by: user.id,
    reason: reason || null,
  });

  // Audit
  await auditStageChange(id, user.id, currentStage, targetStage, reason);

  // Auto-dispatch Meta CAPI event — ONLY for admin users
  // Operators can move stages freely but won't trigger Meta events
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  let autoDispatchResult = { dispatched: false, eventName: undefined as string | undefined, error: undefined as string | undefined };

  if (dbUser?.role === 'admin') {
    const result = await tryAutoDispatch(id, targetStage, user.id).catch(() => null);
    if (result) {
      autoDispatchResult = {
        dispatched: result.dispatched,
        eventName: result.eventName,
        error: result.error,
      };
    }
  }

  return NextResponse.json({
    success: true,
    from_stage: currentStage,
    to_stage: targetStage,
    auto_dispatch: autoDispatchResult.dispatched
      ? { event: autoDispatchResult.eventName, status: 'sent' }
      : undefined,
  });
}
