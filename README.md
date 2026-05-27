# API Key Monitor

A secure web app for developer teams to track, manage, and monitor API keys — expiry tracking, uptime checks, Slack alerts, and a machine-readable API for external tools.

## Features

- **Key Management** — Store API keys encrypted at rest (AES-256-GCM). Track expiry dates, tags, and notes.
- **Uptime Monitoring** — Per-key health checks via configurable HTTP endpoints. Supports header, query param, body, or custom injection formats.
- **Dashboard** — Summary cards, sortable key table with inline expiry/monitor status, response time display.
- **Slack Notifications** — Webhook-based alerts when a monitor fails or a key is expiring soon.
- **Access Token API** — Issue scoped bearer tokens so CI/CD pipelines and external tools can fetch key values programmatically.
- **Multi-user** — Team accounts with admin/member roles. First registered user becomes admin.
- **Auth** — Credentials login + optional GitHub OAuth.

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set AUTH_SECRET and ENCRYPTION_KEY (see comments inside)

# 3. Run database migrations
npx prisma migrate deploy

# 4. Start dev server
npm run dev
```

Open http://localhost:3020 and register the first account (automatically becomes admin).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path, e.g. `file:./dev.db` |
| `AUTH_SECRET` | Yes | NextAuth secret — `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Yes | 64-char hex key for AES-256-GCM — `openssl rand -hex 32` |
| `AUTH_GITHUB_ID` | No | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | No | GitHub OAuth app client secret |
| `NEXTAUTH_URL` | No | Full URL of your deployment (required in production) |

## External API

Issue an access token in Settings → API Access Tokens, then:

```bash
# Fetch a key by name (returns decrypted value)
curl -H "Authorization: Bearer atm_..." \
  http://localhost:3020/api/v1/keys/OpenAI%20Production

# List all keys with values
curl -H "Authorization: Bearer atm_..." \
  "http://localhost:3020/api/v1/keys?reveal=true"

# Filter by provider
curl -H "Authorization: Bearer atm_..." \
  "http://localhost:3020/api/v1/keys?provider=openai&reveal=true"
```

**Token scopes:**
- `read:keys` — decrypt and return key values
- `read:metadata` — names, providers, expiry only (no values)

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Prisma 7** + SQLite (swap to Postgres by changing `DATABASE_URL`)
- **NextAuth v5** (credentials + GitHub OAuth)
- **Tailwind CSS** (custom dark theme)
- **Recharts** (uptime graphs)
