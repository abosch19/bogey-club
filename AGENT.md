# AGENT.md — Boggey Club

Golf league web app (mobile-first SPA). This file tells AI agents and new contributors how the project is built and what conventions to follow.

## Stack

| Area            | Tech                                               | Notes                                                                                                    |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| UI              | **React 19** (`react` / `react-dom` ^19.2)         | Function components only                                                                                 |
| Optimization    | **React Compiler** (`babel-plugin-react-compiler`) | Auto-memoization — do NOT add manual `useMemo` / `useCallback` / `React.memo`                            |
| State           | **Legend State v3** (`@legendapp/state` 3.0 beta)  | Observables + `syncObservable` with localStorage persistence                                             |
| Backend         | **Convex** (`convex` + `@convex-dev/auth`)         | Schema, queries, mutations and auth live in `convex/`                                                    |
| Routing         | **React Router v7** (`react-router`)               | Client-side routes declared in `src/App.tsx`                                                             |
| Styling         | **Tailwind CSS v4** (`@tailwindcss/vite`)          | CSS-first config via `@import 'tailwindcss'` in `src/app/globals.css` — there is no `tailwind.config.ts` |
| Build           | **Vite 5** + `@vitejs/plugin-react`                | React Compiler wired through the babel option in `vite.config.ts`                                        |
| Language        | **TypeScript 5** (strict)                          | `npm run lint` runs `tsc --noEmit`                                                                       |
| Package manager | **Bun** (`bun.lock`)                               |                                                                                                          |
| Extras          | `vaul` (bottom sheets)                             |                                                                                                          |

## Commands

```sh
bun install        # install deps
bun run dev        # Vite dev server on port 3000
bun run dev:convex # Convex dev (run alongside dev)
bun run build      # tsc + vite build
bun run lint       # typecheck (tsc --noEmit)
```

## Project layout

```
convex/              # Convex backend: schema.ts, auth.ts, queries/mutations per domain
src/
  App.tsx            # All routes + AuthGuard + TabBar layout
  main.tsx           # Entry point
  app/               # One folder per screen (Next.js-style page.tsx, but this is NOT Next.js)
  components/        # Shared components (ConvexClientProvider, HoleSheet, ui/)
  lib/
    store.ts         # Legend State observables (client-only persisted state)
    golf.ts          # Golf domain logic (handicaps, formats)
    types.ts         # Shared types
```

Path aliases: `@/*` → `src/*`, `@convex/*` → `convex/*`.

## Conventions

### React 19 + React Compiler

- The compiler memoizes automatically. Never add `useMemo`, `useCallback`, or `React.memo` by hand.
- Follow the Rules of React strictly (no conditional hooks, no mutating props/state) — the compiler depends on them.

### State

- **Server state** lives in Convex: use `useQuery` / `useMutation` from `convex/react`. Do not mirror server data into Legend State.
- **Client-only state** that must persist (e.g. last round config) goes in `src/lib/store.ts` as Legend State observables (`name$` suffix convention) with `syncObservable` + `ObservablePersistLocalStorage`.
- Ephemeral UI state: plain `useState` is fine.

### Styling

- Tailwind v4: configuration is CSS-first in `src/app/globals.css` (`:root` custom properties like `--c-bg`, `--c-accent`). No JS config file.
- Mobile-first layout with a persistent bottom `TabBar` on `/`, `/league`, `/stats`, `/profile`.

### Routing & auth

- Routes are flat `<Route>` declarations in `src/App.tsx`; screens follow the `src/app/<route>/page.tsx` pattern (a leftover from the Next.js → Vite migration — keep it).
- `AuthGuard` in `App.tsx` handles redirects; public routes: `/login`, `/register`, `/onboarding`.

### Backend (Convex)

- One file per domain in `convex/` (rounds, scores, leagues, tournaments, …); shared helpers in `convex/helpers.ts`.
- Schema in `convex/schema.ts`. Auth via `@convex-dev/auth` (`convex/auth.ts`, `auth.config.ts`).

### Quality

- `react-doctor` runs in CI on pushes to main (`doctor.config.json` excludes `convex/**`). Run the `/doctor` skill before committing React changes.
- Always finish with `bun run lint` to typecheck.
