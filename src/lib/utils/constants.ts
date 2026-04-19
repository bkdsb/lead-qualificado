import { LeadStage, ScoreBand, ScoreEventType, MatchStrength } from '@/types/database';

/** Valid stage transitions */
export const STAGE_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  new: ['contacted', 'lost'],
  contacted: ['conversing', 'lost'],
  conversing: ['proposal', 'qualified', 'lost'],
  proposal: ['qualified', 'lost'],
  qualified: ['purchase', 'lost'],
  purchase: [],
  lost: ['new'], // allow reactivation
};

/** Default score points per event type */
export const DEFAULT_SCORE_POINTS: Record<ScoreEventType, number> = {
  lp_visit: 2,
  cta_click: 10,
  conversation_started: 20,
  qualification_answered: 30,
  proposal_sent: 50,
  qualified: 70,
  purchase: 100,
  no_response: -10,
  curious_no_fit: -15,
  no_budget: -20,
  manual_adjust: 0,
};

/** Score band thresholds */
export const SCORE_BANDS: { band: ScoreBand; min: number; max: number }[] = [
  { band: 'cold', min: -999, max: 19 },
  { band: 'warm', min: 20, max: 49 },
  { band: 'hot', min: 50, max: 79 },
  { band: 'ready', min: 80, max: 9999 },
];

/** Stage display labels */
export const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  conversing: 'Conversando',
  proposal: 'Proposta',
  qualified: 'Qualificado',
  purchase: 'Comprou',
  lost: 'Perdido',
};

/** Score band display labels */
export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
  ready: 'Pronto',
};

/** Match strength display labels */
export const MATCH_STRENGTH_LABELS: Record<MatchStrength, string> = {
  very_low: 'Muito Baixo',
  low: 'Baixo',
  medium: 'Médio',
  good: 'Bom',
  strong: 'Forte',
};

/** Match strength numeric values for comparison */
export const MATCH_STRENGTH_VALUES: Record<MatchStrength, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  good: 4,
  strong: 5,
};

/** Meta CAPI event names we support */
export const META_EVENT_NAMES = ['Lead', 'QualifiedLead', 'Purchase', 'Schedule'] as const;
export type MetaEventName = (typeof META_EVENT_NAMES)[number];

/** Events that require dual confirmation */
export const DUAL_CONFIRM_EVENTS: MetaEventName[] = ['QualifiedLead', 'Purchase'];

/** Stage to badge color mapping */
export const STAGE_COLORS: Record<LeadStage, string> = {
  new: '#3b82f6',
  contacted: '#6366f1',
  conversing: '#8b5cf6',
  proposal: '#eab308',
  qualified: '#22c55e',
  purchase: '#10b981',
  lost: '#ef4444',
};

/** Score band to badge color mapping */
export const SCORE_BAND_COLORS: Record<ScoreBand, string> = {
  cold: '#64748b',
  warm: '#eab308',
  hot: '#f97316',
  ready: '#22c55e',
};

/** Match strength to badge color mapping */
export const MATCH_STRENGTH_COLORS: Record<MatchStrength, string> = {
  very_low: '#ef4444',
  low: '#f97316',
  medium: '#eab308',
  good: '#22c55e',
  strong: '#10b981',
};

/** Signals that should be hashed before sending to Meta */
export const HASHABLE_SIGNALS = ['email', 'phone', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'db', 'ge'] as const;

/** Signals that must NOT be hashed */
export const UNHASHABLE_SIGNALS = ['fbc', 'fbp', 'ctwa_clid', 'external_id', 'client_ip_address', 'client_user_agent'] as const;
