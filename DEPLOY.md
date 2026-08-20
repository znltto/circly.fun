# Deploy — Circly

Guia de deploy para produção. Assume que o MVP local está funcionando.

---

## 1. Pré-requisitos

- Repositório Git no GitHub, GitLab ou Bitbucket
- Conta gratuita em <https://vercel.com>
- Projeto Supabase já configurado (região São Paulo)
- Projeto LiveKit Cloud já configurado
- (Opcional) Domínio custom — sugerido `circly.com.br` ou `circly.app`

---

## 2. Push do código

```bash
cd C:\Users\Arthur\Documents\SourceCode\Circly
git add -A
git commit -m "chore: preparar deploy inicial"

# Cria repo no GitHub via CLI ou UI, então:
git remote add origin git@github.com:seu-user/circly.git
git push -u origin main
```

⚠️ **Confirme antes de push:** o `.gitignore` cobre `.env.local` e `node_modules`. Rode `git status` e certifique que nenhum segredo vai junto.

---

## 3. Import no Vercel

1. Acesse <https://vercel.com/new>
2. Escolha o repositório do Circly
3. Framework preset: **Next.js** (detectado automaticamente)
4. Root directory: `./` (padrão)
5. Build command: `pnpm build` (padrão do Next.js)
6. Output: `.next` (padrão)

## 4. Environment variables

Cole cada uma no painel de env vars do Vercel (Settings → Environment Variables). Todas em "Production" e opcionalmente "Preview":

| Nome | Valor | Escopo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (**SEGREDO**) | Server only |
| `LIVEKIT_URL` | `wss://xxx.livekit.cloud` | Server |
| `NEXT_PUBLIC_LIVEKIT_URL` | Mesmo valor de `LIVEKIT_URL` | Client + Server |
| `LIVEKIT_API_KEY` | API key LiveKit | Server |
| `LIVEKIT_API_SECRET` | Secret LiveKit (**SEGREDO**) | Server only |
| `NEXT_PUBLIC_APP_URL` | URL final do Vercel (ex: `https://circly.vercel.app` ou domínio custom) | Client + Server |

Não marque nenhuma como "System Environment Variables" — todas são custom.

---

## 5. Atualizar redirects no Supabase Auth

Depois do primeiro deploy, você sabe a URL final. Volte no dashboard Supabase:

**Authentication → URL Configuration:**

- **Site URL:** `https://circly.vercel.app` (ou seu domínio custom)
- **Redirect URLs:** adicionar
  - `https://circly.vercel.app/**`
  - Se tiver domínio custom: `https://circly.com.br/**`

Salve.

---

## 6. Domínio custom (opcional)

No Vercel: Settings → Domains → Add. Cole o domínio. Vercel dará instruções DNS (adicionar registro CNAME ou A no seu provedor).

Após propagar (5-30 min), atualize:

- `NEXT_PUBLIC_APP_URL` no Vercel
- Site URL + Redirect URLs no Supabase
- Faça redeploy

---

## 7. Health check + monitoramento

`/api/health` já está pronto. Configure monitoramento externo:

- <https://uptimerobot.com> — free tier: 50 monitors, checagem a cada 5 min
- Adicione um HTTP monitor apontando pra `https://circly.vercel.app/api/health`
- Alertas por email quando cair

---

## 8. Sentry (opcional, mas recomendado)

Captura erros de client em produção.

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Free tier: 5k eventos/mês. Suficiente pro início.

---

## 9. Backup

Supabase Free faz **Point-in-Time Recovery de 7 dias** automaticamente — não precisa configurar.

Para backup off-site opcional:

```bash
# rodar semanalmente via cron externo (ex: GitHub Actions)
pg_dump "postgresql://postgres:[PASSWORD]@db.yqoisfymbwpequokxynt.supabase.co:5432/postgres" > backup-$(date +%Y%m%d).sql
```

---

## 10. Pós-deploy — checklist

- [ ] Landing carrega em `/`
- [ ] `/entrar` envia OTP e recebe no email
- [ ] `/inicio` mostra saudação e amigos
- [ ] Criar sala funciona
- [ ] Link de convite funciona em aba anônima
- [ ] `/api/health` responde 200
- [ ] `/manifest.json` carrega
- [ ] Ícones PWA aparecem quando "Instalar app"
- [ ] `/termos` e `/privacidade` acessíveis
- [ ] Middleware bloqueia rotas privadas sem sessão
- [ ] Onboarding força escolha de username na primeira vez
- [ ] LiveKit conecta em um teste real com 2 pessoas
- [ ] Screen share funciona
- [ ] Chat da sala funciona
- [ ] DMs entre amigos funciona

---

## 11. Alertas e limites do free tier

Marque no calendário / lembrete:

- **LiveKit:** 5.000 min WebRTC/mês. Alerta em 70% (3.500 min): trocar pra Grow ($50/mês para 100k min)
- **Supabase Free:** projeto pausa após 1 semana inativo. Fazer um cron mensal ou upgrade Pro ($25/mês) se for pra produção séria
- **Vercel Hobby:** bandwidth 100 GB/mês. Se estourar, upgrade Pro ($20/mês)

---

## 12. Rollback rápido

Se algo quebrar após deploy:

- Vercel → Deployments → clicar no deploy anterior → **Promote to Production**. Volta imediato.
- Para o banco: Supabase Dashboard → Database → Backups → escolher timestamp e restore.

---

## 13. Gravação de reunião (LiveKit Egress) — opcional

A gravação é **desligada por padrão**. Enquanto `LIVEKIT_EGRESS_ENABLED` não estiver `true`, o botão de gravar não aparece na sala e os endpoints devolvem 501. Passos para ligar:

### 13.1. Habilitar Egress no LiveKit Cloud

1. LiveKit Cloud → seu projeto → **Settings → Egress**
2. Clique em **Enable Egress** (pode exigir plano pago dependendo do volume — Free tem uma cota limitada)
3. Não é preciso configurar workers próprios — LiveKit Cloud hospeda tudo

### 13.2. Criar bucket no Supabase Storage

1. Supabase Dashboard → **Storage → New bucket**
2. Nome: `recordings`
3. **Public bucket:** OFF (privado — só acessível via URL assinada)
4. Salvar

### 13.3. Gerar S3 Access Keys no Supabase

1. Supabase Dashboard → **Settings → Storage → S3 Connection**
2. Habilite "Enable connection" se necessário
3. Clique em **New access key**
4. Descreva como "livekit-egress"
5. Copie o Access Key ID + Secret Access Key (aparece uma vez)

### 13.4. Environment variables no Vercel

Adicione em Settings → Environment Variables:

| Nome | Valor | Escopo |
|---|---|---|
| `LIVEKIT_EGRESS_ENABLED` | `true` | Server |
| `SUPABASE_S3_ENDPOINT` | `https://<project-ref>.storage.supabase.co/storage/v1/s3` | Server |
| `SUPABASE_S3_ACCESS_KEY` | Access Key ID | Server |
| `SUPABASE_S3_SECRET_KEY` | Secret Access Key (**SEGREDO**) | Server |
| `SUPABASE_S3_REGION` | `sa-east-1` (ou a região do seu projeto Supabase) | Server |
| `SUPABASE_S3_BUCKET` | `recordings` | Server |

Redeploy.

### 13.5. Webhook do LiveKit → sua app

O webhook atualiza status/tamanho/duração da gravação quando o Egress termina.

1. LiveKit Cloud → seu projeto → **Settings → Webhooks**
2. **URL:** `https://<seu-dominio>/api/livekit/egress-webhook`
3. **Events:** marque `egress_started`, `egress_updated`, `egress_ended`
4. Salvar. A assinatura HMAC é validada com `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` que já estão configurados.

### 13.6. Consentimento por sala (opcional)

A coluna `rooms.recording_consent_required` está em `false` por padrão. Para forçar o modal de consentimento antes do participante entrar, atualize a linha da sala manualmente ou (futuro) via UI de configurações. Exemplo SQL:

```sql
update public.rooms set recording_consent_required = true where slug = 'xxxxxx';
```

### 13.7. Rodar a migration

```
Nome do arquivo: supabase/migrations/0007_recordings.sql
```

Aplique via `supabase db push` (CLI local) ou copie o SQL para Supabase Dashboard → SQL Editor. Idempotente.

### 13.8. Custos e limites

- **LiveKit Egress Cloud:** cobrado por minuto de gravação. Consulte pricing atual — usualmente ~$0.005/min para 720p composite. Uma reunião de 1h ≈ $0.30.
- **Supabase Storage:** free tier tem 1 GB de storage. Reuniões composite MP4 720p ~= 40-60 MB/hora. Configure alertas.
- **Retenção:** a coluna `expires_at` marca 30 dias — implementar um job de limpeza é responsabilidade futura. Por ora as linhas ficam mas o arquivo do bucket precisa ser removido manualmente (ou configure Storage lifecycle policy no bucket).
