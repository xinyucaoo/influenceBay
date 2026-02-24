# InfluenceBay

A marketplace connecting influencers and brands for transparent, efficient sponsorship deals.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: PostgreSQL via Prisma ORM (v7)
- **Auth**: NextAuth.js v5 (Google OAuth + email/password)
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

**Option A: Local PostgreSQL (recommended – supports Prisma Studio + Next.js simultaneously)**

```bash
# Install dependencies
npm install

# Create database (Homebrew Postgres)
createdb influencebay

# Or use Docker: npm run db:up

# Run migrations
npm run db:migrate
# Or: npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed niches
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Set `DIRECT_DATABASE_URL` in `.env`:
- Homebrew: `postgres://YOUR_USERNAME@localhost:5432/influencebay?sslmode=disable`
- Docker: `postgres://postgres:postgres@localhost:5432/influencebay?sslmode=disable`

**Option B: Prisma dev (single connection – stop Next.js before opening Prisma Studio)**

```bash
npx prisma dev --no-browser
# In another terminal: npx prisma migrate dev && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env` and configure:

```
DATABASE_URL="prisma+postgres://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""        # Optional: for Google OAuth
GOOGLE_CLIENT_SECRET=""    # Optional: for Google OAuth
```

## Features

### For Influencers
- Create a public media kit / profile
- Set pricing for different collaboration types
- Connect social accounts with follower stats
- Browse and apply to brand campaigns
- Receive contact requests from brands
- Message brands directly

### For Brands
- Create a company profile
- Post sponsorship campaigns with budgets and deadlines
- Browse and filter influencers by niche, platform, followers
- Send contact requests to influencers
- Review and manage campaign applications
- Message influencers directly

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Auth (signup, signin, role selection)
│   │   ├── brands/       # Brand discovery API
│   │   ├── campaigns/    # Campaign CRUD + applications
│   │   ├── contacts/     # Contact request system
│   │   ├── influencers/  # Influencer discovery API
│   │   ├── messages/     # Messaging API
│   │   ├── niches/       # Niche listing
│   │   └── profile/      # Profile CRUD
│   ├── auth/             # Auth pages (signin, signup)
│   ├── brand/[handle]/   # Public brand profile
│   ├── brands/           # Browse brands
│   ├── campaign/[id]/    # Campaign detail + apply
│   ├── campaigns/        # Browse campaigns
│   ├── dashboard/        # User dashboards
│   │   ├── brand/        # Brand dashboard
│   │   ├── campaigns/    # Campaign management
│   │   ├── influencer/   # Influencer dashboard
│   │   ├── messages/     # Messaging UI
│   │   └── profile/      # Profile editor
│   ├── influencer/[handle]/ # Public influencer profile
│   ├── influencers/      # Browse influencers
│   └── onboarding/       # Role selection
├── components/           # Shared components
│   ├── ui/               # shadcn/ui components
│   ├── navbar.tsx
│   └── footer.tsx
├── lib/                  # Utilities
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # Prisma client
│   └── session-provider.tsx
└── generated/prisma/     # Generated Prisma client
```
