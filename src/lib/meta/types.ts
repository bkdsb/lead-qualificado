/** Meta CAPI payload types — matches the Graph API schema */

export interface MetaUserData {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  ct?: string[];
  st?: string[];
  zp?: string[];
  country?: string[];
  db?: string[];
  ge?: string[];
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
  ctwa_clid?: string;
  page_id?: string;
  page_scoped_user_id?: string;
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    delivery_category?: string;
  }>;
}

export interface MetaEventData {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: string;
  event_source_url?: string;
  messaging_channel?: string;
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
  opt_out?: boolean;
}

export interface MetaEventPayload {
  data: MetaEventData[];
  test_event_code?: string;
}

export interface MetaEventResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface DatasetQualityResponse {
  web?: Array<{
    event_name: string;
    event_match_quality?: {
      composite_score: number;
      match_key_feedback?: Array<{
        identifier: string;
        coverage?: { percentage: number };
        potential_aly_acr_increase?: {
          percentage: number;
          description: string;
        };
      }>;
      diagnostics?: Array<{
        name: string;
        description: string;
        solution: string;
        percentage: number;
        affected_event_count: number;
        total_event_count: number;
      }>;
    };
    event_coverage?: {
      percentage: number;
      goal_percentage: number;
      description: string;
    };
    data_freshness?: {
      upload_frequency: string;
      description: string;
    };
    acr?: {
      percentage: number;
      description: string;
    };
  }>;
}

/** Result of building a payload — includes metadata for UI display */
export interface PayloadBuildResult {
  payload: MetaEventPayload;
  signalsUsed: string[];
  signalsMissing: string[];
  matchStrength: string;
  warnings: string[];
}
