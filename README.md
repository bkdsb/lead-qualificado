# Lead Qualificado — Manual de Operações & Otimização de ROAS

> Sistema de CRM + CAPI (Conversions API) integrado ao Meta/Facebook para gestão de leads B2B com rastreamento completo de funil, otimização de sinais e maximização de ROAS.

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Configuração Inicial](#2-configuração-inicial)
3. [Fluxo Operacional Diário](#3-fluxo-operacional-diário)
4. [Otimização de Event Match Quality (EMQ)](#4-otimização-de-event-match-quality-emq)
5. [Estratégias de ROAS e CAC](#5-estratégias-de-roas-e-cac)
6. [Funnel Completo — Como Funciona](#6-funnel-completo--como-funciona)
7. [Referência Técnica](#7-referência-técnica)
8. [Checklist de Lançamento](#8-checklist-de-lançamento)
9. [White-Label Deploy](#9-white-label-deploy)

---

## 1. Visão Geral do Sistema

```
                SITE (belegante.co)
                      │
           Pixel + Formulário
                      │
                ┌─────▼─────┐
                │  Webhook   │ ← Captura: nome, email, phone, fbc, fbp, IP, UA
                │  /capture  │
                └─────┬─────┘
                      │
                ┌─────▼─────┐
                │  Supabase  │ ← Leads + Sinais de Identidade + Score Events
                │  Database  │
                └─────┬─────┘
                      │
                ┌─────▼─────┐
                │ Dashboard  │ ← Visualização + Ações Manuais
                │   CRM      │
                └─────┬─────┘
                      │
                ┌─────▼─────┐
                │  Meta CAPI │ ← Envio de Lead, Qualified, Schedule, Purchase
                │  Graph API │
                └─────────────┘
```

**O diferencial:** Cada evento enviado à Meta carrega **todos os sinais de identidade** coletados do lead (email hashado, telefone, IP, user agent, fbc, fbp, external_id, nome, sobrenome). Quanto mais sinais, maior o EMQ → melhor atribuição → melhor ROAS.

---

## 2. Configuração Inicial

### Variáveis de Ambiente (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Meta CAPI
META_PIXEL_ID=1632757784596801
META_ACCESS_TOKEN=EAAI...
META_TEST_EVENT_CODE=TEST12345  # Pegar no Events Manager > Eventos de Teste
```

### Modo Teste vs Produção

| Modo | Onde ver | O que acontece |
|---|---|---|
| **Teste** | Settings > Toggle amarelo | Eventos vão para o canal de teste da Meta (não afetam campanhas) |
| **Produção** | Settings > Toggle branco | Eventos vão para o pixel real (afetam otimização de campanhas) |

> ⚠️ **REGRA DE OURO:** Sempre teste no modo TEST antes de enviar eventos reais. A Meta não permite desfazer eventos enviados em produção.

---

## 3. Fluxo Operacional Diário

### 3.1 Quando um Lead entra

1. Lead preenche formulário no site → Capturado automaticamente no CRM
2. Evento `Lead` é disparado pelo Pixel do navegador (automático)
3. Sinais capturados: email, telefone, nome/sobrenome, IP, user agent, fbc, fbp
4. Score inicial: **20 pontos** (conversa iniciada)

### 3.2 Rotina do Gestor

```
1. Abrir Dashboard → Ver leads recentes
2. Para cada lead quente (score ≥ 50):
   a. Clicar no lead → Ver detalhes
   b. Enviar WhatsApp (link no contato)
   c. Ações conforme evolução:
      - Mandou orçamento → "+ Proposta" (score +50)
      - Não respondeu → "- S/ Resposta" (score -30)
      - Qualificou → "Mover" > Qualificado → "Enviar" > Qualificado
      - Agendou reunião → "Mover" > Agendamento → "Enviar" > Agendamento
      - FECHOU VENDA → "Mover" > Venda → "Enviar" > Venda (com valor em R$)
```

### 3.3 Hierarquia de Eventos (ORDEM IMPORTA)

```
Lead (20pts)
  └→ Qualificado (50pts)  ← mandei orçamento, tá pensando
       └→ Agendamento (60pts)  ← marcou call/reunião
            └→ Venda (100pts)  ← FECHOU! 🎉
```

> **A Meta otimiza campanhas para gerar MAIS do evento de maior valor.** Se você envia somente `Lead`, a Meta otimiza para gerar mais leads baratos. Se envia `Purchase` com valor, otimiza para gerar mais compradores.

### 3.4 Pontuação de Score

| Ação | Pontos | Quando usar |
|---|---|---|
| Conversa iniciada | +20 | Automático (primeira mensagem) |
| CTA clicado | +15 | Automático (clique no botão do site) |
| Qualificação respondida | +30 | Lead respondeu questões de qualificação |
| Proposta enviada | +50 | Você mandou orçamento/proposta |
| Lead qualificado | +40 | Lead demonstrou intenção real de compra |
| Venda fechada | +100 | Comprou! |
| Sem resposta | -30 | Lead sumiu, não respondeu |
| Curioso sem fit | -50 | Só queria saber preço, não tem perfil |
| Sem orçamento | -40 | Não tem como pagar |

---

## 4. Otimização de Event Match Quality (EMQ)

### O que é EMQ?

EMQ (Event Match Quality) é uma pontuação de 0 a 10 que a Meta dá para cada evento. Quanto maior, melhor a Meta consegue atribuir a conversão ao anúncio correto → ROAS aumenta.

### Score atual vs ideal

| Sinal | Impacto no EMQ | Status no seu sistema |
|---|---|---|
| **Email** (hashado) | ★★★★★ | ✅ 100% cobertura |
| **Telefone** (hashado) | ★★★★ | ✅ ~70% cobertura |
| **Nome/Sobrenome** (hashado) | ★★★ | ✅ Auto-extraído do nome |
| **External ID** | ★★★ | ✅ Auto-gerado do UUID |
| **fbc** (click ID) | ★★★★★ | ⚡ Precisa do snippet no site |
| **fbp** (browser ID) | ★★★★ | ⚡ Precisa do snippet no site |
| **IP Address** | ★★★ | ✅ Capturado dos headers |
| **User Agent** | ★★ | ✅ Capturado dos headers |

### Como máximizar o fbc/fbp (MAIOR BOOST POSSÍVEL)

O `fbc` é o sinal mais valioso depois do email. Ele conecta o **clique no anúncio** ao **evento de conversão**. Sem ele, a Meta não sabe qual anúncio gerou a venda.

**No arquivo JavaScript do seu formulário no site (belegante.co)**, adicione:

```javascript
// Ler cookies do Meta Pixel antes de enviar o formulário
function getMetaCookies() {
  const cookies = document.cookie;
  const fbc = cookies.match(/(?:^|;\s*)_fbc=([^;]+)/)?.[1] || null;
  const fbp = cookies.match(/(?:^|;\s*)_fbp=([^;]+)/)?.[1] || null;

  // Também tenta pegar do fbclid da URL (se vier de um anúncio)
  if (!fbc) {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');
    if (fbclid) {
      return {
        fbc: `fb.1.${Date.now()}.${fbclid}`,
        fbp: fbp
      };
    }
  }

  return { fbc, fbp };
}

// No momento do envio do formulário:
async function submitForm(formData) {
  const metaCookies = getMetaCookies();

  const response = await fetch('https://SEU-CRM.vercel.app/api/webhooks/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      area: formData.area,
      services: formData.services,
      // ESSES 2 CAMPOS SÃO O QUE AUMENTAM O EMQ:
      fbc: metaCookies.fbc,
      fbp: metaCookies.fbp,
    })
  });
}
```

> **Resultado esperado:** EMQ de Purchase sobe de ~5.2 para **7-8+/10**. A Meta estima que só adicionar fbc gera +100% em conversões adicionais relatadas.

### Simulação de Test Mode

Quando você está no **modo teste** e envia eventos, o sistema automaticamente gera `fbc` e `fbp` simulados para que você veja o evento completo no painel de Eventos de Teste da Meta. Em produção, só envia o que realmente tem.

---

## 5. Estratégias de ROAS e CAC

### 5.1 Regra #1: Envie TODOS os eventos com valor

```
Lead         → R$ 0 (sem valor)
Qualificado  → R$ 0 (sem valor)
Agendamento  → R$ 0 (sem valor)
Venda        → R$ VALOR REAL DA VENDA ← OBRIGATÓRIO
```

**Por que?** A Meta usa o valor para calcular ROAS diretamente. Se você cobra R$ 3.000 por um site, coloque 3000. A Meta vai otimizar para encontrar perfis com **maior probabilidade de comprar nesse valor**.

### 5.2 Regra #2: Nunca fique sem enviar Purchase por mais de 7 dias

A Meta precisa de dados frescos. Se passar 7+ dias sem Purchase, o modelo de machine learning começa a degradar.

- **Ideal:** 50+ eventos/semana (Fase de Aprendizado concluída)
- **Mínimo viável:** 1-2 por semana (Fase de Aprendizado limitada)
- **Sem dados por 7+ dias:** Reinício da Fase de Aprendizado

### 5.3 Regra #3: Data Freshness — envie no momento da ação

O sistema envia o evento com `event_time` = momento em que você clica "Enviar" no CRM. Isso é aceitável para a Meta (delay de horas/poucos dias).

**Regra prática:**
- Lead converteu hoje → Envie Purchase hoje (ideal)
- Lead converteu ontem → Envie amanhã (ok)
- Lead converteu há 5 dias → Envie hoje (aceitável, mas sub-ótimo)
- Lead converteu há 14 dias → Envie mas a atribuição pode falhar

### 5.4 Regra #4: Closed-Loop Marketing

```
Campanha → Lead → Qualificação → Venda → Feedback para Meta
     ↑                                          |
     └──────────── Meta otimiza ←──────────────┘
```

**O que acontece na prática:**
1. Você gasta R$ 500 em anúncios
2. Capturam 30 leads
3. Qualifica 10
4. Fecha 3 vendas = R$ 9.000
5. **ROAS = 18x** (mas a Meta só sabe disso se você enviar os Purchase events)

Sem o Purchase event, a Meta acha que ela gerou 30 leads inúteis e começa a otimizar pior.

### 5.5 Reduzindo CAC (Custo por Aquisição)

| Ação no CRM | Impacto no CAC |
|---|---|
| Enviar Purchase com valor | Meta otimiza para buyers → CAC cai |
| Enviar QualifiedLead | Meta aprende o perfil de quem qualifica → menos curiosos |
| Marcar "Sem orçamento" | Score cai → não polui o funil de dados |
| Enviar fbc/fbp | Atribuição precisa → Meta sabe qual anúncio funciona → corta os ruins |

### 5.6 Otimização de Campanha baseada em dados do CRM

Na sua campanha do **Gerenciador de Anúncios**:

1. **Objetivo:** Vendas (não Tráfego, não Alcance)
2. **Evento de otimização:** Purchase
3. **Janela de conversão:** 7 dias clique
4. **Público semelhante:** Baseado em quem comprou (Purchase) nos últimos 180 dias

> Se você não tem Purchase suficientes (< 50/semana), use QualifiedLead como evento de otimização intermediário até ter volume.

---

## 6. Funnel Completo — Como Funciona

```
┌─────────────────────────────────────────────────────────┐
│                    JORNADA DO CLIENTE                     │
│                                                          │
│  Anúncio (clique com fbclid)                             │
│    → Landing Page (Pixel Lead + cookies fbc/fbp)         │
│      → Formulário (captura webhook com todos sinais)     │
│        → WhatsApp (conversa + score)                     │
│          → Proposta enviada (+50 pts)                    │
│            → Reunião agendada (Schedule event)           │
│              → Venda fechada (Purchase + R$ valor)       │
│                                                          │
│  Cada etapa gera dados que a Meta usa para otimizar      │
└─────────────────────────────────────────────────────────┘
```

### O que a Meta RECEBE por evento:

```json
{
  "event_name": "Purchase",
  "event_time": 1776735692,
  "event_id": "evt_uuid-unico",
  "action_source": "website",
  "user_data": {
    "em": ["hash_sha256_email"],
    "ph": ["hash_sha256_telefone"],
    "fn": ["hash_sha256_primeiro_nome"],
    "ln": ["hash_sha256_sobrenome"],
    "external_id": ["uuid-do-lead"],
    "fbc": "fb.1.xxx.fbclid",
    "fbp": "fb.1.xxx.random",
    "client_ip_address": "189.xxx.xxx.xxx",
    "client_user_agent": "Mozilla/5.0..."
  },
  "custom_data": {
    "value": 3000,
    "currency": "BRL"
  }
}
```

**9 sinais de identidade** = EMQ alto = atribuição precisa = ROAS alto.

---

## 7. Referência Técnica

### Endpoints

| Rota | Método | Descrição |
|---|---|---|
| `/api/webhooks/capture` | POST | Captura leads do formulário do site |
| `/api/meta/dispatch` | POST | Envia evento para Meta CAPI |
| `/api/leads` | GET/POST | Lista/cria leads |
| `/api/leads/[id]` | GET/PATCH | Detalhes/atualiza lead |
| `/api/leads/[id]/score` | POST/DELETE | Adiciona/remove evento de score |
| `/api/leads/[id]/stage` | PATCH | Muda estágio do lead |
| `/api/leads/[id]/notes` | POST | Adiciona nota |
| `/api/settings` | GET/PATCH | Configurações globais |
| `/api/meta/dataset-quality` | GET | Verifica qualidade do dataset Meta |

### Idempotência

O sistema bloqueia envio duplicado: se um evento `Purchase` já foi enviado com sucesso para um lead, ele não permite reenviar (a menos que force com `override_idempotency: true`).

### Deduplicação Meta

A Meta também faz deduplicação nativa usando `event_id`. Se o mesmo `event_id` for enviado duas vezes, a Meta ignora o segundo. O sistema gera `event_id` único via UUID.

### Hash de Sinais

Sinais sensíveis (email, telefone, nome) são hashados com SHA-256 antes do envio, conforme requisito da Meta. IP, User Agent, fbc e fbp NÃO são hashados.

---

## 8. Checklist de Lançamento

### Antes de ativar modo Produção:

- [ ] **Meta Pixel** instalado no site com evento `Lead` no formulário
- [ ] **Snippet fbc/fbp** no JavaScript do formulário (seção 4)
- [ ] **Test Event Code** configurado no `.env.local`
- [ ] Enviar 1 evento de teste de cada tipo (Lead, Qualified, Purchase)
- [ ] Verificar no **Events Manager > Eventos de Teste** se os 9 sinais aparecem
- [ ] Confirmar que EMQ está acima de 6.0 nos eventos de teste
- [ ] Trocar para modo **Produção** no Settings
- [ ] Enviar primeiro Purchase real com valor

### Verificação semanal:

- [ ] Acessar Events Manager > Visão Geral
- [ ] Conferir EMQ de Purchase (meta: ≥ 7.0)
- [ ] Conferir cobertura de fbc (meta: ≥ 30%)
- [ ] Conferir Data Freshness (meta: < 1 hora)
- [ ] Conferir se não há erros no CRM > Auditoria (QA)

---

## 9. White-Label Deploy

Para usar com outro cliente:

1. **Clonar repositório:** `git clone` → novo repo no GitHub
2. **Novo Supabase:** Criar projeto, rodar migrations do `/supabase`
3. **Novo Pixel:** Criar pixel no Events Manager do cliente
4. **Variáveis:** Atualizar `.env.local` com novas credenciais
5. **Deploy:** `vercel deploy` no novo repo
6. **Webhook:** Atualizar URL do formulário do cliente para o novo CRM
7. **Ocultar seções admin:** No perfil SDR, ocultar páginas Auditoria/QA/Configurações

### Personalização por cliente:

| Ajuste | Arquivo |
|---|---|
| Logo/marca | `app-shell.tsx` |
| Scoring weights | `constants.ts` > `DEFAULT_SCORE_POINTS` |
| Cores do tema | `globals.css` > `:root` |
| Etapas do funil | `constants.ts` > `STAGE_LABELS` |

---

## Resumo Executivo

**Para aumentar ROAS:**
1. ✅ Envie Purchase com valor real em R$
2. ✅ Adicione fbc/fbp no formulário do site
3. ✅ Marque eventos negativos (sem resposta, sem orçamento)
4. ✅ Mantenha frequência: pelo menos 1 Purchase/semana
5. ✅ Otimize campanha para Purchase (não Lead)

**Para reduzir CAC:**
1. ✅ Envie QualifiedLead para filtrar curiosos
2. ✅ Maximize EMQ (9 sinais = atribuição perfeita)
3. ✅ Use público semelhante baseado em compradores
4. ✅ Monitore score: leads com score < 0 = dinheiro jogado fora

**Para não perder dinheiro:**
1. ❌ Nunca otimize para Tráfego ou Alcance (gera cliques inúteis)
2. ❌ Nunca fique 7+ dias sem enviar Purchase
3. ❌ Nunca envie Purchase com valor 0 (polui o modelo)
4. ❌ Nunca ignore leads com score alto (são os que a Meta encontrou pra você)
