import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { evaluateMatchStrength } from '@/lib/engines/match-strength';

/**
 * GET /api/leads/[id] — Get lead detail with signals, notes, dispatches, stage history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch lead
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  }

  // Fetch related data in parallel
  const [signals, notes, stageHistory, scoreEvents, dispatches] = await Promise.all([
    supabase.from('lead_identity_signals').select('*').eq('lead_id', id).order('collected_at', { ascending: false }),
    supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('lead_stage_history').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('lead_score_events').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('meta_event_dispatches').select('*').eq('lead_id', id).order('dispatched_at', { ascending: false }),
  ]);

  // Evaluate current match strength (include lead's own email/phone)
  const matchResult = evaluateMatchStrength(signals.data || [], {
    email: lead.email,
    phone: lead.phone,
  });

  return NextResponse.json({
    lead,
    signals: signals.data || [],
    notes: notes.data || [],
    stageHistory: stageHistory.data || [],
    scoreEvents: scoreEvents.data || [],
    dispatches: dispatches.data || [],
    matchAnalysis: matchResult,
  });
}

/**
 * PATCH /api/leads/[id] — Update lead fields
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
  const allowedFields = ['name', 'email', 'phone', 'source', 'campaign_name', 'adset_name', 'ad_name', 'purchase_value', 'currency'];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: lead, error } = await admin
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit
  await admin.from('audit_logs').insert({
    entity_type: 'lead',
    entity_id: id,
    action: 'update',
    actor_id: user.id,
    details: updates,
  });

  return NextResponse.json({ lead });
}
