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
  const admin = createAdminClient();
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

  // ---- EMQ Boost: Auto-inject missing signals ----

  // 1. If lead has no external_id signal, add one from UUID (always available)
  if (!signals.find(s => s.signal_type === 'external_id')) {
    await admin.from('lead_identity_signals').insert({
      lead_id: lead_id,
      signal_type: 'external_id',
      signal_value: lead_id,
      source: 'system',
      is_current: true,
    });
    signals = [...signals, { id: '', lead_id, signal_type: 'external_id', signal_value: lead_id, source: 'system', is_current: true, created_at: new Date().toISOString() } as any];
  }

  // 2. If lead has no fn/ln but has a name, extract them
  const lead = leadResult.data;
  if (lead.name && !signals.find(s => s.signal_type === 'fn')) {
    const parts = lead.name.trim().split(/\s+/);
    const newSignals = [];
    if (parts[0]) newSignals.push({ lead_id, signal_type: 'fn', signal_value: parts[0], source: 'system', is_current: true });
    if (parts.length >= 2) newSignals.push({ lead_id, signal_type: 'ln', signal_value: parts.slice(1).join(' '), source: 'system', is_current: true });
    if (newSignals.length > 0) {
      await admin.from('lead_identity_signals').insert(newSignals);
      signals = [...signals, ...newSignals.map(s => ({ ...s, id: '', created_at: new Date().toISOString() }) as any)];
    }
  }

  // 3. If lead has no IP/UA, use the admin's request values as fallback
  if (!signals.find(s => s.signal_type === 'client_ip_address')) {
    const ip = extractClientIp(request.headers);
    if (ip) {
      await admin.from('lead_identity_signals').insert({ lead_id, signal_type: 'client_ip_address', signal_value: ip, source: 'admin_fallback', is_current: true });
      signals = [...signals, { id: '', lead_id, signal_type: 'client_ip_address', signal_value: ip, source: 'admin_fallback', is_current: true, created_at: new Date().toISOString() } as any];
    }
  }

  if (!signals.find(s => s.signal_type === 'client_user_agent')) {
    const ua = request.headers.get('user-agent');
    if (ua) {
      await admin.from('lead_identity_signals').insert({ lead_id, signal_type: 'client_user_agent', signal_value: ua, source: 'admin_fallback', is_current: true });
      signals = [...signals, { id: '', lead_id, signal_type: 'client_user_agent', signal_value: ua, source: 'admin_fallback', is_current: true, created_at: new Date().toISOString() } as any];
    }
  }

  // 4. In TEST MODE: generate simulated fbc/fbp so test events show full EMQ coverage
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
