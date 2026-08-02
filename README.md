# Daily

A daily todo tracker built around one idea: **you keep a routine, and every day
gets its own copy of it.** Tick things off today, adjust a specific day when life
gets in the way, and look back at how the week actually went — without ever
rewriting the past.

Nuxt 4 · Vue 3 · Tailwind CSS · Supabase (Google sign-in + Postgres with row
level security).

---

## Contents

- [Getting started](#getting-started)
- [Scripts](#scripts)
- [How the app works](#how-the-app-works)
- [Data model](#data-model)
- [Project layout](#project-layout)
- [Architecture](#architecture)
- [Testing](#testing)
- [Design notes](#design-notes)
- [Gotchas worth knowing](#gotchas-worth-knowing)

---

## Getting started

```bash
yarn install
cp .env.example .env   # fill in your Supabase URL and anon key
yarn dev               # http://localhost:3000
```

You need a Supabase project with:

1. **Google enabled** as an auth provider.
2. `<your-origin>/auth/callback` in the **redirect allow-list** (e.g.
   `http://localhost:3000/auth/callback` and your production origin).
3. The three tables and their RLS policies — see [`docs/schema.sql`](docs/schema.sql).

The anon key is safe to expose: every table is protected by row level security,
so the key alone grants access to nothing.

## Scripts

| Script                | What it does                                     |
| --------------------- | ------------------------------------------------ |
| `yarn dev`            | Dev server with HMR                              |
| `yarn build`          | Production build                                 |
| `yarn preview`        | Serve the production build locally               |
| `yarn typecheck`      | Type check every file, templates and tests too   |
| `yarn test`           | Run the whole test suite once                    |
| `yarn test:watch`     | Re-run tests as you edit                         |
| `yarn test:unit`      | Only the fast pure-unit project                  |
| `yarn test:nuxt`      | Only the Nuxt-environment project                |
| `yarn test:coverage`  | Test suite plus a coverage report                |
| `yarn verify`         | `typecheck` + `test` — run this before pushing   |

---

## How the app works

Three screens, each backed by one composable.

### Today (`/`)

The day's board. Items are sorted with open ones first (A→Z) and completed ones
below, most recently finished on top. You can tick, rename, delete, or add a
one-off task that exists only for today. Finishing everything triggers a
celebration and updates your streak.

Opening a day for the first time **seeds** it from your active routine. See
[the seeding rules](#seeding-the-rule-that-matters-most) below.

### Plan (`/plan`)

Two tabs. It opens on **Specific day**; `?tab=routine` opens the other.

- **Specific day** — pick any day from today onward and shape it without
  touching your routine. Add a one-off, delete something you know you will skip,
  or *Pull in routine items* to fetch anything added to the routine since.
- **Routine** — the reusable list. Add, rename, pause/resume, or delete items.
  Changes here propagate to today and every future day, never to history.

`/config` redirects here, so old bookmarks keep working.

### History (`/history`)

Past days grouped by date, with a roll-up across the range: days tracked,
average completion, perfect days, and current streak. Presets cover the last
7/30/90 days, or pick an explicit range. You can still tick or delete an item
you got wrong.

---

## Data model

Three tables, all owned by the signed-in user (full DDL in
[`docs/schema.sql`](docs/schema.sql)):

| Table                   | Holds                                                       |
| ----------------------- | ----------------------------------------------------------- |
| `todo_items`            | The reusable routine: what should appear on a normal day.    |
| `daily_todos`           | One row per item per calendar day. This is the real record.  |
| `daily_schedule_status` | A flag marking a day as already seeded from the routine.     |

**`item_key` is the spine.** It is generated once when an item is created and
never changes, linking a routine item to its daily copies. Renames therefore
propagate correctly, and a day keeps the right lineage even after the name
changes. Matching on `item_name` instead would break the moment anything is
renamed.

### Seeding: the rule that matters most

When you open a day, `loadDay()` decides whether to fill it from your routine.
Three guards keep this honest:

1. **Past days are never seeded.** History shows what you actually lived, not
   what your routine looks like today.
2. **A day that already has rows is marked initialised, not topped up.** Items
   you deliberately deleted do not creep back the next time you visit.
3. **Seeding happens once per day.** After that, *Pull in routine items* is the
   explicit way to bring in anything new.

Correspondingly, routine edits are forward-only: renaming, pausing or deleting a
routine item affects today and future days, and leaves history untouched.

---

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

docs/schema.sql      Reference DDL and RLS policies
test/                See "Testing"
```

## Architecture

The dependency direction is one-way:

```
pages → composables → services → Supabase
          ↓
      components
```

**`services/`** are plain functions whose first argument is the Supabase client.
No Nuxt context, so they are safe to call after `await` and can be tested with a
fake client — no browser, no Nuxt bootstrap. This is why most of the suite runs
in milliseconds.

**`composables/`** own reactive state, optimistic updates and error handling.
`useDailyBoard` powers both the Today page and the day planner, so there is a
single implementation of "what a day looks like" rather than two that drift.

**`components/`** receive props and emit events. They never fetch.

Every mutation is optimistic: local state updates immediately and rolls back if
the write fails, so ticking a box never waits on the network.

---

## Testing

284 tests across two Vitest projects, configured in
[`vitest.config.ts`](vitest.config.ts).

| Project | Environment | Covers                                    |
| ------- | ----------- | ----------------------------------------- |
| `unit`  | Node        | `app/utils`, `app/services`               |
| `nuxt`  | happy-dom   | `app/composables`, components, middleware  |

```bash
yarn test            # everything
yarn test:unit       # the fast project only
yarn test:coverage   # with a coverage report
```

### How the layers are tested

**Utils** are pure functions, tested directly. Most edge cases live here: month
and year rollovers, leap years, slug truncation, streaks that span a gap.

**Services** run against `test/helpers/fakeSupabase.ts` — a small in-memory
stand-in that models the query builder: filters (`eq`/`gte`/`lte`), ordering,
column projection, insert/update/delete/upsert, and **unique constraints**, so a
duplicate insert really does raise a Postgres `23505`. Tests assert on resulting
table state rather than on which methods were called, which means they survive
refactors of the query itself. `failNext()` injects errors to exercise rollback
paths.

**Composables** run in the Nuxt environment with `useSupabaseClient` and
`useSupabaseUser` replaced via `mockNuxtImport`, so `useAuth` and the real
reactivity are exercised end to end against the fake database.

**Components** are mounted with `mountSuspended` and driven through the DOM —
clicking the checkbox, typing in the inline editor, pressing Enter and Escape.

### Determinism

- The clock is frozen with `vi.setSystemTime`, since "today" is central to
  nearly every rule.
- `TZ` is pinned to **Asia/Dhaka (UTC+6)** in the Vitest config. This is
  deliberate: it is far enough east that a naive `toISOString()` reports the
  *previous* day for most of the morning, so the tests would catch that whole
  bug class rather than passing by accident in UTC.
- Supabase env vars are stubbed with placeholders in the config, so the suite
  never reaches for a real project.

### What the tests found

Worth recording, because each is the kind of bug tests exist for:

- `app/utils/todo.ts` depended on Nuxt auto-imports, so it could not be imported
  outside the Nuxt build. Now imports explicitly.
- A todo's title was rendered as a `disabled` button when not editable, making
  the row's toggle handler dead code on the History page.
- `consumePostLoginPath` accepted `//evil.example.com` as an "internal" path —
  a real open redirect, reachable via `/login?redirect=//evil.com`. Now rejects
  protocol-relative and absolute URLs.

---

## Design notes

- Light and dark themes. The stored choice is applied by an inline script in
  `nuxt.config.ts` **before first paint**, so there is no flash on load;
  `useTheme` only keeps it in sync afterwards.
- Semantic classes (`.card`, `.btn`, `.input`) live in
  `app/assets/css/tailwind.css` and keep templates readable.
- `window.alert` / `window.confirm` are replaced by `useToast` and a
  promise-based `useConfirm`.
- Dates are local calendar days (`YYYY-MM-DD`) everywhere, never instants.
- `prefers-reduced-motion` is respected globally.

## Gotchas worth knowing

**`useSupabaseUser()` returns a JWT payload, not a `User`.** In
`@nuxtjs/supabase` 2.x the account id is the **`sub`** claim; there is no `id`
property. Worse, `JwtPayload` has an `[key: string]: any` index signature, so
`user.value.id` type checks cleanly and is `undefined` at runtime. Always go
through `useAuth().userId` / `resolveUserId()`.

**The user state arrives asynchronously.** The client plugin fills
`useSupabaseUser()` from `page:start` and `onAuthStateChange`, so a page that
loads data in `onMounted` can outrun it. `resolveUserId()` falls back to
`getClaims()` for exactly this reason.

**Dates must not go through `toISOString()`.** Use `toDateKey()` / `fromDateKey()`
from `app/utils/date.ts`; they work in local time and will not shift a day.

**Database types are hand-maintained.** `app/types/database.types.ts` mirrors the
live schema and is what gives every Supabase query full inference. Regenerate it
after a schema change:

```bash
npx supabase gen types typescript --project-id <id> > app/types/database.types.ts
```
