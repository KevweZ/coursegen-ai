# Capacitor mobile shell (side project)

This branch (`feature/capacitor-mobile-shell`) wraps the existing React web app in a **Capacitor** native shell for iOS/Android. Pilot users keep using **https://nexcourse.ai** on `main` until we intentionally merge.

## What “the app” is

You are **not** installing NexCourse from the Play Store yet. Locally you:

1. Build the website into files Capacitor can bundle
2. Open that project in **Android Studio**
3. Press Run → it launches an **emulator** (fake phone on your PC) or a USB phone with the app installed

Think of Android Studio as “VS Code for Android apps,” and the emulator as a phone window on your desktop.

---

## Where do I paste the `npm` commands?

**In Cursor’s terminal** (same idea as PowerShell):

1. Open this project in Cursor (you already have it)
2. Open the terminal: **Terminal → New Terminal**, or press `` Ctrl+` ``
3. Confirm you are in the project folder. The prompt should end with something like:
   `...\Google AI Studio Code\coursegen-ai>`
4. If not, paste this first and press Enter:

```powershell
cd "C:\Users\Lenovo\Desktop\Online Course\Google AI Studio Code\coursegen-ai"
```

5. Confirm you are on the mobile branch:

```powershell
git checkout feature/capacitor-mobile-shell
git status
```

Then paste the npm commands from the sections below, one at a time, pressing Enter after each.

---

## One-time setup: install Android Studio

Your PC does **not** have Android Studio yet (required for the emulator). Do this once:

1. Download: https://developer.android.com/studio  
2. Install with defaults. When the setup wizard asks, install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)
3. Open **Android Studio** → **More Actions** → **Virtual Device Manager** (or **Device Manager**)
4. Create a device if none exists (e.g. **Pixel 7**, system image **API 34** or newer) → Finish
5. Optional but helpful: in Android Studio → **Settings → Languages & Frameworks → Android SDK**, note the “Android SDK Location” (often `C:\Users\Lenovo\AppData\Local\Android\Sdk`)

You do **not** need to learn Java/Kotlin for this smoke test — Capacitor already generated the native project.

**iOS note:** building/running the iPhone app needs a Mac + Xcode. On Windows we only smoke-test Android.

---

## Recurring: build and open the Android app

From the Cursor terminal (project root, this branch):

```powershell
npm install
npm run cap:android
```

What that does:

| Step | Meaning |
|------|---------|
| `build:capacitor` (inside the script) | Builds the web UI into `dist/` for the phone shell |
| `cap sync` | Copies `dist/` into the Android project |
| `cap open android` | Opens the `android/` folder in **Android Studio** |

First open can take several minutes (Gradle downloads). Wait until the project finishes indexing / syncing (progress at the bottom of Android Studio).

### How to “open” / run the app version

In Android Studio:

1. At the top toolbar, pick an emulator from the device dropdown (e.g. **Pixel 7 API 34**). If the list is empty, open **Device Manager** and start/create a virtual device.
2. Click the green **Run** ▶ button (or press `Shift+F10`)
3. Wait for the emulator to boot, then for “NexCourse AI” to install and launch
4. You should see the same NexCourse UI as the website, inside the phone window

That phone window **is** the app version for this side project.

### After you change web code

Re-run from Cursor’s terminal:

```powershell
npm run cap:sync
```

Then press **Run** ▶ again in Android Studio (or use Capacitor live reload later — not required for smoke test).

---

## Sign-in smoke test (milestone 1)

Once the emulator shows the app:

1. Use **email + password** (same account as the web pilot) — this stays inside the app
2. Confirm you land in the normal signed-in experience (e.g. upload / dashboard)
3. Optionally open a course / account page and confirm API calls work (loading courses, not stuck on network errors)

**Do not rely on Google sign-in for this milestone.** Google OAuth currently completes in the system browser and returns to the website; wiring it back into the app (deep links) is a later milestone.

If you only ever used Google on the website, set a password first from the web app (Account → **Email password reset link**, or Sign In → **Forgot password?**), then use that password in the emulator.

### If sign-in shows “Failed to fetch”

The Android WebView sometimes cannot call Supabase until native HTTP is enabled (`CapacitorHttp` in `capacitor.config.ts`). After pulling that fix:

```powershell
npm run cap:sync
```

Then press **Run** ▶ again in Android Studio.

### Smoke-test checklist

- [ ] Android Studio installed; at least one AVD created
- [ ] `npm run cap:android` opens the project without errors
- [ ] Emulator launches NexCourse AI
- [ ] Email/password sign-in succeeds
- [ ] Signed-in home / upload screen loads
- [ ] A simple authenticated action works (e.g. see drafts or account info)

---

## How API / login works in the shell

- Supabase uses existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `.env` (absolute URLs)
- Relative `/api/*` calls are rewritten at runtime to `https://nexcourse.ai` inside the native WebView (`src/lib/nativeApiBridge.ts`), so the Capacitor app hits the same Worker → Render stack as the browser

## Branch discipline

| Branch | Purpose |
|--------|---------|
| `main` | Live pilot web app (Cloudflare + Render) |
| `feature/capacitor-mobile-shell` | Capacitor experiments only |

Do **not** run `wrangler deploy` from this branch for pilot users unless you deliberately want to ship mobile-related web changes.

## Suggested next milestones

1. Android emulator run + email/password sign-in smoke test ← **you are here**
2. Polish: safe-area / status bar on a real Android device
3. Deep links so Google OAuth returns into the app
4. macOS: iOS / TestFlight internal build
5. After pilot: merge plan + store listing assets

## App IDs

- Capacitor `appId`: `ai.nexcourse.app`
- Display name: `NexCourse AI`

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| `npm` / `cap` command not found | Use Cursor terminal in the project folder; run `npm install` first |
| Android Studio doesn’t open | Install Android Studio; then `npx cap open android` |
| No devices in Run dropdown | Device Manager → Create Device → start the AVD |
| Blank white screen | Re-run `npm run cap:sync`, then Run again |
| Sign-in fails with network error | Emulator needs internet; check Wi‑Fi icon in the emulator |
| Google login leaves the app | Expected for now — use email/password |
| Gradle sync forever / fails | Let first sync finish; if stuck, File → Invalidate Caches / restart Android Studio |
