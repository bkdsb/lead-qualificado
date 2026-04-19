# Lead Qualificado

Sistema de gestão de leads com integração Meta Conversions API (CAPI).

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (Postgres + Auth + RLS)
- **Meta CAPI v25.0** (Conversions API + Dataset Quality API)

## Setup

```bash
# 1. Clone
git clone https://github.com/bkdsb/lead-qualificado.git
cd lead-qualificado

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencher valores reais no .env.local

# 4. Rodar migrations no Supabase
# Copiar o conteúdo de supabase/migrations/001_initial_schema.sql
# e executar no SQL Editor do Supabase Dashboard

# 5. Criar usuário no Supabase
# No Supabase Dashboard > Authentication > Users > Add User

# 6. Rodar localmente
npm run dev
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (server-only) |
| `META_ACCESS_TOKEN` | Token da Conversions API |
| `META_PIXEL_ID` | ID do Pixel (usado como Dataset ID) |
| `META_API_VERSION` | Versão da API (default: v25.0) |
| `META_TEST_EVENT_CODE` | Código de teste do Events Manager |

## Funcionalidades

- **Dashboard** — Purchases 7d, Qualifieds, taxa de conversão, alertas
- **Leads** — CRUD completo com busca, filtros, paginação
- **Score Engine** — Pontuação comercial (cold/warm/hot/ready)
- **Match Strength** — Avaliação de sinais de identidade (Very Low → Strong)
- **Meta CAPI** — Envio de Lead, QualifiedLead, Purchase com payload condicional
- **Dual Confirmation** — QualifiedLead e Purchase exigem confirmação dupla
- **Test Mode** — test_event_code integrado para testes sem poluir dados
- **Dataset Quality** — Monitoramento de EMQ, coverage, freshness
- **Audit Log** — Registro de todas as ações significativas
- **Business Messaging** — Suporte a action_source: business_messaging + ctwa_clid

## Segurança

- Nenhum secret no código — tudo via `.env.local` (gitignored)
- Supabase RLS habilitado em todas as tabelas
- API routes protegidas por auth middleware
- Payload logado com valores já hasheados (SHA-256)

## Arquitetura

```
LP/WhatsApp/Ads → Registro no Dashboard → Score Engine → Stage Transition
    → CAPI Payload Builder → Meta Graph API v25.0 → Dataset Quality Monitoring
```
