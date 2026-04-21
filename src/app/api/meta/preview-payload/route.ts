import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { previewPayload } from '@/lib/services/dispatch-service';
import type { ActionSource, MessagingChannel } from '@/types/database';

/**
 * POST /api/meta/preview-payload — Preview CAPI payload without sending
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { lead_id, event_name, action_source = 'website', messaging_channel, event_source_url, custom_data } = body;

  if (!lead_id || !event_name) {
    return NextResponse.json({ error: 'lead_id e event_name são obrigatórios' }, { status: 400 });
  }

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

  const result = await previewPayload({
    lead: leadResult.data,
    signals: signalsResult.data || [],
    eventName: event_name,
    actionSource: action_source as ActionSource,
    messagingChannel: messaging_channel as MessagingChannel | undefined,
    eventSourceUrl: event_source_url,
    customData: custom_data,
    isTest: is_test,
  });

  return NextResponse.json({
    payload: result.payload,
    signals_used: result.signalsUsed,
    signals_missing: result.signalsMissing,
    match_strength: result.matchStrength,
    warnings: result.warnings,
  });
}
