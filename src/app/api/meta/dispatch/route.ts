import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { dispatchMetaEvent } from '@/lib/services/dispatch-service';
import { DUAL_CONFIRM_EVENTS } from '@/lib/utils/constants';
import { extractClientIp, generateFbp } from '@/lib/meta/param-builder';
import type { ActionSource, MessagingChannel } from '@/types/database';

/**
 * POST /api/meta/dispatch — Send a CAPI event for a lead.
 *
 * EMQ Optimization Strategy:
 * - Auto-injects IP/UA from the admin's request as fallback (better than nothing)
 * - In test mode, generates simulated fbc/fbp if lead has none (for test coverage verification)
 * - Accepts event_time_override for delayed conversions (Purchase reported hours/days later)
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Permission check: only admin can dispatch Meta events
  const admin = createAdminClient();
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbUser?.role !== 'admin') {
    return NextResponse.json({
      error: 'Permissão negada. Apenas administradores podem enviar eventos Meta.',
    }, { status: 403 });
  }

  const body = await request.json();
  const {
    lead_id,
    event_name,
    action_source = 'website',
    messaging_channel,
    event_source_url,
    custom_data,
    confirmation_text,
    override_idempotency,
    event_time_override,
  } = body;

  if (!lead_id || !event_name) {
    return NextResponse.json({ error: 'lead_id e event_name são obrigatórios' }, { status: 400 });
  }

  // Dual confirmation check for QualifiedLead and Purchase
  if (DUAL_CONFIRM_EVENTS.includes(event_name)) {
    if (confirmation_text !== 'CONFIRMAR') {
      return NextResponse.json({
        error: 'Confirmação obrigatória. Digite "CONFIRMAR" para prosseguir.',
        requires_confirmation: true,
        confirmation_text_required: 'CONFIRMAR',
      }, { status: 400 });
    }
  }

  // Fetch lead, signals and global settings
  // (admin client already created above for role check)
  const [leadResult, signalsResult, settingsResult] = await Promise.all([
    admin.from('leads').select('*').eq('id', lead_id).single(),
    admin.from('lead_identity_signals').select('*').eq('lead_id', lead_id),
    admin.from('business_settings').select('value').eq('key', 'test_mode_enabled').single(),
  ]);

  const is_test = settingsResult.data?.value === 'true' || settingsResult.data?.value === true;

  if (!leadResult.data) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  }

  let signals = signalsResult.data || [];
  const lead = leadResult.data;

  // ---- EMQ Boost: Auto-inject & refresh signals for maximum match quality ----

  // Helper: upsert a signal — marks old ones as not current, inserts fresh one
  const upsertSignal = async (type: string, value: string, source: string) => {
    // Mark any existing signals of this type as not current
    await admin.from('lead_identity_signals')
      .update({ is_current: false })
      .eq('lead_id', lead_id)
      .eq('signal_type', type);
    // Insert fresh signal
    await admin.from('lead_identity_signals').insert({
      lead_id, signal_type: type, signal_value: value, source, is_current: true,
    });
    // Update local array: mark old as not current, add new
    signals = signals.map(s =>
      s.signal_type === type ? { ...s, is_current: false } : s
    );
    signals.push({ id: '', lead_id, signal_type: type, signal_value: value, source, is_current: true, collected_at: new Date().toISOString() } as any);
  };

  // Helper: add a signal only if it doesn't already exist as current
  const addSignalIfMissing = async (type: string, value: string, source: string) => {
    if (!signals.find(s => s.signal_type === type && s.is_current)) {
      await admin.from('lead_identity_signals').insert({
        lead_id, signal_type: type, signal_value: value, source, is_current: true,
      });
      signals.push({ id: '', lead_id, signal_type: type, signal_value: value, source, is_current: true, collected_at: new Date().toISOString() } as any);
    }
  };

  // 1. external_id — always available from lead UUID
  await addSignalIfMissing('external_id', lead_id, 'system');

  // 2. fn/ln — extract from lead name if missing
  if (lead.name) {
    const parts = lead.name.trim().split(/\s+/);
    if (parts[0]) {
      await addSignalIfMissing('fn', parts[0], 'system');
    }
    if (parts.length >= 2) {
      await addSignalIfMissing('ln', parts.slice(1).join(' '), 'system');
    }
  }

  // 3. IP & UA — ALWAYS refresh with the current request values
  //    These change over time and the original capture values are stale.
  //    Even the admin's IP/UA is better than nothing for Meta matching.
  const freshIp = extractClientIp(request.headers);
  if (freshIp) {
    await upsertSignal('client_ip_address', freshIp, 'admin_fallback');
  }

  const freshUa = request.headers.get('user-agent');
  if (freshUa) {
    await upsertSignal('client_user_agent', freshUa, 'admin_fallback');
  }

  // 4. country — default 'br' for Brazilian leads (cheap EMQ boost)
  await addSignalIfMissing('country', 'br', 'system');

  // 5. phone — fallback from lead record if not in signals
  if (lead.phone && !signals.find(s => s.signal_type === 'phone' && s.is_current)) {
    await addSignalIfMissing('phone', lead.phone, 'system');
  }

  // 6. In TEST MODE: generate simulated fbc/fbp so test events show full EMQ coverage
  if (is_test) {
    if (!signals.find(s => s.signal_type === 'fbp')) {
      const testFbp = generateFbp();
      await admin.from('lead_identity_signals').insert({ lead_id, signal_type: 'fbp', signal_value: testFbp, source: 'test_simulation', is_current: true });
      signals = [...signals, { id: '', lead_id, signal_type: 'fbp', signal_value: testFbp, source: 'test_simulation', is_current: true, created_at: new Date().toISOString() } as any];
    }
    if (!signals.find(s => s.signal_type === 'fbc')) {
      const testFbc = `fb.1.${Date.now()}.test_fbclid_${lead_id.split('-')[0]}`;
      await admin.from('lead_identity_signals').insert({ lead_id, signal_type: 'fbc', signal_value: testFbc, source: 'test_simulation', is_current: true });
      signals = [...signals, { id: '', lead_id, signal_type: 'fbc', signal_value: testFbc, source: 'test_simulation', is_current: true, created_at: new Date().toISOString() } as any];
    }
  }

  // Dispatch
  const result = await dispatchMetaEvent({
    lead: leadResult.data,
    signals,
    eventName: event_name,
    actionSource: action_source as ActionSource,
    messagingChannel: messaging_channel as MessagingChannel | undefined,
    eventSourceUrl: event_source_url,
    customData: custom_data,
    actorId: user.id,
    isTest: is_test,
    overrideIdempotency: override_idempotency,
    confirmedAt: DUAL_CONFIRM_EVENTS.includes(event_name)
      ? new Date().toISOString()
      : undefined,
    eventTimeOverride: event_time_override,
  });

  if (!result.success) {
    return NextResponse.json({
      error: result.error,
      dispatch_id: result.dispatchId,
      match_strength: result.payloadResult.matchStrength,
      warnings: result.payloadResult.warnings,
      signals_used: result.payloadResult.signalsUsed,
      signals_missing: result.payloadResult.signalsMissing,
    }, { status: result.responseStatus === 0 ? 500 : result.responseStatus });
  }

  // Sync CRM stage with manual dispatch to reflect on Dashboard
  if (result.success) {
    let newStage = null;
    if (event_name === 'Purchase') newStage = 'purchase';
    if (event_name === 'QualifiedLead') newStage = 'qualified';
    if (event_name === 'Schedule') newStage = 'scheduled';

    if (newStage) {
      await admin.from('leads').update({ stage: newStage }).eq('id', lead_id);
    }
  }

  return NextResponse.json({
    success: true,
    dispatch_id: result.dispatchId,
    match_strength: result.payloadResult.matchStrength,
    signals_used: result.payloadResult.signalsUsed,
    signals_missing: result.payloadResult.signalsMissing,
    warnings: result.payloadResult.warnings,
    response_status: result.responseStatus,
  });
}
