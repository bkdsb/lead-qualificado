import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getDefaultPoints, calculateTotalScore } from '@/lib/engines/score-engine';
import { auditScoreChange } from '@/lib/services/audit-service';
import type { ScoreEventType } from '@/types/database';

/**
 * POST /api/leads/[id]/score — Add a score event to a lead
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { event_type, points: customPoints, note } = body;

  if (!event_type) {
    return NextResponse.json({ error: 'event_type é obrigatório' }, { status: 400 });
  }

  // For manual_adjust, note is required
  if (event_type === 'manual_adjust' && !note) {
    return NextResponse.json({ error: 'Nota é obrigatória para ajuste manual' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Determine points
  const points = customPoints !== undefined
    ? customPoints
    : getDefaultPoints(event_type as ScoreEventType);

  // Insert score event
  await admin.from('lead_score_events').insert({
    lead_id: id,
    event_type,
    points,
    note: note || null,
    created_by: user.id,
  });

  // Recalculate total score
  const { data: allEvents } = await admin
    .from('lead_score_events')
    .select('event_type, points')
    .eq('lead_id', id);

  const { score, band } = calculateTotalScore(allEvents || []);

  // Update lead
  await admin
    .from('leads')
    .update({ score, score_band: band })
    .eq('id', id);

  // Audit
  await auditScoreChange(id, user.id, event_type, points, score);

  return NextResponse.json({ score, score_band: band, points_added: points });
}
