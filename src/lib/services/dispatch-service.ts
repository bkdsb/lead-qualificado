import { createAdminClient } from '@/lib/supabase/admin';
import { buildMetaPayload, sanitizePayloadForLog } from '@/lib/meta/payload-builder';
import { sendEventsToMeta } from '@/lib/meta/capi-client';
import { getServerEnv } from '@/lib/config/env';
import { auditDispatch } from './audit-service';
import type { DbLead, DbLeadIdentitySignal, ActionSource, MessagingChannel, DispatchStatus } from '@/types/database';
import type { PayloadBuildResult } from '@/lib/meta/types';

interface DispatchOptions {
  lead: DbLead;
  signals: DbLeadIdentitySignal[];
  eventName: string;
  actionSource: ActionSource;
  messagingChannel?: MessagingChannel;
  eventSourceUrl?: string;
  customData?: { value?: number; currency?: string };
  actorId: string;
  isTest: boolean;
  confirmedAt?: string;
  overrideIdempotency?: boolean;
  /** Unix timestamp (seconds) for the actual event time. Use for delayed events (e.g. Purchase reported later). */
  eventTimeOverride?: number;
}

interface DispatchResult {
  success: boolean;
  dispatchId: string;
  payloadResult: PayloadBuildResult;
  responseStatus: number;
  responseBody: Record<string, unknown>;
  error?: string;
}

/**
 * Dispatch a Meta CAPI event for a lead.
 *
 * Flow:
 * 1. Check idempotency (lead_id + event_name + environment no prior success)
 * 2. Build payload
 * 3. Record pending dispatch
 * 4. Send to Meta
 * 5. Update dispatch with response
 * 6. Update lead sync status
 * 7. Audit log
 */
export async function dispatchMetaEvent(options: DispatchOptions): Promise<DispatchResult> {
  const supabase = createAdminClient();
  const env = getServerEnv();

  const environment = options.isTest ? 'test' : 'production';
  const testEventCode = options.isTest ? env.META_TEST_EVENT_CODE : undefined;

  // 1. Idempotency check — block if same event already succeeded for this lead+env
  if (!options.overrideIdempotency) {
    const { data: existing } = await supabase
      .from('meta_event_dispatches')
      .select('id')
      .eq('lead_id', options.lead.id)
      .eq('event_name', options.eventName)
      .eq('environment', environment)
      .eq('status', 'success')
      .limit(1);

    if (existing && existing.length > 0) {
      return {
        success: false,
        dispatchId: existing[0].id,
        payloadResult: {
          payload: { data: [] },
          signalsUsed: [],
          signalsMissing: [],
          matchStrength: 'very_low',
          warnings: [],
        },
        responseStatus: 0,
        responseBody: {},
        error: `Evento ${options.eventName} já enviado com sucesso para este lead neste ambiente. Use override para reenviar.`,
      };
    }
  }

  // 2. Build payload
  const payloadResult = buildMetaPayload({
    lead: options.lead,
    signals: options.signals,
    eventName: options.eventName,
    actionSource: options.actionSource,
    messagingChannel: options.messagingChannel,
    eventSourceUrl: options.eventSourceUrl,
    testEventCode: testEventCode || undefined,
    customData: options.customData,
    eventTimeOverride: options.eventTimeOverride,
  });

  // 3. Record pending dispatch
  const eventData = payloadResult.payload.data[0];
  const { data: dispatch, error: insertError } = await supabase
    .from('meta_event_dispatches')
    .insert({
      lead_id: options.lead.id,
      event_name: options.eventName,
      event_id: eventData.event_id,
      event_time: eventData.event_time,
      action_source: options.actionSource,
      messaging_channel: options.messagingChannel || null,
      environment,
      test_event_code: testEventCode || null,
      payload_sent: sanitizePayloadForLog(payloadResult.payload),
      payload_raw_signals: {
        signals_used: payloadResult.signalsUsed,
        signals_missing: payloadResult.signalsMissing,
        warnings: payloadResult.warnings,
      },
      match_strength_at_send: payloadResult.matchStrength,
      status: 'pending' as DispatchStatus,
      dispatched_by: options.actorId,
      confirmed_at: options.confirmedAt || null,
    })
    .select()
    .single();

  if (insertError || !dispatch) {
    return {
      success: false,
      dispatchId: '',
      payloadResult,
      responseStatus: 0,
      responseBody: {},
      error: `Failed to record dispatch: ${insertError?.message}`,
    };
  }

  // 4. Send to Meta
  const metaResult = await sendEventsToMeta(payloadResult.payload);

  // 5. Update dispatch with response
  const newStatus: DispatchStatus = metaResult.success ? 'success' : 'failed';
  await supabase
    .from('meta_event_dispatches')
    .update({
      response_status: metaResult.status,
      response_body: metaResult.response as unknown as Record<string, unknown>,
      error_message: metaResult.response.error?.message || null,
      status: newStatus,
    })
    .eq('id', dispatch.id);

  // 6. Update lead sync status
  await supabase
    .from('leads')
    .update({
      meta_sync_status: metaResult.success ? 'synced' : 'error',
      environment,
    })
    .eq('id', options.lead.id);

  // 7. Audit
  await auditDispatch(
    dispatch.id,
    options.lead.id,
    options.actorId,
    options.eventName,
    environment,
    metaResult.success
  );

  return {
    success: metaResult.success,
    dispatchId: dispatch.id,
    payloadResult,
    responseStatus: metaResult.status,
    responseBody: metaResult.response as unknown as Record<string, unknown>,
    error: metaResult.response.error?.message,
  };
}

/**
 * Preview a payload without sending — for the preview modal.
 */
export async function previewPayload(options: Omit<DispatchOptions, 'actorId' | 'isTest' | 'confirmedAt'> & { isTest: boolean }): Promise<PayloadBuildResult> {
  const env = getServerEnv();
  const testEventCode = options.isTest ? env.META_TEST_EVENT_CODE : undefined;

  return buildMetaPayload({
    lead: options.lead,
    signals: options.signals,
    eventName: options.eventName,
    actionSource: options.actionSource,
    messagingChannel: options.messagingChannel,
    eventSourceUrl: options.eventSourceUrl,
    testEventCode,
    customData: options.customData,
  });
}
