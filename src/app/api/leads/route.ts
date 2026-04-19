import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { calculateTotalScore, calculateScoreBand } from '@/lib/engines/score-engine';
import { evaluateMatchStrength } from '@/lib/engines/match-strength';

/**
 * GET /api/leads — List leads with filters and pagination
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const stage = searchParams.get('stage');
  const scoreBand = searchParams.get('score_band');
  const matchStrength = searchParams.get('match_strength');
  const source = searchParams.get('source');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  const offset = (page - 1) * limit;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' });

  if (stage) query = query.eq('stage', stage);
  if (scoreBand) query = query.eq('score_band', scoreBand);
  if (matchStrength) query = query.eq('match_strength', matchStrength);
  if (source) query = query.eq('source', source);
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const validSortColumns = ['created_at', 'score', 'last_contact_at', 'name', 'stage'];
  const col = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

  query = query
    .order(col, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: data,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

/**
 * POST /api/leads — Create a new lead
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, email, phone, source, campaign_name, adset_name, ad_name, signals } = body;

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create lead
  const { data: lead, error } = await admin
    .from('leads')
    .insert({
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      source: source || 'manual',
      campaign_name: campaign_name || null,
      adset_name: adset_name || null,
      ad_name: ad_name || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: error?.message || 'Failed to create lead' }, { status: 500 });
  }

  // Insert identity signals if provided
  if (signals && Array.isArray(signals)) {
    const signalRows = signals
      .filter((s: { type: string; value: string }) => s.type && s.value)
      .map((s: { type: string; value: string; source?: string }) => ({
        lead_id: lead.id,
        signal_type: s.type,
        signal_value: s.value,
        source: s.source || 'manual',
        is_current: true,
      }));

    if (signalRows.length > 0) {
      await admin.from('lead_identity_signals').insert(signalRows);
    }

    // Recalculate match strength
    const { data: allSignals } = await admin
      .from('lead_identity_signals')
      .select('*')
      .eq('lead_id', lead.id);

    if (allSignals) {
      const matchResult = evaluateMatchStrength(allSignals);
      await admin
        .from('leads')
        .update({ match_strength: matchResult.strength })
        .eq('id', lead.id);
    }
  }

  // Auto-add email/phone as identity signals
  if (email) {
    await admin.from('lead_identity_signals').upsert({
      lead_id: lead.id,
      signal_type: 'email',
      signal_value: email.trim(),
      source: 'manual',
      is_current: true,
    }, { onConflict: 'lead_id,signal_type,signal_value' });
  }
  if (phone) {
    await admin.from('lead_identity_signals').upsert({
      lead_id: lead.id,
      signal_type: 'phone',
      signal_value: phone.trim(),
      source: 'manual',
      is_current: true,
    }, { onConflict: 'lead_id,signal_type,signal_value' });
  }

  // Record initial stage
  await admin.from('lead_stage_history').insert({
    lead_id: lead.id,
    from_stage: null,
    to_stage: 'new',
    changed_by: user.id,
    reason: 'Lead criado',
  });

  // Audit
  await admin.from('audit_logs').insert({
    entity_type: 'lead',
    entity_id: lead.id,
    action: 'create',
    actor_id: user.id,
    details: { name, email, phone, source },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
