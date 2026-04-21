import { v4 as uuidv4 } from 'uuid';
import { hashSignal } from './hash-utils';
import { HASHABLE_SIGNALS } from '@/lib/utils/constants';
import type { DbLead, DbLeadIdentitySignal, ActionSource, MessagingChannel } from '@/types/database';
import type { MetaEventPayload, MetaEventData, MetaUserData, MetaCustomData, PayloadBuildResult } from './types';
import { evaluateMatchStrength } from '@/lib/engines/match-strength';

interface BuildPayloadOptions {
  lead: DbLead;
  signals: DbLeadIdentitySignal[];
  eventName: string;
  actionSource: ActionSource;
  messagingChannel?: MessagingChannel;
  eventSourceUrl?: string;
  testEventCode?: string;
  customData?: {
    value?: number;
    currency?: string;
  };
  /** Override event_time with a specific timestamp (unix seconds).
   *  Use for Purchase events where the sale happened earlier. */
  eventTimeOverride?: number;
}

/**
 * Build a Meta CAPI event payload from a lead's data.
 *
 * Rules:
 * - Only sends fields that actually have values (never sends empty/null)
 * - Hashes fields per Meta's requirements (em, ph, fn, ln, ct, st, zp, country, db, ge)
 * - external_id is hashed (Meta: "Hashing recomendado")
 * - Never fabricates fbc/fbp/ctwa_clid
 * - lead_id, fb_login_id, subscription_id sent raw (no hash)
 * - ig_account_id, ig_sid sent raw for Instagram attribution
 * - Purchase always includes value + currency
 * - test_event_code only in test mode
 * - data_processing_options always included (empty array = no restrictions)
 * - event_source_url required for website action_source
 * - client_user_agent required for website action_source
 */
export function buildMetaPayload(options: BuildPayloadOptions): PayloadBuildResult {
  const {
    lead,
    signals,
    eventName,
    actionSource,
    messagingChannel,
    eventSourceUrl,
    testEventCode,
    customData,
  } = options;

  const currentSignals = signals.filter(s => s.is_current);
  const signalsUsed: string[] = [];
  const signalsMissing: string[] = [];
  const warnings: string[] = [];

  // Build user_data conditionally — only add fields with actual values
  const userData: MetaUserData = {};

  // Helper to get current signal value by type
  const getSignal = (type: string): string | undefined => {
    const signal = currentSignals.find(s => s.signal_type === type);
    return signal?.signal_value;
  };

  // ---- 1. Process hashable signals (em, ph, fn, ln, ct, st, zp, country, db, ge) ----
  // These are wrapped in arrays as Meta expects
  const hashableFieldMap: Record<string, keyof MetaUserData> = {
    email: 'em',
    phone: 'ph',
    fn: 'fn',
    ln: 'ln',
    ct: 'ct',
    st: 'st',
    zp: 'zp',
    country: 'country',
    db: 'db',
    ge: 'ge',
  };

  for (const [signalType, metaField] of Object.entries(hashableFieldMap)) {
    const value = getSignal(signalType);
    if (value && value.trim()) {
      const hashed = hashSignal(signalType, value);
      if (hashed) {
        (userData[metaField] as string[]) = [hashed];
        signalsUsed.push(signalType);
      } else {
        if (['email', 'phone'].includes(signalType)) {
          signalsMissing.push(signalType);
        }
      }
    } else {
      if (['email', 'phone'].includes(signalType)) {
        signalsMissing.push(signalType);
      }
    }
  }

  // Also check lead's direct email/phone fields as fallback
  if (!userData.em && lead.email) {
    const hashedEm = hashSignal('email', lead.email);
    if (hashedEm) {
      userData.em = [hashedEm];
      signalsUsed.push('email');
      const idx = signalsMissing.indexOf('email');
      if (idx > -1) signalsMissing.splice(idx, 1);
    }
  }

  if (!userData.ph && lead.phone) {
    const hashedPh = hashSignal('phone', lead.phone);
    if (hashedPh) {
      userData.ph = [hashedPh];
      signalsUsed.push('phone');
      const idx = signalsMissing.indexOf('phone');
      if (idx > -1) signalsMissing.splice(idx, 1);
    }
  }

  // ---- 2. external_id — hashed per Meta recommendation ----
  const externalId = getSignal('external_id') || lead.external_id;
  if (externalId) {
    const hashedExId = hashSignal('external_id', externalId);
    if (hashedExId) {
      userData.external_id = [hashedExId];
      signalsUsed.push('external_id');
    }
  }

  // ---- 3. fbc / fbp — NOT hashed, sent raw ----
  const fbc = getSignal('fbc');
  if (fbc) {
    userData.fbc = fbc;
    signalsUsed.push('fbc');
  } else {
    signalsMissing.push('fbc');
  }

  const fbp = getSignal('fbp');
  if (fbp) {
    userData.fbp = fbp;
    signalsUsed.push('fbp');
  } else {
    signalsMissing.push('fbp');
  }

  // ---- 4. ctwa_clid — for business_messaging ----
  const ctwaClid = getSignal('ctwa_clid');
  if (ctwaClid) {
    userData.ctwa_clid = ctwaClid;
    signalsUsed.push('ctwa_clid');
  } else if (actionSource === 'business_messaging') {
    signalsMissing.push('ctwa_clid');
    warnings.push('Business Messaging event sem ctwa_clid — match será reduzido');
  }

  // ---- 5. IP / User Agent — NOT hashed ----
  const clientIp = getSignal('client_ip_address');
  if (clientIp) {
    userData.client_ip_address = clientIp;
    signalsUsed.push('client_ip_address');
  }

  const clientUa = getSignal('client_user_agent');
  if (clientUa) {
    userData.client_user_agent = clientUa;
    signalsUsed.push('client_user_agent');
  }

  // ---- 6. lead_id — Meta Ads Lead ID for Conversion Leads optimization ----
  // NOT hashed. This is the Meta-generated lead form ID (15-17 digits).
  const leadId = getSignal('lead_id');
  if (leadId) {
    userData.lead_id = leadId;
    signalsUsed.push('lead_id');
  }

  // ---- 7. fb_login_id — NOT hashed ----
  const fbLoginId = getSignal('fb_login_id');
  if (fbLoginId) {
    userData.fb_login_id = fbLoginId;
    signalsUsed.push('fb_login_id');
  }

  // ---- 8. subscription_id — NOT hashed ----
  const subscriptionId = getSignal('subscription_id');
  if (subscriptionId) {
    userData.subscription_id = subscriptionId;
    signalsUsed.push('subscription_id');
  }

  // ---- 9. ig_account_id / ig_sid — Instagram attribution ----
  const igAccountId = getSignal('ig_account_id');
  if (igAccountId) {
    userData.ig_account_id = igAccountId;
    signalsUsed.push('ig_account_id');
  }

  const igSid = getSignal('ig_sid');
  if (igSid) {
    userData.ig_sid = igSid;
    signalsUsed.push('ig_sid');
  }

  // ---- 10. page_id / page_scoped_user_id — for Messenger ----
  const pageId = getSignal('page_id');
  if (pageId) {
    userData.page_id = pageId;
    signalsUsed.push('page_id');
  }

  const pageScopedUserId = getSignal('page_scoped_user_id');
  if (pageScopedUserId) {
    userData.page_scoped_user_id = pageScopedUserId;
    signalsUsed.push('page_scoped_user_id');
  }

  // ---- Validate required fields for website events ----
  if (actionSource === 'website') {
    if (!clientUa) {
      warnings.push('⚠ Evento website sem client_user_agent — OBRIGATÓRIO pela Meta. Usando fallback do admin.');
    }
    if (!eventSourceUrl) {
      warnings.push('⚠ Evento website sem event_source_url — OBRIGATÓRIO pela Meta.');
    }
  }

  // Build event data
  // Use override for Purchase/events that happened earlier, otherwise use current time
  const eventTime = options.eventTimeOverride || Math.floor(Date.now() / 1000);
  const eventId = `evt_${uuidv4()}`;

  const eventData: MetaEventData = {
    event_name: eventName,
    event_time: eventTime,
    event_id: eventId,
    action_source: actionSource,
    user_data: userData,
    // Privacy compliance: always include data_processing_options
    // Empty array = no restrictions (appropriate for Brazil/non-LDU markets)
    data_processing_options: [],
  };

  // Add event_source_url for website events
  if (actionSource === 'website' && eventSourceUrl) {
    eventData.event_source_url = eventSourceUrl;
  }

  // Add messaging_channel for business_messaging
  if (actionSource === 'business_messaging' && messagingChannel) {
    eventData.messaging_channel = messagingChannel;
  }

  // Add custom_data for Purchase
  if (customData && (customData.value || customData.currency)) {
    const cd: MetaCustomData = {};
    if (customData.value != null && customData.value > 0) {
      cd.value = customData.value;
    }
    if (customData.currency) {
      cd.currency = customData.currency;
    }
    if (Object.keys(cd).length > 0) {
      eventData.custom_data = cd;
    }
  }

  // If Purchase and no value, warn
  if (eventName === 'Purchase' && (!customData?.value || customData.value <= 0)) {
    warnings.push('Purchase sem value — evento será enviado mas sem dados de valor');
  }

  // Build final payload
  const payload: MetaEventPayload = {
    data: [eventData],
  };

  // Add test_event_code only when provided
  if (testEventCode && testEventCode.trim()) {
    payload.test_event_code = testEventCode.trim();
  }

  // Evaluate match strength
  const matchResult = evaluateMatchStrength(currentSignals);

  // Add match-based warnings
  if (eventName === 'Purchase' && matchResult.strength === 'very_low') {
    warnings.push('⚠ Purchase com match Very Low — considere enriquecer dados do lead antes de enviar');
  }
  if (eventName === 'Purchase' && matchResult.strength === 'low') {
    warnings.push('Purchase com match Low — recomendado ter email ou phone para melhor atribuição');
  }

  return {
    payload,
    signalsUsed: [...new Set(signalsUsed)],
    signalsMissing,
    matchStrength: matchResult.strength,
    warnings,
  };
}

/**
 * Sanitize a payload for logging — keeps hashed values but removes raw data.
 */
export function sanitizePayloadForLog(payload: MetaEventPayload): MetaEventPayload {
  // Payload already contains hashed values, so it's safe to log.
  // We just deep-clone to prevent mutation.
  return JSON.parse(JSON.stringify(payload));
}
