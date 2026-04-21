import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { dispatchMetaEvent } from '@/lib/services/dispatch-service';
import { DUAL_CONFIRM_EVENTS } from '@/lib/utils/constants';
import type { ActionSource, MessagingChannel } from '@/types/database';

/**
 * POST /api/meta/dispatch — Send a CAPI event for a lead
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

  // Removed the rigid production guard for Purchase, as this route is used for manual dashboard dispatches.
  // The system will automatically upgrade the Lead to 'purchase' upon successful dispatch.

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

  // Dispatch
  const result = await dispatchMetaEvent({
    lead: leadResult.data,
    signals: signalsResult.data || [],
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
