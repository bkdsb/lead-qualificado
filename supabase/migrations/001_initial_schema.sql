-- =============================================================
-- Lead Qualificado — Initial Schema
-- Supabase Postgres Migration
-- =============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================
-- USERS (profile extension for Supabase Auth)
-- =============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'operator' check (role in ('admin', 'operator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'operator'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- LEADS
-- =============================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null default gen_random_uuid()::text,
  name text not null default '',
  email text,
  phone text,
  stage text not null default 'new'
    check (stage in ('new','contacted','conversing','proposal','qualified','purchase','lost')),
  score integer not null default 0,
  score_band text not null default 'cold'
    check (score_band in ('cold','warm','hot','ready')),
  match_strength text not null default 'very_low'
    check (match_strength in ('very_low','low','medium','good','strong')),
  source text default 'manual'
    check (source in ('lp','whatsapp','cta','manual','ad','api')),
  campaign_name text,
  adset_name text,
  ad_name text,
  purchase_value numeric(12,2),
  currency text not null default 'BRL',
  closed_at timestamptz,
  last_contact_at timestamptz,
  meta_sync_status text not null default 'pending'
    check (meta_sync_status in ('pending','synced','error','partial','none')),
  environment text not null default 'test'
    check (environment in ('test','production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id)
);

create index idx_leads_stage on public.leads(stage);
create index idx_leads_score_band on public.leads(score_band);
create index idx_leads_match_strength on public.leads(match_strength);
create index idx_leads_meta_sync on public.leads(meta_sync_status);
create index idx_leads_created_at on public.leads(created_at desc);
create index idx_leads_source on public.leads(source);

alter table public.leads enable row level security;

create policy "Authenticated users can read leads"
  on public.leads for select
  to authenticated
  using (true);

create policy "Authenticated users can insert leads"
  on public.leads for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update leads"
  on public.leads for update
  to authenticated
  using (true);

-- =============================================================
-- LEAD CONTACTS
-- =============================================================
create table public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null check (type in ('email','phone','whatsapp')),
  value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_lead_contacts_lead on public.lead_contacts(lead_id);

alter table public.lead_contacts enable row level security;

create policy "Authenticated users can manage lead_contacts"
  on public.lead_contacts for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================
-- LEAD NOTES
-- =============================================================
create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  content text not null,
  author_id uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_lead_notes_lead on public.lead_notes(lead_id);

alter table public.lead_notes enable row level security;

create policy "Authenticated users can manage lead_notes"
  on public.lead_notes for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================
-- LEAD STAGE HISTORY
-- =============================================================
create table public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references public.users(id),
  reason text,
  created_at timestamptz not null default now()
);

create index idx_lead_stage_history_lead on public.lead_stage_history(lead_id);
create index idx_lead_stage_history_created on public.lead_stage_history(created_at desc);

alter table public.lead_stage_history enable row level security;

create policy "Authenticated users can manage lead_stage_history"
  on public.lead_stage_history for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================
-- LEAD SCORE EVENTS
-- =============================================================
create table public.lead_score_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null check (event_type in (
    'lp_visit','cta_click','conversation_started','qualification_answered',
    'proposal_sent','qualified','purchase','no_response','curious_no_fit',
    'no_budget','manual_adjust'
  )),
  points integer not null,
  note text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_lead_score_events_lead on public.lead_score_events(lead_id);

alter table public.lead_score_events enable row level security;

create policy "Authenticated users can manage lead_score_events"
  on public.lead_score_events for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================
-- LEAD IDENTITY SIGNALS
-- =============================================================
create table public.lead_identity_signals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  signal_type text not null check (signal_type in (
    'email','phone','fbc','fbp','ctwa_clid','external_id',
    'client_ip_address','client_user_agent','fn','ln','ct','st','zp','country','db','ge'
  )),
  signal_value text not null,
  source text default 'manual' check (source in ('lp','whatsapp','manual','webhook','api')),
  collected_at timestamptz not null default now(),
  is_current boolean not null default true,

  constraint uq_lead_signal unique (lead_id, signal_type, signal_value)
);

create index idx_lead_identity_lead on public.lead_identity_signals(lead_id);
create index idx_lead_identity_type on public.lead_identity_signals(signal_type);
create index idx_lead_identity_current on public.lead_identity_signals(lead_id, is_current) where is_current = true;

alter table public.lead_identity_signals enable row level security;

create policy "Authenticated users can manage lead_identity_signals"
  on public.lead_identity_signals for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================
-- LEAD SOURCE ATTRIBUTION
-- =============================================================
create table public.lead_source_attribution (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  referrer_url text,
  landing_page_url text,
  created_at timestamptz not null default now()
);

create index idx_lead_source_lead on public.lead_source_attribution(lead_id);

alter table public.lead_source_attribution enable row level security;

create policy "Authenticated users can manage lead_source_attribution"
  on public.lead_source_attribution for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================
-- META EVENT DISPATCHES
-- =============================================================
create table public.meta_event_dispatches (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_name text not null,
  event_id text not null unique,
  event_time bigint not null,
  action_source text not null default 'website'
    check (action_source in ('website','business_messaging','other')),
  messaging_channel text check (messaging_channel in ('whatsapp','messenger','instagram')),
  environment text not null default 'test'
    check (environment in ('test','production')),
  test_event_code text,
  payload_sent jsonb,
  payload_raw_signals jsonb,
  match_strength_at_send text,
  response_status integer,
  response_body jsonb,
  error_message text,
  status text not null default 'pending'
    check (status in ('pending','success','failed','retrying')),
  retry_count integer not null default 0,
  dispatched_by uuid references public.users(id),
  dispatched_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index idx_meta_dispatch_lead on public.meta_event_dispatches(lead_id);
create index idx_meta_dispatch_event on public.meta_event_dispatches(event_name);
create index idx_meta_dispatch_status on public.meta_event_dispatches(status);
create index idx_meta_dispatch_env on public.meta_event_dispatches(environment);
create index idx_meta_dispatch_created on public.meta_event_dispatches(dispatched_at desc);

-- Idempotency: one successful event per lead per event_name per environment
-- (allows retries for failed, but blocks duplicate success)
create unique index uq_meta_dispatch_idempotent
  on public.meta_event_dispatches(lead_id, event_name, environment)
  where status = 'success';

alter table public.meta_event_dispatches enable row level security;

create policy "Authenticated users can manage meta_event_dispatches"
  on public.meta_event_dispatches for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================
-- DATASET QUALITY SNAPSHOTS
-- =============================================================
create table public.dataset_quality_snapshots (
  id uuid primary key default gen_random_uuid(),
  dataset_id text not null,
  event_name text not null,
  composite_score numeric(4,1),
  match_key_coverage jsonb,
  event_coverage_pct numeric(5,2),
  data_freshness text,
  acr_percentage numeric(5,2),
  raw_response jsonb,
  fetched_at timestamptz not null default now()
);

create index idx_dq_snapshot_dataset on public.dataset_quality_snapshots(dataset_id);
create index idx_dq_snapshot_fetched on public.dataset_quality_snapshots(fetched_at desc);

alter table public.dataset_quality_snapshots enable row level security;

create policy "Authenticated users can manage dataset_quality_snapshots"
  on public.dataset_quality_snapshots for all
  to authenticated
  using (true)
  with check (true);

-- =============================================================
-- AUDIT LOGS
-- =============================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('lead','dispatch','setting','system','user')),
  entity_id uuid,
  action text not null check (action in (
    'create','update','delete','stage_change','score_change',
    'dispatch','confirm','override','login','setting_change'
  )),
  details jsonb,
  actor_id uuid references public.users(id),
  ip_address text,
  environment text,
  created_at timestamptz not null default now()
);

create index idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_action on public.audit_logs(action);
create index idx_audit_actor on public.audit_logs(actor_id);
create index idx_audit_created on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

create policy "Authenticated users can read audit_logs"
  on public.audit_logs for select
  to authenticated
  using (true);

create policy "Authenticated users can insert audit_logs"
  on public.audit_logs for insert
  to authenticated
  with check (true);

-- =============================================================
-- SYSTEM SETTINGS
-- =============================================================
create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}',
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

create policy "Authenticated users can read system_settings"
  on public.system_settings for select
  to authenticated
  using (true);

create policy "Authenticated users can manage system_settings"
  on public.system_settings for all
  to authenticated
  using (true)
  with check (true);

-- Seed default settings
insert into public.system_settings (key, value) values
  ('test_mode_enabled', 'true'),
  ('meta_api_version', '"v25.0"'),
  ('score_rules', '{
    "lp_visit": 2,
    "cta_click": 10,
    "conversation_started": 20,
    "qualification_answered": 30,
    "proposal_sent": 50,
    "qualified": 70,
    "purchase": 100,
    "no_response": -10,
    "curious_no_fit": -15,
    "no_budget": -20
  }'),
  ('score_bands', '{
    "cold": {"min": -999, "max": 19},
    "warm": {"min": 20, "max": 49},
    "hot": {"min": 50, "max": 79},
    "ready": {"min": 80, "max": 9999}
  }')
on conflict (key) do nothing;

-- =============================================================
-- API CREDENTIALS REFS (metadata only, no actual secrets)
-- =============================================================
create table public.api_credentials_refs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('meta','supabase')),
  credential_type text not null,
  env_var_name text not null,
  last_verified_at timestamptz,
  status text not null default 'active'
    check (status in ('active','expired','revoked')),
  created_at timestamptz not null default now()
);

alter table public.api_credentials_refs enable row level security;

create policy "Authenticated users can read api_credentials_refs"
  on public.api_credentials_refs for all
  to authenticated
  using (true)
  with check (true);

-- Seed credential references
insert into public.api_credentials_refs (provider, credential_type, env_var_name, status) values
  ('meta', 'access_token', 'META_ACCESS_TOKEN', 'active'),
  ('meta', 'pixel_id', 'META_PIXEL_ID', 'active'),
  ('meta', 'test_event_code', 'META_TEST_EVENT_CODE', 'active'),
  ('supabase', 'anon_key', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'active'),
  ('supabase', 'service_role_key', 'SUPABASE_SERVICE_ROLE_KEY', 'active')
on conflict do nothing;

-- =============================================================
-- UPDATED_AT TRIGGER (auto-update timestamp)
-- =============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_leads_updated_at
  before update on public.leads
  for each row execute function public.update_updated_at();

create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at();
