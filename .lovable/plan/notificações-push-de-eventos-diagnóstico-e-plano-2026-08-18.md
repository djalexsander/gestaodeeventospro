# Notificações Push de Eventos — Diagnóstico e Plano

## 1. Diagnóstico da arquitetura atual

**Frontend**: React 18 + Vite + TypeScript, `HashRouter` (rotas do tipo `/#/`), contextos `AuthContext`, `CompanyContext`, `AppContext`, `SubscriptionContext`.

**PWA**: `vite-plugin-pwa` ativo (`registerType: "prompt"`, Workbox `generateSW`), manifest gerado no build (nome "Gestão de Eventos Pro", `display: standalone`, ícones 192/512). **Não existe service worker próprio** — o SW é gerado pelo Workbox e hoje não trata eventos `push` / `notificationclick`. Também existe build desktop Tauri (PWA desativado nesse modo).

**Autenticação**: Lovable Cloud (Supabase Auth). Papéis em `user_roles` (`user`, `admin`, `admin_master`, `company_admin`), empresa do usuário em `profiles.company_id`, lida via função `get_user_company_id` (SECURITY DEFINER) usada nas RLS.

**Tabelas relevantes**: `companies`, `profiles`, `user_roles`, `events` (com `company_id`), `staff_members` (equipe/freelancers da empresa), `event_staff` (evento ↔ funcionário), `notifications` (já existe: `user_id`, `company_id`, `type`, `title`, `message`, `is_read`, `reference_id`, `reference_type`).

**Notificações existentes**: apenas internas. `NotificationBell` lê `notifications` com Realtime, marca todas como lidas, mas **não navega para o registro relacionado**. Nenhum Firebase/FCM/Web Push instalado. Nenhuma tabela de dispositivos.

**Lacuna crítica encontrada**: `staff_members` **não possui vínculo com usuário** (`profiles`/`auth.users`). Ou seja, hoje é impossível saber qual usuário do app corresponde ao funcionário escalado em `event_staff`. Sem resolver isso, o modo "equipe escalada" não funciona.

**Riscos**:
- iOS só entrega Web Push se o PWA estiver instalado na tela de início (iOS 16.4+).
- O app desktop Tauri não recebe Web Push em background (limitação da WebView); nele valem as notificações internas em tempo real.
- Não existe rota `/eventos/:id` — hoje o evento abre por drawer a partir da agenda. Será criada uma rota de deep link.

## 2. Solução escolhida para Push

**Web Push nativo (VAPID)** via Service Worker — sem Firebase, sem dependência externa, chave privada apenas em secret de backend.

- Chaves VAPID geradas e guardadas como secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Só a pública vai ao frontend (via edge function, não hardcoded).
- Envio por Edge Function usando `npm:web-push`.
- Push é canal de entrega; a fonte persistente é a tabela `notifications`.

## 3. Migrations necessárias

1. `staff_members.user_id uuid` (nullable, referência a `profiles.id`) + índice — permite escalar um funcionário que também é usuário do app.
2. Nova tabela `user_push_devices`: `id`, `company_id`, `user_id`, `endpoint` (único), `p256dh`, `auth`, `platform`, `device_name`, `enabled`, `last_seen_at`, `created_at`, `updated_at`. GRANTs + RLS: usuário só lê/escreve os próprios dispositivos; `service_role` acesso total.
3. Nova tabela `notification_deliveries` (auditoria): `notification_id`, `device_id`, `status` (`sent`/`failed`/`expired`), `error`, `created_at`. Somente `service_role` escreve; usuário não lê.
4. Nova tabela `notification_preferences` (por usuário, com defaults): flags por tipo (`event_created`, `event_updated`, `event_cancelled`, `event_assignment_added`, ...).
5. `notifications`: adicionar `event_id uuid`, `read_at timestamptz`, `dedupe_key text` com índice único `(user_id, dedupe_key)` para idempotência. `is_read` é mantido para compatibilidade.
6. Enum/`check` de tipos de notificação cobrindo os 8 tipos listados.
7. Trigger `updated_at` nas novas tabelas.

## 4. Arquivos que serão alterados/criados

**Backend (edge functions)**
- `supabase/functions/push-subscribe/index.ts` — registra/atualiza dispositivo do usuário autenticado (valida JWT, deriva `company_id` do perfil, nunca confia no client).
- `supabase/functions/push-unsubscribe/index.ts` — desativa dispositivo.
- `supabase/functions/push-public-key/index.ts` — devolve a chave VAPID pública.
- `supabase/functions/notify-event/index.ts` — núcleo: recebe `{ event_id, type, changes }`, valida permissão do chamador, resolve destinatários (modo `team` via `event_staff` → `staff_members.user_id`, ou `company` = todos usuários ativos da empresa), aplica preferências, cria `notifications` com `dedupe_key` idempotente, busca dispositivos habilitados, envia push em paralelo com tolerância a falhas (404/410 → desativa token), grava `notification_deliveries`.
- `supabase/functions/_shared/push.ts` — helper de envio VAPID.

**Frontend**
- `src/lib/push.ts` — registro/cancelamento de subscription no SW, detecção de suporte, envio ao backend.
- `src/components/EnablePushCard.tsx` — card "Ativar notificações" (não pede permissão automática no primeiro load; aparece na Central de Notificações e em Configurações).
- `src/components/NotificationBell.tsx` — Central: abas não lidas/lidas, tipo, data relativa, clique navega para o evento, marcar como lida individual, badge.
- `src/pages/EventoDetalhe.tsx` + rota `/eventos/:id` em `src/App.tsx` — deep link; valida acesso do usuário ao evento no backend (RLS + checagem de empresa); se deslogado, guarda destino e redireciona após login.
- `src/pages/Login.tsx` — retorno ao destino pendente após autenticar.
- `src/pages/Configuracoes.tsx` — seção Notificações (ativar/desativar push, preferências por tipo, lista de dispositivos).
- `src/context/AppContext.tsx` — após `addEvent`/`updateEvent` (mudança relevante: data, horário, cidade, local, cancelamento) dispara `notify-event` de forma não bloqueante (falha de push nunca quebra o salvamento).
- `src/components/EventFormDrawer.tsx` — sem mudança de regras; apenas dispara notificação de escalação quando a equipe muda.
- `vite.config.ts` — trocar para estratégia `injectManifest` com `src/sw.ts` para adicionar handlers `push` e `notificationclick` (abre `/#/eventos/{id}`), mantendo o cache atual.
- `src/pages/Funcionarios.tsx` — campo opcional "Usuário vinculado" para conectar funcionário ↔ usuário do app.

## 5. Segurança

Isolamento por `company_id` em todas as tabelas novas; usuário só registra/enxerga o próprio dispositivo; envio somente pelo backend com `service_role`; chave privada VAPID só em secret; tokens nunca listados no frontend além dos do próprio usuário; deep link revalidado por RLS.

## 6. Impacto no PWA / mobile

Service worker passa de `generateSW` para `injectManifest` (mesmo comportamento de cache, com handlers de push). Usuários instalados receberão o SW novo automaticamente. Android/desktop Chrome: push em background funcionando. iOS: requer app instalado na tela de início. Tauri desktop: sem push em background — mantém notificação interna em tempo real.

## 7. Ordem de execução proposta

1. Migrations (aprovação sua) → 2. secrets VAPID → 3. edge functions → 4. service worker + registro → 5. Central de Notificações + deep link → 6. gatilhos em criar/editar/cancelar evento → 7. preferências e vínculo funcionário↔usuário → 8. testes dos cenários listados.
