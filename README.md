# Circly

> **Perto, mesmo de longe.**
> Videochamadas privadas para poucas pessoas. Next.js + Supabase + LiveKit + Vercel.

## Status

MVP funcional. Fases 1–8 implementadas, Fase 9 (polimento + deploy) em curso.

Ver [`PLAN.md`](./PLAN.md) para o roteiro completo.

## O que já funciona

- Landing editorial (`/`)
- Design system catalogado em `/design`
- Login sem senha por email OTP (`/entrar` → `/verificar`)
- Home autenticada com saudação, botões e lista de amigos com presença (`/inicio`)
- Amigos: busca, solicitação, aceite, remoção (`/pessoas`)
- Presença em tempo real via Supabase Realtime
- Criação de sala com link de convite (`/salas/nova`)
- Entrada por link para usuários e visitantes (`/s/[slug]`)
- Pré-entrada com preview de câmera, seleção de dispositivos, toggles
- Chamada LiveKit real: grid adaptativo, screen share dominante, chat, controles

## Setup do zero

### 1. Contas gratuitas

Crie contas em:

- **Supabase** — <https://supabase.com> — Novo projeto (região São Paulo se possível). Anote em Settings → API:
  - `Project URL` → vira `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` → vira `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` (segredo!) → vira `SUPABASE_SERVICE_ROLE_KEY`
- **LiveKit Cloud** — <https://livekit.io> — Crie um projeto. Em Settings:
  - `WebSocket URL` (wss://...) → vira `NEXT_PUBLIC_LIVEKIT_URL`
  - `API Key` → `LIVEKIT_API_KEY`
  - `Secret Key` → `LIVEKIT_API_SECRET`

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` e cole os valores.

### 3. Migrations do banco

No Supabase Dashboard → **SQL Editor** → execute na ordem:

1. `supabase/migrations/0001_profiles.sql`
2. `supabase/migrations/0002_friendships.sql`
3. `supabase/migrations/0003_rooms.sql`
4. `supabase/migrations/0004_fix_rls_recursion.sql`
5. `supabase/migrations/0005_profiles_onboarded_at.sql`
6. `supabase/migrations/0006_direct_messages.sql`
7. `supabase/migrations/0008_message_extras.sql` (anexos e reações no chat da sala)

Cada script é idempotente e cria tabelas + RLS + triggers.

### 4. Email OTP

No Supabase Dashboard → **Authentication → Email Templates → Magic Link**, garanta que o corpo do email contém `{{ .Token }}` (ex: `Seu código Circly: {{ .Token }}`).

Padrão: OTP expira em 60 minutos — pode reduzir em Auth → Providers → Email.

### 4.1. Buckets do Storage

No Supabase Dashboard → **Storage → New bucket**, crie:

- `avatars` — **Public** (foto de perfil, URL pública).
- `room-uploads` — **Private** (imagens do chat da sala, servidas por signed URL de 24h).

Se algum bucket estiver ausente, os endpoints correspondentes respondem `501` com uma mensagem clara, mas o resto do app continua funcionando.

### 5. LiveKit — checar conexão

Se o LiveKit não estiver configurado, o botão "Entrar na sala" responderá com "LiveKit não configurado." O restante da app continua funcionando.

### 6. Rodar

```bash
pnpm install
pnpm dev
```

Abra <http://localhost:3000>.

## Comandos

| Comando          | O que faz                    |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Servidor com Turbopack       |
| `pnpm build`     | Build de produção            |
| `pnpm start`     | Servir build                 |
| `pnpm lint`      | ESLint                       |
| `pnpm typecheck` | `tsc --noEmit`               |

## Stack

- **Next.js 15** — App Router, TypeScript estrito, Server Actions
- **Tailwind CSS 3** com tokens Circly (paleta dark/light, radius, tipografia)
- **Supabase** — Auth (OTP), Postgres com RLS, Realtime (presença + chat), Storage
- **LiveKit Cloud** — WebRTC (áudio/vídeo/tela) via `@livekit/components-react`
- **Zod** — validação server-side de todos os payloads
- **Vercel** — deploy

Tudo em plano gratuito. Limites relevantes:

- LiveKit free: 5.000 minutos/mês, até 100 conexões simultâneas
- Supabase free: 50k MAU, 200 conexões Realtime, 2M mensagens/mês; projeto pausa após 1 semana inativa
- Vercel Hobby: sem custo, bandwidth generoso

## Estrutura

```
src/
  app/
    (auth)/                 # /entrar, /verificar
    (app)/                  # /inicio, /pessoas, /salas/nova (protegidas)
    s/[slug]/               # /s/xxx e /s/xxx/sala (pré-entrada + call)
    api/                    # auth/sair, auth/callback, livekit/token
  components/
    brand/                  # BrandMark, Wordmark, CcoMascot
    ui/                     # design system (Button, Input, OTPInput, Avatar...)
    layout/                 # AppShell, SidebarNav, MobileNav
    friends/                # FriendRow, FriendRequestCard, AddFriendSearch
    presence/               # PresenceProvider (Supabase Realtime)
    room/                   # DevicePreview, MeetingRoom, ParticipantGrid,
                            # ScreenShareStage, CallControls, RightDrawer,
                            # ParticipantsList, InRoomChat, RoomController
  lib/
    supabase/{client,server,admin,middleware}.ts
    livekit/token.ts
    rooms/{slug,actions,queries}.ts
    friends/{actions,queries}.ts
    utils.ts, env.ts
  styles/globals.css
  types/database.ts
supabase/
  migrations/
    0001_profiles.sql
    0002_friendships.sql
    0003_rooms.sql
```

## Segurança — decisões

- `SUPABASE_SERVICE_ROLE_KEY` e `LIVEKIT_API_SECRET` **nunca** vão ao client (importados apenas em módulos server-only).
- RLS habilitado em **todas** as tabelas com policies mínimas.
- Tokens LiveKit são emitidos por `/api/livekit/token` após validar:
  - Sessão + amizade (visibility `friends`), ou
  - Convite válido (hash correto, não expirado, dentro de `max_uses`), ou
  - Convite + `allow_guests` para visitantes.
- Convites são armazenados como SHA-256 do token; o token puro só aparece na resposta de criação da sala (uma vez).
- Slugs de sala são 8 chars aleatórios de um alfabeto de 32 símbolos (40 bits de entropia).
- Mensagens de erro em rotas de auth/entrada são genéricas — não enumeram existência.
- Zod valida todo payload de rota API/server action.

## Deploy na Vercel

1. Suba para GitHub.
2. Import no <https://vercel.com>.
3. Environment Variables: cole todas as chaves de `.env.local`.
4. `NEXT_PUBLIC_APP_URL` = URL final do deploy (ex: `https://circly.vercel.app`).
5. No Supabase → Authentication → URL Configuration, adicione a URL de produção em "Site URL" e "Redirect URLs".
6. Deploy.

## O que ainda vai ser feito (Fase 9)

- Rate limiting em `/api/auth/*` e `/api/livekit/token`
- Ações de moderação do host (mute all, kick) via LiveKit RoomService server-side
- Persistência opcional de chat em `messages`
- Auditoria de RLS
- Métricas mínimas
- Onboarding para escolher username/display_name
```
