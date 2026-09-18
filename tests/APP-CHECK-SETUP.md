# Firebase App Check setup

Live diagnosis on 2026-09-18: the public site's Firebase SDK logged `Missing appcheck token`. A read-only request to the configured RTDB `presence.json` endpoint returned the same server error. The client previously did not initialize App Check at all.

This patch initializes App Check before Firestore/Realtime Database and enables token refresh. It does not alter Firebase enforcement or security rules.

## Required configuration before merging/deploying

1. Open Firebase project `wildsaura-1ef8a` > App Check > Apps. Select the web app matching the deployed `VITE_FIREBASE_APP_ID`.
2. Use the provider already registered for that web app; do not switch providers or create a new key unnecessarily.
3. In Vercel's `wildsaura` project, set:
   - `VITE_FIREBASE_APPCHECK_SITE_KEY`: the provider's **public site key**, not the secret key.
   - `VITE_FIREBASE_APPCHECK_PROVIDER`: exactly `recaptcha-v3` or `recaptcha-enterprise`, matching Firebase registration.
4. Confirm the reCAPTCHA key's authorized domains include the actual production domains `wildsaura.com` and `www.wildsaura.com`. Include other domains only if this web app is intentionally served there.
5. Build/deploy this change after saving the environment variables. Vite embeds these values at build time.
6. Verify from a normal browser: photos load, a signed-out visit writes a new RTDB event, and the signed-in admin dashboard reads current and historical data. Check Firebase App Check metrics for valid requests.

Do not place reCAPTCHA secret keys, service-account keys, or App Check debug tokens in client environment variables. Do not disable enforcement or make analytics public as a workaround.

Provider registration and the public site key were not available during this change. Live recovery remains unverified until these settings and the deployment are complete. The independent cause of every Firestore timeout has not been established; the RTDB App Check rejection is directly verified.

## Verification

- `node --experimental-vm-modules --test tests/firebase-app-check.test.mjs`
- `npx tsc --noEmit`
- `npm run build`

The five SDK-boundary tests cover both supported providers, initialization order, automatic refresh, missing configuration, and server rendering. They do not attest a real browser or exercise a registered reCAPTCHA key.
