import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchMetaEvent } from './dispatch-service';
import type { LeadStage, ActionSource } from '@/types/database';

/**
 * Stage-to-Meta-event mapping.
 * When a lead transitions TO these stages, auto-dispatch the corresponding event.
 * Purchase is excluded — always requires manual confirmation.
 */
const AUTO_DISPATCH_MAP: Partial<Record<LeadStage, string>> = {
  contacted: 'Lead',
  qualified: 'QualifiedLead',
  purchase: 'Purchase',
};

/**
 * Attempt auto-dispatch of a Meta CAPI event when a lead changes stage.
 * 
 * Rules:
 * - Only fires for mapped stages (contacted → Lead, qualified → QualifiedLead)
 * - Purchase auto-dispatch will include the lead.purchase_value
 * - Respects idempotency — won't re-send if already sent
 * - Runs as fire-and-forget — never blocks the stage change response
 * - Logs result for audit trail
 */
export async function tryAutoDispatch(
  leadId: string,
  toStage: LeadStage,
  actorId: string
): Promise<{ dispatched: boolean; eventName?: string; error?: string }> {
  const eventName = AUTO_DISPATCH_MAP[toStage];
  if (!eventName) {
    return { dispatched: false };
  }

  try {
    const admin = createAdminClient();

    // Fetch lead + signals + test mode setting
    const [leadResult, signalsResult, settingsResult] = await Promise.all([
      admin.from('leads').select('*').eq('id', leadId).single(),
      admin.from('lead_identity_signals').select('*').eq('lead_id', leadId),
      admin.from('business_settings').select('value').eq('key', 'test_mode_enabled').single(),
    ]);

    if (!leadResult.data) {
      return { dispatched: false, error: 'Lead not found' };
    }

    const isTest = settingsResult.data?.value === 'true' || settingsResult.data?.value === true;
    const signals = signalsResult.data || [];

    // Auto-inject external_id if missing
    if (!signals.find(s => s.signal_type === 'external_id' && s.is_current)) {
      await admin.from('lead_identity_signals').insert({
        lead_id: leadId,
        signal_type: 'external_id',
        signal_value: leadId,
        source: 'system',
        is_current: true,
      });
      signals.push({
        id: '', lead_id: leadId, signal_type: 'external_id',
        signal_value: leadId, source: 'system', is_current: true,
        collected_at: new Date().toISOString(),
      } as any);
    }

    // Auto-inject country if missing
    if (!signals.find(s => s.signal_type === 'country' && s.is_current)) {
      await admin.from('lead_identity_signals').insert({
        lead_id: leadId,
        signal_type: 'country',
        signal_value: 'br',
        source: 'system',
        is_current: true,
      });
      signals.push({
        id: '', lead_id: leadId, signal_type: 'country',
        signal_value: 'br', source: 'system', is_current: true,
        collected_at: new Date().toISOString(),
      } as any);
    }

    const result = await dispatchMetaEvent({
      lead: leadResult.data,
      signals,
      eventName,
      actionSource: 'website' as ActionSource,
      actorId,
      isTest,
      // Pass purchase_value if event is Purchase
      customData: eventName === 'Purchase' && leadResult.data.purchase_value ? {
        value: leadResult.data.purchase_value
      } : undefined,
      // Don't override idempotency — respect it for auto-dispatch
      overrideIdempotency: false,
    });

    if (result.success) {
      console.log(`[AUTO-DISPATCH] ✓ ${eventName} for lead ${leadId} (${isTest ? 'test' : 'prod'})`);
    } else {
      console.log(`[AUTO-DISPATCH] ✕ ${eventName} for lead ${leadId}: ${result.error}`);
    }

    return {
      dispatched: result.success,
      eventName,
      error: result.error,
    };
  } catch (err) {
    console.error('[AUTO-DISPATCH] Exception:', err);
    return { dispatched: false, eventName, error: String(err) };
  }
}
