# duee. — AI-Powered Student Planner

**duee.** is a smart student planner with a built-in AI tutor, grade calculator, study timer, and assignment tracker.

## Features

- **AI Tutor** — chat with an AI that knows your classes and deadlines. Ask "I have 30 minutes, what should I work on?" and get a prioritized list.
- **Smart Calendar** — add and manage assignments directly from month, week, and day views.
- **Grade Calculator** — track grades per class with weighted or points-based grading and a final exam projector.
- **Study Timer** — Pomodoro timer that tracks study time daily.
- **Streaks** — daily login streaks to keep you consistent.
- **Persistent AI Memory** — the AI remembers things about you across conversations.
- **Chat History** — all AI conversations are saved and searchable.
- **Image Upload** — paste screenshots of assignments into the AI chat.
- **Dark Mode** — full dark mode support.
- **Pro Plan** — unlimited AI messages and image analysis via Lemon Squeezy.

## Tech Stack

- **Framework** — Next.js 15 (App Router)
- **Auth & DB** — Supabase
- **AI** — OpenRouter (dynamic free model selection with vision fallback)
- **Payments** — Lemon Squeezy
- **Styling** — Custom CSS (Space Grotesk font)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file:

```env
OPENROUTER_API_KEY=

NEXT_PUBLIC_APP_URL=https://yourdomain.com

LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEEKLY_VARIANT_ID=
LEMONSQUEEZY_MONTHLY_VARIANT_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=

SUPABASE_SERVICE_ROLE_KEY=

ADMIN_SECRET=
```

## Admin Dashboard

Visit `/admin` and enter your `ADMIN_SECRET` to see total users, active users, signup chart, platform usage, subscribers, and estimated revenue.

## Deployment

Deploy to [Vercel](https://vercel.com) — connect the GitHub repo and add environment variables in the Vercel dashboard.
