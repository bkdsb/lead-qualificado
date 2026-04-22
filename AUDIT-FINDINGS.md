# Auditoria do Sistema — leads-meta-system
**Data:** 2026-04-22

## CRITICOS

### 1. [CORRIGIDO] Match Strength ignora email/phone do lead
- **Arquivo:** `src/lib/engines/match-strength.ts:22-26`
- **Status:** Corrigido nesta sessao. `evaluateMatchStrength` agora recebe `leadContact` opcional.
- **Arquivos tocados:** match-strength.ts, api/leads/[id]/route.ts, api/leads/route.ts, meta/payload-builder.ts

### 2. Criacao de lead: match_strength calculado ANTES dos sinais de email/phone
- **Arquivo:** `src/app/api/leads/route.ts:115-139`
- **Bug:** Ordem: inserir signals -> calcular match -> auto-add email/phone como signals (linha 130+). O match e calculado antes dos sinais de email/phone serem inseridos na tabela. O calculo deveria vir DEPOIS da auto-insercao.
- **Fix:** Mover o bloco de calculo de match (linhas 115-128) para DEPOIS das linhas 130-150 (auto-add email/phone).

### 3. Kanban nao exclui "lost" mas STAGE_TRANSITIONS permite "lost"
- **Arquivo:** `src/components/ui/kanban-board.tsx:33` vs `src/lib/utils/constants.ts:4-12`
- **Bug:** O kanban mostra 6 colunas (sem `lost`), mas drag-and-drop valida contra STAGE_TRANSITIONS que inclui `lost`. Leads podem ir para `lost` via API/detalhe, mas somem do kanban sem explicacao.
- **Fix:** Adicionar coluna "lost" no kanban OU exibir aviso quando leads estao em lost.

### 4. Seguranca: role defaulta para 'admin' no client
- **Arquivo:** `src/components/layout/app-shell.tsx:23,27-38`
- **Bug:** `userRole` comeca como `'admin'` e so muda se a query positivamente confirmar `operator`. Se a query falhar (rede, RLS), todo usuario ve menu admin. Deveria defaultar para 'operator'.
- **Fix:** Mudar `useState<'admin' | 'operator'>('admin')` para `useState<'admin' | 'operator'>('operator')` e so promover para admin quando confirmado.

## MEDIOS

### 5. Padding conflitante em mobile com test mode
- **Arquivo:** `src/components/layout/app-shell.tsx:191`
- **Bug:** Classes `pt-[52px] md:pt-0` e `isTest ? "pt-6" : ""` conflitam. Em mobile + test mode, conteudo fica sob o topbar.
- **Fix:** Usar `cn()` com logica condicional: `pt-[52px]` em mobile, `pt-6` quando test em desktop, composto quando ambos.

### 6. Dashboard recentLeads tipado como Record<string, unknown>[]
- **Arquivo:** `src/app/dashboard/dashboard-client.tsx:24,329-343`
- **Bug:** Casts manuais (`l.name as string`, `l.email as string`) em todo lugar.
- **Fix:** Tipar como `DbLead[]` em vez de `Array<Record<string, unknown>>`.

### 7. Kanban confirmacao de Purchase permite valor 0 ou negativo
- **Arquivo:** `src/components/ui/kanban-board.tsx:148`
- **Bug:** `disabled={isPurchase && !value}` — o valor `"0"` e truthy, entao permite confirmar purchase com R$0.
- **Fix:** `disabled={isPurchase && (!value || Number(value) <= 0)}`

### 8. timeAgo() duplicada em 3 arquivos
- **Arquivos:** `src/app/leads/leads-client.tsx:17`, `src/app/dashboard/dashboard-client.tsx:62`, `src/components/ui/kanban-board.tsx:204`
- **Fix:** Extrair para `src/lib/utils.ts` ou `src/lib/utils/format.ts` e importar.

### 9. Export CSV busca 10.000 leads de uma vez
- **Arquivo:** `src/app/leads/leads-client.tsx:101`
- **Bug:** `limit: '10000'` pode travar o browser com muitos leads. Sem paginacao server-side no export.
- **Fix:** Implementar export server-side com streaming ou paginacao.

### 10. Score event delete sem auth check
- **Arquivo:** `src/app/leads/[id]/lead-detail-client.tsx:97-103`
- **Bug:** `handleDeleteScoreEvent` usa `confirm()` nativo (blocking, sem estilo) e qualquer role pode deletar. O `isAdmin` check nao e aplicado.
- **Fix:** Condicionar botao de delete a `isAdmin` e usar modal de confirmacao estilizado.

### 11. QA page: classe `relative` duplicada
- **Arquivo:** `src/app/qa/qa-client.tsx:91`
- **Bug:** `className="... relative overflow-hidden font-mono shadow-xl relative"` — `relative` aparece 2x.
- **Fix:** Remover o `relative` duplicado.

### 12. Stage transitions permitem pular etapas livremente
- **Arquivo:** `src/lib/utils/constants.ts:4-12`
- **Questao:** `new` pode ir direto para `purchase`. Intencional? Permite bypass total do funil.
- **Acao:** Confirmar com usuario se deve restringir.

### 13. Audit page: label em ingles misturado
- **Arquivo:** `src/app/audit/audit-client.tsx:189`
- **Bug:** `"Detailed Context"` — todo o resto esta em portugues.
- **Fix:** Mudar para `"Contexto Detalhado"`.

### 14. Settings: toggleTestMode faz window.location.reload()
- **Arquivo:** `src/app/settings/settings-client.tsx:76`
- **Bug:** Reload bruto em vez de refetch. Sem feedback se o PATCH falhou antes do reload.
- **Fix:** Verificar resposta do PATCH antes de reload. Mostrar toast de erro se falhar.

### 15. Webhook capture route — nao auditada
- **Arquivo:** `src/app/api/webhooks/capture/route.ts`
- **Risco:** Endpoint publico de ingest — precisa validacao de assinatura para evitar dados falsos.
- **Acao:** Auditar e adicionar validacao.

## BAIXOS

### 16. Login page sem rate limiting
- Apenas Supabase auth nativo protege. Considerar adicionar throttle.

### 17. Proposal templates hardcodam 'Bruno'
- **Arquivo:** `src/app/leads/[id]/lead-detail-client.tsx:559`
- **Fix:** Puxar nome do usuario logado.

### 18. Kanban useEffect sync pode causar flash
- **Arquivo:** `src/components/ui/kanban-board.tsx:257-259`
- O `useEffect` que sincroniza `boardLeads` com `leads` prop pode reverter estado otimista brevemente.

### 19. Events page sem paginacao
- Carrega todos dispatches de uma vez. Com volume alto, vai ficar lento.

### 20. Dashboard charts sem fallback SSR
- Recharts pode dar hydration mismatch. Considerar lazy import com `dynamic()`.
