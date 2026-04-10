# GRAIN

> One shot. No retakes. No lies.

A constraint-driven social platform that captures real life as it happens. No editing, no curation, no filters — just 12 shots a week posted directly to your grid.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React Native + Expo |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma |
| Image Storage | Supabase Storage |
| Hosting | Railway (backend) + Expo EAS (mobile) |

---

## Project Structure

```
grain/
├── backend/          # Express API
│   ├── prisma/       # DB schema + migrations
│   └── src/
│       ├── middleware/
│       └── routes/
└── frontend/         # Expo React Native app
    └── src/
        ├── components/
        ├── context/
        └── screens/
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL (or Supabase account)

### Setup

```bash
# Install all dependencies
npm run install:all

# Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env with your DB credentials, then:
npm run db:push

# Start backend (port 4000)
npm run backend

# Start frontend (in a new terminal)
npm run frontend
```

---

## Deployment

### Backend → Railway

1. Push this repo to GitHub
2. Create a new project on [railway.app](https://railway.app)
3. Connect your GitHub repo, set root to `/backend`
4. Add environment variables from `backend/.env.example`
5. Railway auto-deploys on every push to `main`

### Database + Storage → Supabase

1. Create a project on [supabase.com](https://supabase.com)
2. Copy the connection string into `DATABASE_URL`
3. Create a storage bucket named `posts` (set to public)
4. Copy project URL + service key into env vars

### Frontend → Expo EAS

```bash
cd frontend
npm install -g eas-cli
eas build --platform all
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random 64-byte hex string |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `PORT` | Server port (default 4000) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Your Railway backend URL |

---

## Known Issues / TODO

- [ ] Shot reset cron job (shots never auto-replenish currently)
- [ ] `lastPostedAt` not updated on post creation
- [ ] Image storage needs migrating from local disk to Supabase
- [ ] JWT secret must be set via env var (not hardcoded)
- [ ] CORS origin needs locking down for production

---

## Core Features (MVP)

- One-shot in-app camera (no uploads, no retakes)
- 12 shots per week film roll system
- Instant grid posting (chronological, permanent)
- Friend system with requests
- Chronological feed (no algorithm)
- Single emoji reactions

