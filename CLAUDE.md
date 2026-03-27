# Scholar Folio — Project Context

**Your research, at a glance.**

Live: https://scholarfolio.netlify.app/
Repo: https://github.com/JonasHeller1212/ResearchFolio

## What This Project Is

Scholar Folio is a SaaS web app that turns a Google Scholar profile URL into a clean, single-page research portfolio. Researchers paste their Scholar URL and instantly get a visual breakdown of their publication history, collaboration network, citation trends, and impact metrics — no manual data entry needed.

Built by Jonas Heller, Assistant Professor of Marketing at Maastricht University. His research focuses on consumer decision-making in emerging technologies (AR, VR, AI).

### Core Philosophy

> "Numbers here are context, not verdict. Use them to tell your story."

Scholar Folio is explicitly **not** an evaluation tool. The Terms of Use prohibit institutional use for ranking, comparing, or evaluating researchers for employment or promotion. It's a personal research storytelling tool.

## Marketing Strategy & Positioning

### Target Audience
- Academic researchers who want to understand and showcase their research impact
- PhD students and early-career researchers building their academic profile
- Researchers preparing tenure/promotion materials who need a quick portfolio view

### Value Proposition
- **Zero effort**: Just paste a Google Scholar URL — no manual data entry
- **Instant results**: Full portfolio generated in seconds
- **Visual storytelling**: Charts, network graphs, and narrative summaries that bring dry metrics to life
- **Honest framing**: Metrics as context, not judgment

### Acquisition Funnel
1. **Top of funnel**: Free guest access (3 searches, no sign-up required) lowers the barrier to zero
2. **Conversion**: After seeing value, users sign up for 5 additional free searches
3. **Monetization**: Power users buy credit packs (15 for €5, 40 for €10)
4. **Retention**: 72-hour caching means repeat visits are free — users keep coming back without burning credits

### Key Differentiators
- No sign-up wall for first experience (try before you commit)
- Cache hits are free (rewards loyalty)
- Credits never expire (no pressure tactics)
- Chrome extension for in-context Scholar analysis
- Journal ranking badges (SJR, JCR, FT50, ABS, ABDC) add unique value not found elsewhere
- Auto-generated researcher narrative provides qualitative insight beyond raw numbers

### Distribution Channels
- Direct web app (Netlify-hosted)
- Chrome extension (injects into Google Scholar pages)
- GitHub open source (community + SEO)
- LinkedIn (founder's academic network)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Visualization | Recharts (charts), D3.js (network graphs) |
| Backend | Supabase Edge Functions (Deno runtime) |
| Database | Supabase PostgreSQL with RLS |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Payments | Stripe Checkout |
| Data Sources | SerpAPI (primary), direct Scholar scraping (fallback), OpenAlex, CrossRef, Semantic Scholar, Scimago |
| Hosting | Netlify |
| Testing | Vitest, React Testing Library |

## Project Structure

```
src/
  components/         27 UI components (LandingPage, ProfileView, CitationsChart, CitationNetwork, etc.)
  contexts/           AuthContext (Supabase session + credit balance)
  services/
    scholar/           Profile fetching, HTML parsing, caching, rate limiting
    metrics/           h-index, g-index, i10-index, growth trends, collaboration scores
    journal/           Journal ranking lookups (FT50, SJR, JCR, ABS, ABDC)
    openalex/          OpenAlex venue metadata
    crossref/          CrossRef DOI/metadata
    semantic/          Semantic Scholar integration
    scimago/           Scimago journal rankings
  types/              TypeScript interfaces (ScholarProfile, Publication, etc.)
  utils/              Name normalization, URL validation, analytics
  data/               1000+ journal rankings database, metric descriptions

supabase/
  functions/
    scholar/           Main data-fetching edge function (SerpAPI + fallback)
    create-checkout/   Stripe checkout session creation
    stripe-webhook/    Payment webhook (adds credits on purchase)
  migrations/          PostgreSQL schema (scholar_cache, user_credits, credit_purchases, request_logs)
```

## Key Data Flow

1. User enters Google Scholar URL or searches by name
2. Supabase edge function called → tries SerpAPI, falls back to direct scraping
3. HTML parsed → publications extracted (venue, year, citations)
4. Citation graph extracted → trend analysis computed
5. Metrics calculated → all indices, growth rates, collaboration scores
6. Results cached 72 hours in Supabase → repeat visits are instant and free
7. Frontend renders across 4 tabs: Impact Metrics, Citation Trends, Co-author Network, Publications

## Database Tables

- **`scholar_cache`** — Cached profile data (72-hour TTL)
- **`user_credits`** — Per-user balance (5 free on signup, auto-created)
- **`credit_purchases`** — Stripe records (idempotent via session_id)
- **`request_logs`** — Usage analytics

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage
```

## Environment Variables

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Edge function secrets (set via `supabase secrets set`):
```
SERPAPI_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

## Important Design Decisions

- **Cache hits are free** — only fresh API calls consume credits
- **No institutional use** — Terms prohibit using for hiring/ranking decisions
- **Fallback scraping** — if SerpAPI is down, falls back to direct HTML scraping
- **Author name normalization** — handles initials, prefixes (van, de, von), suffixes (Jr., III), nicknames
- **Rate limiting** — 10 profiles/hour per IP, Google "unusual traffic" detection handled
- **Idempotent webhooks** — Stripe payments deduplicated by session_id
