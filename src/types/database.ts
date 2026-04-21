/** Stage values for leads */
export type LeadStage = 'new' | 'contacted' | 'conversing' | 'proposal' | 'qualified' | 'purchase' | 'lost';

/** Score band classification */
export type ScoreBand = 'cold' | 'warm' | 'hot' | 'ready';

/** Match strength classification */
export type MatchStrength = 'very_low' | 'low' | 'medium' | 'good' | 'strong';

/** Lead source */
export type LeadSource = 'lp' | 'whatsapp' | 'cta' | 'manual' | 'ad' | 'api';

/** Meta sync status */
export type MetaSyncStatus = 'pending' | 'synced' | 'error' | 'partial' | 'none';

/** Environment */
export type AppEnvironment = 'test' | 'production';

/** Dispatch status */
export type DispatchStatus = 'pending' | 'success' | 'failed' | 'retrying';

/** Action source for Meta events */
export type ActionSource = 'website' | 'business_messaging' | 'other';

/** Messaging channel */
export type MessagingChannel = 'whatsapp' | 'messenger' | 'instagram';

/** Score event types */
export type ScoreEventType =
  | 'lp_visit'
  | 'cta_click'
  | 'conversation_started'
  | 'qualification_answered'
  | 'proposal_sent'
  | 'qualified'
  | 'purchase'
  | 'no_response'
  | 'curious_no_fit'
  | 'no_budget'
  | 'manual_adjust';

/** Identity signal types */
export type SignalType =
  | 'email' | 'phone' | 'fbc' | 'fbp' | 'ctwa_clid'
  | 'external_id' | 'client_ip_address' | 'client_user_agent'
  | 'fn' | 'ln' | 'ct' | 'st' | 'zp' | 'country' | 'db' | 'ge'
  | 'lead_id' | 'fb_login_id' | 'subscription_id'
  | 'ig_account_id' | 'ig_sid' | 'page_id' | 'page_scoped_user_id';

/** Signal source */
export type SignalSource = 'lp' | 'whatsapp' | 'manual' | 'webhook' | 'api';

/** User role */
export type UserRole = 'admin' | 'operator';

/** Audit entity type */
export type AuditEntityType = 'lead' | 'dispatch' | 'setting' | 'system' | 'user';

/** Audit action type */
export type AuditAction =
  | 'create' | 'update' | 'delete' | 'stage_change' | 'score_change'
  | 'dispatch' | 'confirm' | 'override' | 'login' | 'setting_change';

// ---- Row types ----

export interface DbUser {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface DbLead {
  id: string;
  external_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  score: number;
  score_band: ScoreBand;
  match_strength: MatchStrength;
  source: LeadSource;
  campaign_name: string | null;
  adset_name: string | null;
  ad_name: string | null;
  purchase_value: number | null;
  currency: string;
  closed_at: string | null;
  last_contact_at: string | null;
  meta_sync_status: MetaSyncStatus;
  environment: AppEnvironment;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DbLeadContact {
  id: string;
  lead_id: string;
  type: 'email' | 'phone' | 'whatsapp';
  value: string;
  is_primary: boolean;
  created_at: string;
}

export interface DbLeadNote {
  id: string;
  lead_id: string;
  content: string;
  author_id: string | null;
  created_at: string;
}

export interface DbLeadStageHistory {
  id: string;
  lead_id: string;
  from_stage: LeadStage | null;
  to_stage: LeadStage;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface DbLeadScoreEvent {
  id: string;
  lead_id: string;
  event_type: ScoreEventType;
  points: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DbLeadIdentitySignal {
  id: string;
  lead_id: string;
  signal_type: SignalType;
  signal_value: string;
  source: SignalSource;
  collected_at: string;
  is_current: boolean;
}

export interface DbLeadSourceAttribution {
  id: string;
  lead_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  referrer_url: string | null;
  landing_page_url: string | null;
  created_at: string;
}

export interface DbMetaEventDispatch {
  id: string;
  lead_id: string;
  event_name: string;
  event_id: string;
  event_time: number;
  action_source: ActionSource;
  messaging_channel: MessagingChannel | null;
  environment: AppEnvironment;
  test_event_code: string | null;
  payload_sent: Record<string, unknown> | null;
  payload_raw_signals: Record<string, unknown> | null;
  match_strength_at_send: MatchStrength | null;
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  error_message: string | null;
  status: DispatchStatus;
  retry_count: number;
  dispatched_by: string | null;
  dispatched_at: string;
  confirmed_at: string | null;
}

export interface DbDatasetQualitySnapshot {
  id: string;
  dataset_id: string;
  event_name: string;
  composite_score: number | null;
  match_key_coverage: Record<string, unknown> | null;
  event_coverage_pct: number | null;
  data_freshness: string | null;
  acr_percentage: number | null;
  raw_response: Record<string, unknown> | null;
  fetched_at: string;
}

export interface DbAuditLog {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string | null;
  action: AuditAction;
  details: Record<string, unknown> | null;
  actor_id: string | null;
  ip_address: string | null;
  environment: string | null;
  created_at: string;
}

export interface DbSystemSetting {
  id: string;
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}
