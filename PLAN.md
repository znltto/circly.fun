# Circly — Plano de Execução

> **Perto, mesmo de longe.**
> MVP web de videochamadas privadas. Stack Next.js + Supabase + LiveKit + Vercel, tudo em plano free.

---

## Visão geral

**Objetivo:** MVP funcional em ~10 fases, cada uma entregando algo utilizável ao final. Nada de "big bang" — cada fase é mergeável e testável.

**Regra de ouro:** Supabase para identidade/dados, LiveKit para mídia, Vercel para app. Sem misturar responsabilidades.

**Custos previstos:** R$ 0 enquanto o uso ficar dentro dos free tiers (LiveKit: 5.000 min/mês, 100 conexões simultâneas; Supabase Free: 50k MAU; Vercel Hobby). Domínio custom é opcional (~R$ 40/ano se quiser circly.com.br).

---

## Fase 0 — Setup de contas e planejamento

**Objetivo:** Ter todas as credenciais na mão antes de escrever código.

**Ações (você faz, fora do código):**
1. Criar conta em **supabase.com** → novo projeto (região São Paulo se possível). Anotar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (SEGREDO — só server-side)
2. Criar conta em **livekit.io** → plano Build (free). Criar projeto. Anotar:
   - `LIVEKIT_URL` (wss://...)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET` (SEGREDO — só server-side)
3. Criar conta em **vercel.com** (não precisa deployar ainda).
4. Instalar **pnpm**: `npm install -g pnpm` (ou usar npm — atualizo os scripts).
5. (Opcional) Registrar domínio: `circly.app`, `circly.com.br` ou `circly.dev`.

**Entregável:** arquivo `.env.local` populado (não commitado).

---

## Fase 1 — Bootstrap Next.js + Tailwind + design tokens

**Objetivo:** Projeto rodando com identidade visual aplicada, sem features ainda.

- `create-next-app@latest` com App Router, TypeScript, Tailwind, ESLint, sem `src/` opcional.
- Configurar fontes: **Manrope** (UI), **Geist Mono** (código), **Instrument Serif** (só landing).
- Criar `globals.css` com CSS variables completas (dark + light):
  - Cores: background/surface/surface-raised/surface-hover, border, text-primary/secondary/muted, brand (`#D9FF5A`), success, warning, danger, focus.
  - Radius: 10 / 14 / 20 / 28 px.
  - Spacing base 4px, escala tipográfica xs → 3xl.
- Configurar `tailwind.config.ts` para consumir os tokens.
- AppShell mínimo (sidebar 220–240px desktop / bottom nav mobile).
- ThemeProvider (dark padrão, toggle).

**Entregável:** app renderiza uma página em branco no tema Circly.

---

## Fase 2 — Design system e mascote CCO

**Objetivo:** Biblioteca de componentes reutilizáveis + identidade visual completa.

- **BrandMark** (SVG): dois "C" convergentes/espelhados.
- **Wordmark**: "Circly" em Manrope SemiBold com tracking customizado.
- **CcoMascot** (SVG componentizado): variantes `idle` / `waiting` / `offline` / `muted` / `camera-off` / `connection-error` / `goodbye`.
- Componentes base (shadcn/ui como base comportamental, estilos próprios):
  - `Button` (Primary/Secondary/Ghost/Danger) com CVA
  - `Input`, `OTPInput` (6 dígitos), `SearchInput`, `CopyLinkInput`
  - `UserAvatar` + `PresenceIndicator`
  - `Toast`, `Dialog`, `Dropdown`, `Command Menu`
  - `EmptyState` (usa CCO)
  - `Skeleton`
- Página `/design` (privada, oculta em prod) para catálogo visual.

**Entregável:** todos os primitivos prontos, com estados hover/focus/disabled/loading tratados.

---

## Fase 3 — Landing page editorial

**Objetivo:** Vitrine profissional que NÃO parece SaaS genérico.

- Header minimalista: BrandMark + wordmark + `Entrar` + `Criar sala`.
- Hero: "Perto, mesmo de longe." + subtítulo curto + 2 CTAs.
- Mockup real e original da tela de chamada (não screenshot fake).
- Três blocos apenas: **Sua sala** / **Sua presença** / **Suas pessoas**.
- Footer com créditos discretos.
- Sem parallax, sem partículas, sem gradientes psicodélicos.

**Entregável:** landing pública, responsiva, mobile-friendly.

---

## Fase 4 — Supabase Auth (Email OTP) + perfis

**Objetivo:** Login sem senha funcionando, com perfil básico.

- Instalar `@supabase/ssr` e `@supabase/supabase-js`.
- Configurar clients: `lib/supabase/client.ts`, `server.ts`, `admin.ts` (service role).
- Middleware Next.js para renovar sessão + proteger rotas.
- Migration SQL: `profiles` (id → auth.users, username unique, display_name, avatar_url, created_at) + RLS.
- Trigger `on_auth_user_created` → insere linha em `profiles`.
- Páginas:
  - `/entrar` — email input, dispara OTP.
  - `/verificar` — OTP 6 dígitos, reenviar, expiração.
  - `/onboarding` — escolher username + display_name na primeira vez.
- Configurar Supabase Dashboard: SMTP (usar padrão free ou Resend), OTP expira em 10min.

**Entregável:** consigo criar conta com email, receber código, entrar, e ver "Olá, {display_name}".

---

## Fase 5 — Amigos, presença e home autenticada

**Objetivo:** Ver quem está online e adicionar pessoas.

- Migration: `friendships` (requester_id, addressee_id, status pending/accepted/blocked) + RLS.
- Server actions: `sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`, `blockUser`.
- Página `/pessoas`: busca por username, solicitações pendentes, lista de amigos.
- Presença: Supabase Realtime `presence` channel — cada usuário publica `{status, room_id?}`.
- Página `/inicio`: saudação, `Entrar com link` + `Nova sala`, lista compacta de amigos com presença.

**Entregável:** dois usuários conseguem virar amigos e ver "online" um do outro em tempo real.

---

## Fase 6 — Salas, convites por link e visitantes

**Objetivo:** Criar sala e mandar link para alguém entrar.

- Migrations: `rooms`, `room_invites` (token_hash), `room_participants`, `messages`. RLS em todas.
- `/salas/nova`: form com título, visibilidade (private/link/friends), allow_guests, max_participants, expires_at opcional.
- Geração de slug seguro (nanoid ou crypto.randomBytes → base62, 8 chars).
- Gerar link de convite: token aleatório → hash SHA-256 no banco → link `/s/{slug}?i={token}`.
- Página `/s/[slug]`:
  - Se logado + amigo do host + visibilidade permite → entra direto.
  - Se `allow_guests` + token válido → pede nome de visitante.
  - Caso contrário → erro amigável (sem enumerar existência da sala).

**Entregável:** consigo criar sala, copiar link, mandar para alguém, e a pessoa consegue chegar até a tela de pré-entrada.

---

## Fase 7 — LiveKit: token server-side e pré-entrada

**Objetivo:** Preview de câmera + emissão segura de token LiveKit.

- Instalar `livekit-client`, `livekit-server-sdk`, `@livekit/components-react`.
- Rota `POST /api/livekit/token`:
  - Valida sessão Supabase OU visitante com convite válido.
  - Confirma sala ativa, com vaga, e permissões corretas (host vs. participante vs. guest).
  - Emite JWT com `roomName`, `identity`, `name`, grants mínimos (`canPublish`, `canSubscribe`, `canPublishData`).
  - TTL curto (1h para user, 30min para guest).
- Componente `DevicePreview`:
  - Preview real de câmera (`getUserMedia`).
  - Seletor de mic / câmera / saída (`enumerateDevices`).
  - Toggles pré-entrada (câmera on/off, mic on/off).
  - Tratamento visual de `NotAllowedError` / `NotFoundError`.

**Entregável:** clico "Entrar", vejo minha câmera, escolho dispositivos, e recebo o token pronto para conectar.

---

## Fase 8 — Sala em chamada: grid, screen share, chat, moderação

**Objetivo:** A chamada em si — o coração do produto.

- `MeetingRoom` — wrapper que conecta ao LiveKit com o token.
- `ParticipantGrid` — grid adaptativo (1 → 2 → 3 → 4+), destaca quem está falando.
- `ScreenShareStage` — quando alguém compartilha, a tela vira o palco e participantes viram faixa.
- `CallControls` (bottom bar fixa):
  - Toggle microfone
  - Toggle câmera
  - Toggle compartilhamento de tela
  - Menu de dispositivos
  - Sair
- `RightDrawer` com abas:
  - **Pessoas**: lista de quem está na sala, host pode `mute` / `kick` / `encerrar para todos`.
  - **Chat**: mensagens em tempo real via Supabase Realtime (`messages` table).
- Topbar: nome da sala + indicador "● Ao vivo".
- Estados: conectando, reconectando, sem mídia, sala vazia, host encerrou.

**Entregável:** duas pessoas em navegadores diferentes se veem, se ouvem, e uma compartilha a tela.

---

## Fase 9 — Polimento, mobile, acessibilidade e deploy

**Objetivo:** Sair do "funciona" e chegar em "profissional".

- Mobile:
  - Sidebar → bottom nav.
  - Drawer → bottom sheet.
  - Sala em chamada com controles acessíveis de uma mão.
- Acessibilidade:
  - Focus-visible sempre presente (≥2px, alto contraste).
  - Aria-labels em todos os ícones-botão.
  - Navegação por teclado completa.
  - `prefers-reduced-motion` respeitado.
  - Contraste AA verificado.
- Estados vazios com CCO, 404 amigável, página de erro segura para convite inválido.
- Rate limiting (Upstash Redis free tier ou tabela `rate_limits` no próprio Supabase) em `/api/auth/*` e `/api/livekit/token`.
- Logs estruturados sem PII.
- Deploy Vercel:
  - Environment variables no dashboard.
  - Preview deploys por branch.
  - Domínio custom (se comprado).
- README com: setup local, variáveis, migrations, deploy, checklist de segurança, limites do free tier.

**Entregável:** produto no ar em `circly.vercel.app` (ou domínio próprio), pronto para convidar os amigos.

---

## Estrutura de arquivos alvo

```
src/
  app/
    (marketing)/
      page.tsx                    # landing
    (auth)/
      entrar/page.tsx
      verificar/page.tsx
      onboarding/page.tsx
    (app)/
      inicio/page.tsx
      pessoas/page.tsx
      salas/
        nova/page.tsx
      s/[slug]/
        page.tsx                  # pré-entrada
        sala/page.tsx             # chamada
    api/
      auth/[...]/route.ts
      rooms/[...]/route.ts
      livekit/token/route.ts
  components/
    brand/
      BrandMark.tsx
      Wordmark.tsx
      CcoMascot.tsx
    ui/                           # design system
    layout/
      AppShell.tsx
      SidebarNav.tsx
      MobileNav.tsx
    friends/
    room/
      DevicePreview.tsx
      MeetingRoom.tsx
      ParticipantGrid.tsx
      ParticipantTile.tsx
      ScreenShareStage.tsx
      CallControls.tsx
      RightDrawer.tsx
      InRoomChat.tsx
  lib/
    supabase/
      client.ts
      server.ts
      admin.ts
    livekit/
      token.ts
    validators.ts
    utils.ts
  styles/
    globals.css
  types/
    database.ts                   # gerado pelo Supabase CLI
supabase/
  migrations/
    0001_profiles.sql
    0002_friendships.sql
    0003_rooms.sql
    0004_room_invites.sql
    0005_room_participants.sql
    0006_messages.sql
```

---

## Variáveis de ambiente (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LiveKit
NEXT_PUBLIC_LIVEKIT_URL=wss://xxx.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Checklist de segurança (revisar ao final de cada fase relevante)

- [ ] Nenhum segredo (`*_SECRET`, `*_SERVICE_ROLE_KEY`) exposto no client bundle.
- [ ] RLS habilitado em TODAS as tabelas (sem exceção).
- [ ] Policies mínimas — usuário só lê o que precisa.
- [ ] Zod valida TODO payload de rota API antes de tocar no banco.
- [ ] Tokens de convite salvos como hash, não texto puro.
- [ ] Slugs de sala não sequenciais (crypto random).
- [ ] Rotas privilegiadas fazem checagem server-side (não confiar no client).
- [ ] Rate limit em `/api/auth/*` e `/api/livekit/token`.
- [ ] Erros não vazam informação (ex: "sala não existe" vs "sem permissão" → sempre a mesma mensagem).
- [ ] `updated_at` triggers onde faz sentido.
- [ ] Logs sem PII/tokens.

---

## Próximo passo

Fase 1 em andamento: bootstrap do Next.js. Assim que estiver rodando, seguimos para o design system.

---

# 📦 Roadmap pós-MVP (Fases 10 → 20)

Depois que as Fases 0-9 estabilizarem e você conseguir usar com 1-2 amigos, este é o plano
para transformar o Circly em algo "sério" pra convidar mais gente.

## Fase 10 — Moderação e ciclo de vida da sala · ~4-6h

- Host mute/kick via LiveKit `RoomServiceClient` (endpoint `/api/livekit/moderate`)
- Menu contextual só pra host no `ParticipantTile`
- Confirmação em ações destrutivas (sair, encerrar sala) via `<Dialog>`
- Cleanup automático: quando o último participante sai, marca `active=false`
- Job periódico que reconcilia `rooms` ativas vs. `list_active_rooms` do LiveKit

## Fase 11 — Conta, LGPD e rate limit · ~4h

- `/onboarding`: escolher username custom na primeira vez
- `/conta`: editar perfil, upload de avatar (Supabase Storage), apagar conta com dupla confirmação
- Recuperação de erro de câmera bloqueada (instruções por navegador)
- Rate limit em `/api/livekit/token` e `/api/auth/otp` via Upstash Redis free tier

## Fase 12 — Chat persistente + DMs · ~1 dia

- Chat da sala grava em `messages` (histórico últimos 100)
- Migration 0005: `direct_messages` com RLS 1:1
- `/mensagens` com lista de conversas + badge de não lidas
- `/mensagens/[username]` thread Realtime

## Fase 13 — Rich media na call · ~1 dia

- Screen share com áudio do sistema
- Upload de imagem no chat (drag/drop/paste) → bucket `room-uploads` com expiração
- Reações rápidas (~8 emojis) por mensagem — tabela `message_reactions`
- Notificação sonora em eventos-chave

## Fase 14 — UX de call avançado · ~3-4h

- Push-to-talk com bind de tecla (padrão Espaço)
- Status customizado (40 chars + emoji)
- Indicador "escutando" (headphone)

## Fase 15 — Compliance LGPD + polish mobile · ~2h

- `/termos` — Termos de Uso adaptados
- `/privacidade` — Política de Privacidade (dados coletados, retention, LGPD, hosting)
- QA em iOS Safari + Android Chrome, controles acessíveis com uma mão

## Fase 16 — PWA installable · ~2h

- `public/manifest.json` com ícones da marca
- Service worker mínimo (offline shell)
- Prompt de instalação nativo (Chrome/Edge)

## Fase 17 — Multi-idioma (i18n) · ~4-6h

- `next-intl` como base
- `messages/pt-BR.json`, `en.json`, `es.json`
- Seletor de idioma no `/conta`
- Detecção `Accept-Language` no primeiro acesso

## Fase 18 — Recording com consentimento · ~1-2 dias

- Consentimento **explícito de todos os participantes** antes de iniciar
- LiveKit Egress API (RoomComposite) → MP4 no Supabase Storage
- Indicador REC pulsando na topbar
- Só o host controla start/stop
- `/salas/[id]/gravacoes` com reprodutor
- Expiração automática 30 dias

## Fase 19 — Filtros de vídeo · ~1 dia

- MediaPipe SelfieSegmentation no browser (sem servidor)
- Sem filtro / desfoque / imagem de fundo
- Toggle na pré-entrada + botão durante call
- Fallback quando GPU/CPU não aguenta

## Fase 20 — Deploy produção + observabilidade · ~3-4h

- Deploy Vercel com env vars de produção
- Domínio custom (se comprado)
- URLs de redirect Supabase Auth atualizadas
- Sentry free (5k eventos/mês)
- `/api/health` endpoint
- Alerta email se `/api/livekit/token` responder 5xx > 5%
- Backup semanal do Postgres (Supabase já faz PITR de 7 dias no free)

---

## Marcos de release sugeridos

- **Beta fechado (3-5 amigos):** após Fase 12
- **Beta aberto (~20 pessoas):** após Fase 15
- **Produção 1.0:** após Fase 20

Total estimado: ~10-12 dias corridos de trabalho focado.
