# Daily

A daily todo tracker: keep a routine of things you want to do every day, tick
them off, and look back at how the week went.

Built with Nuxt 4, Vue 3, Tailwind CSS and Supabase (Google sign-in + Postgres
with row level security).

## Getting started

```bash
yarn install
cp .env.example .env   # fill in your Supabase URL and anon key
yarn dev
```

| Script            | What it does                          |
| ----------------- | ------------------------------------- |
| `yarn dev`        | Dev server on http://localhost:3000   |
| `yarn build`      | Production build                      |
| `yarn preview`    | Serve the production build locally    |
| `yarn typecheck`  | Type check every file, templates too  |

Supabase needs two things configured in the dashboard: Google enabled as an auth
provider, and `<your-origin>/auth/callback` added to the redirect allow-list.

## Project layout

Nuxt 4's `app/` convention, with data access kept out of components:

```
app/
├── assets/css/      Tailwind entry + the design system's component classes
├── components/
│   ├── app/         Shell: header, nav, toasts, confirm dialog, theme toggle
│   ├── base/        Presentation primitives (modal, spinner, progress, empty)
│   ├── history/     History day cards and stat tiles
│   ├── routine/     Routine item row
│   └── todo/        Todo row, quick add, celebration
├── composables/     State and orchestration — one per feature
├── layouts/         default (signed in) and blank (auth screens)
├── middleware/      Global auth guard
├── pages/           Routes
├── services/        Supabase queries. Pure functions, no Nuxt context
├── types/           Domain types + the hand-maintained database schema types
└── utils/           Date and todo helpers (auto-imported)
```

The dependency direction is one-way:

```
pages → composables → services → Supabase
          ↓
      components
```

- **services** are plain functions that take the Supabase client as their first
  argument. No Nuxt context, so they are safe to call after `await` and easy to
  test.
- **composables** own reactive state, optimistic updates and error handling.
  `useDailyBoard` powers both the Today page and the day planner, so there is
  one implementation of "what does a day look like".
- **components** receive props and emit events. They do not fetch.

## How a day works

Three tables (see [`docs/schema.sql`](docs/schema.sql)):

- `todo_items` — the reusable routine.
- `daily_todos` — one row per item per day. `item_key` links a row back to the
  routine item it came from and survives renames.
- `daily_schedule_status` — marks a day as seeded.

The first time you open today or a future day, active routine items are copied
into it and the day is marked initialised. After that the day is yours: items
you delete stay deleted, and "Pull in routine items" is the explicit way to
fetch anything added to the routine since.

Two rules protect your history:

- **Past days are never seeded.** History shows what you actually lived.
- **Renames and deletions in the routine apply to today and future days only.**
  A day you already completed keeps the names it was completed under.

## Design notes

- Light and dark themes, with the choice applied before first paint (an inline
  script in `nuxt.config.ts`) so there is no flash on load.
- Semantic classes (`.card`, `.btn`, `.input`) live in
  `app/assets/css/tailwind.css` and keep templates readable.
- Every mutation is optimistic and rolls back on failure — ticking a box never
  waits on the network.
- `window.alert` / `window.confirm` are replaced by `useToast` and `useConfirm`.
- Dates are local calendar days (`YYYY-MM-DD`) everywhere, never instants, so
  nothing shifts across the UTC boundary.

## Types

`app/types/database.types.ts` is hand-maintained to mirror the live schema, which
gives every Supabase query full type inference. If you change the schema,
regenerate it:

```bash
npx supabase gen types typescript --project-id <id> > app/types/database.types.ts
```
