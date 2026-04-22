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

/** Meta CAPI event names we support — ordered by funnel priority (lowest → highest) */
export const META_EVENT_NAMES = ['Lead', 'QualifiedLead', 'Schedule', 'Purchase'] as const;
export type MetaEventName = (typeof META_EVENT_NAMES)[number];

/** Events that require dual confirmation */
export const DUAL_CONFIRM_EVENTS: MetaEventName[] = ['QualifiedLead', 'Purchase'];

/**
 * Default values (BRL) per Meta event type.
 *
 * STRATEGY:
 * - Lead, QualifiedLead, Schedule = sinais de dados apenas (sem valor monetário)
 *   Eles ensinam o algoritmo sobre progressão do funil, mas não representam receita.
 * - Purchase = valor REAL da venda (informado por lead, sempre editável)
 *
 * Apenas Purchase alimenta ROAS. Os outros são marcos de qualificação.
 */
export const META_EVENT_DEFAULT_VALUES: Record<MetaEventName, number> = {
  Lead: 0,
  QualifiedLead: 0,
  Schedule: 0,
  Purchase: 0, // Always filled manually with the real deal value
};

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
export const UNHASHABLE_SIGNALS = [
  'fbc', 'fbp', 'ctwa_clid', 'client_ip_address', 'client_user_agent',
  'lead_id', 'fb_login_id', 'subscription_id',
  'ig_account_id', 'ig_sid', 'page_id', 'page_scoped_user_id',
] as const;

/**
 * Signals where hashing is RECOMMENDED by Meta (not required but improves EMQ).
 * external_id falls in this category.
 */
export const HASH_RECOMMENDED_SIGNALS = ['external_id'] as const;

// ---- SERVICE CATALOG ----

/** Service interest categories */
export type ServiceInterest =
  | 'site_remodelagem'
  | 'site_completo'
  | 'trafego_meta'
  | 'trafego_google'
  | 'trafego_combo'
  | 'gestao_midias'
  | 'blog_standard'
  | 'blog_premium'
  | 'outro';

export const SERVICE_LABELS: Record<ServiceInterest, string> = {
  site_remodelagem: 'Site — Remodelagem',
  site_completo: 'Site — Pacote Completo',
  trafego_meta: 'Tráfego — Meta Ads',
  trafego_google: 'Tráfego — Google Ads',
  trafego_combo: 'Tráfego — Meta + Google',
  gestao_midias: 'Gestão de Mídias',
  blog_standard: 'Blog Standard',
  blog_premium: 'Blog Premium (Next + CMS)',
  outro: 'Outro',
};

export const SERVICE_COLORS: Record<ServiceInterest, string> = {
  site_remodelagem: '#8b5cf6',
  site_completo: '#6366f1',
  trafego_meta: '#3b82f6',
  trafego_google: '#22c55e',
  trafego_combo: '#10b981',
  gestao_midias: '#f97316',
  blog_standard: '#eab308',
  blog_premium: '#ec4899',
  outro: '#64748b',
};

/** Pre-configured packages with pricing */
export interface ServicePackage {
  id: string;
  name: string;
  service: ServiceInterest;
  price: number;
  description: string;
  includes: string[];
  payment: string;
}

export const SERVICE_PACKAGES: ServicePackage[] = [
  {
    id: 'site_remod_proprio',
    name: 'Remodelagem (hospedagem própria)',
    service: 'site_remodelagem',
    price: 900,
    description: 'Remodelagem total com chatbot, SEO e código puro',
    includes: [
      'Remodelagem total do site',
      'Chatbot para filtrar clientes',
      'SEO e otimização',
      'Código puro (sem WordPress)',
      '2 revisões completas',
      'Contrato e NF',
    ],
    payment: '12x com juros ou 50% sinal + 50% entrega',
  },
  {
    id: 'site_1ano',
    name: 'Site + 1 ano hospedagem/domínio',
    service: 'site_completo',
    price: 1200,
    description: 'Presença online com 1 ano de tudo incluso',
    includes: [
      '1 ano de domínio',
      '1 ano de hospedagem',
      'Site completo personalizado',
      '2 revisões completas',
      'Contrato e NF',
    ],
    payment: '12x com juros ou 50% sinal + 50% entrega',
  },
  {
    id: 'site_4anos',
    name: 'Site + 4 anos hospedagem/domínio + email',
    service: 'site_completo',
    price: 1600,
    description: 'Pacote completo: 4 anos de hospedagem + domínio + 1 ano email profissional',
    includes: [
      '4 anos de domínio',
      '4 anos de hospedagem',
      '1 ano de email profissional',
      'Site completo personalizado',
      '2 revisões completas',
      'Contrato e NF',
    ],
    payment: '12x com juros ou 50% sinal + 50% entrega',
  },
  {
    id: 'trafego_meta',
    name: 'Gestão de Tráfego — Meta Ads',
    service: 'trafego_meta',
    price: 900,
    description: 'Gestão mensal de campanhas no Meta (Facebook + Instagram)',
    includes: [
      'Criação e gestão de campanhas',
      'Otimização contínua',
      'Relatórios mensais',
    ],
    payment: 'Mensal',
  },
  {
    id: 'trafego_google',
    name: 'Gestão de Tráfego — Google Ads',
    service: 'trafego_google',
    price: 900,
    description: 'Gestão mensal de campanhas no Google Ads',
    includes: [
      'Criação e gestão de campanhas',
      'Otimização contínua',
      'Relatórios mensais',
    ],
    payment: 'Mensal',
  },
  {
    id: 'trafego_combo',
    name: 'Gestão de Tráfego — Meta + Google',
    service: 'trafego_combo',
    price: 1200,
    description: 'Gestão mensal combinada Meta + Google',
    includes: [
      'Meta Ads (Facebook + Instagram)',
      'Google Ads',
      'Otimização contínua',
      'Relatórios mensais',
    ],
    payment: 'Mensal',
  },
  {
    id: 'gestao_midias',
    name: 'Gestão de Mídias Sociais',
    service: 'gestao_midias',
    price: 900,
    description: '8 posts únicos + 1 carrossel por mês',
    includes: [
      '8 posts únicos/mês',
      '1 carrossel/mês',
      'Criação de conteúdo',
      'Agendamento e publicação',
    ],
    payment: 'Mensal',
  },
  {
    id: 'blog_standard',
    name: 'Blog Standard',
    service: 'blog_standard',
    price: 2400,
    description: 'Blog completo para SEO e presença digital',
    includes: [
      'Blog completo',
      'Design personalizado',
      'SEO otimizado',
      '2 revisões',
    ],
    payment: '12x com juros ou 50% sinal + 50% entrega',
  },
  {
    id: 'blog_premium',
    name: 'Blog Premium (Next.js + CMS WordPress)',
    service: 'blog_premium',
    price: 4400,
    description: 'Blog de alta performance com Next.js e CMS WordPress',
    includes: [
      'Next.js frontend',
      'WordPress como CMS',
      'Performance ultra-rápida',
      'SEO avançado',
      '2 revisões',
    ],
    payment: '12x com juros ou 50% sinal + 50% entrega',
  },
];

/** Quick proposal messages — copy-paste ready for WhatsApp */
export const PROPOSAL_TEMPLATES: Record<string, { title: string; message: (name: string, senderName: string) => string }> = {
  site_completo_4anos: {
    title: 'Proposta — Site 4 anos',
    message: (name, senderName) =>
      `Olá ${name}, tudo bem?\n\nApenas para informação, tenho uma promoção que se encerra em breve:\n\n🔹 *4 anos de domínio e hospedagem*\n🔹 *1 ano de email profissional*\n🔹 *Site completo personalizado*\n\nPor *R$1.600,00*, parcelado em 12x com juros ou 50% de sinal para começar e 50% na entrega.\n\nDireito a duas revisões e contrato.\n\n— ${senderName}`,
  },
  site_completo_1ano: {
    title: 'Proposta — Site 1 ano',
    message: (name, senderName) =>
      `Olá ${name}, tudo bem?\n\nTenho também um plano mais em conta para ter presença online:\n\n🔹 *1 ano de domínio, hospedagem e site completo*\n🔹 Mesma condição de duas revisões e contrato\n\nPor *R$1.200,00*, parcelado em 12x com juros ou 50% sinal + 50% na entrega.\n\n— ${senderName}`,
  },
  abordagem_inicial: {
    title: 'Abordagem — Análise de site',
    message: (name, senderName) =>
      `Olá ${name}!\n\nEstava analisando sites de profissionais da área, e penso que o seu site pode ter uma melhoria para atrair e filtrar mais clientes qualificados.\n\nSe tiver interesse damos continuidade — penso que quem fez o seu site não conseguiu transmitir o seu profissionalismo.\n\nMarcamos uma reunião para hoje se tiver tempo na sua agenda, o que me diz?\n\n— ${senderName}`,
  },
  followup_valores: {
    title: 'Follow-up — Valores detalhados',
    message: (name, senderName) =>
      `Olá ${name}!\n\nSegue um resumo dos valores:\n\n💻 *Remodelagem de site* (usando sua hospedagem): R$900\n📦 *Pacote completo 4 anos*: R$1.600\n📦 *Pacote 1 ano*: R$1.200\n\n📱 *Gestão de tráfego*: a partir de R$900/mês\n📸 *Gestão de mídias*: R$900/mês (8 posts + 1 carrossel)\n✍️ *Blog*: a partir de R$2.400\n\nTodos com contrato, NF e duas revisões. Parcelo em 12x.\n\nQual desses faz mais sentido pra você?\n\n— ${senderName}`,
  },
  trafego_proposta: {
    title: 'Proposta — Tráfego Pago',
    message: (name, senderName) =>
      `Olá ${name}!\n\nSobre a gestão de tráfego pago:\n\n📊 *Meta Ads* (Facebook + Instagram): R$900/mês\n🔍 *Google Ads*: R$900/mês\n🚀 *Combo Meta + Google*: R$1.200/mês\n\n+ investimento em mídia (definido conforme sua região e público)\n\nInclui criação, otimização contínua e relatórios mensais.\n\n— ${senderName}`,
  },
};

