# Capacitor mobile shell (side project)

This branch (`feature/capacitor-mobile-shell`) wraps the existing React web app in a **Capacitor** native shell for iOS/Android. Pilot users keep using **https://nexcourse.ai** on `main` until we intentionally merge.

## Goals for this branch

- Same UI as the web app
- Same Supabase login / same backend APIs
- Does **not** change the live Cloudflare pilot deploy from `main`

## Prerequisites

- Node 20+
- **Android:** Android Studio + SDK (this Windows machine can sync the `android/` project)
- **iOS:** macOS + Xcode (generate/open `ios/` on a Mac with `npm run cap:ios`)

## One-time / recurring commands

```bash
# From repo root, on this branch:
npm install

# Build web assets for Capacitor + copy into native projects
npm run cap:sync

# Open Android Studio
npm run cap:android

# On a Mac only — open Xcode
npm run cap:ios
```

## How API / login works in the shell

- Supabase uses existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (absolute URLs).
- Relative `/api/*` calls are rewritten at runtime to `https://nexcourse.ai` inside the native WebView (`src/lib/nativeApiBridge.ts`), so the Capacitor app hits the same Worker → Render stack as the browser.

## Branch discipline

| Branch | Purpose |
|--------|---------|
| `main` | Live pilot web app (Cloudflare + Render) |
| `feature/capacitor-mobile-shell` | Capacitor experiments only |

Do **not** run `wrangler deploy` from this branch for pilot users unless you deliberately want to ship mobile-related web changes.

## Suggested next milestones

1. Android emulator run + sign-in smoke test  
2. macOS: add/open iOS project + TestFlight internal build  
3. Deep links / auth redirect polish  
4. Safe-area / status-bar pass on real devices  
5. After pilot: merge plan + store listing assets  

## App IDs

- Capacitor `appId`: `ai.nexcourse.app`
- Display name: `NexCourse AI`
