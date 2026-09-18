# Analytics regression verification

PR #243 stopped reading historical Firestore analytics and used private reads/transactions before anonymous writes. This follow-up keeps new tracking in Realtime Database and reads existing Firestore history in the admin dashboard. It does not migrate, delete, overwrite, or invent historical data.

## Automated checks

- `npm run test:analytics` covers anonymous write-only tracking, blocked browser storage, admin exclusion, historical plus new counts, registered-visitor fallback, cross-midnight buckets, pre-existing RTDB counts, missing configuration, and permission errors.
- `npx tsc --noEmit`
- `npm run build`

The regression tests use SDK boundary doubles; they are not a live Firebase or security-rules emulator test. The 940 value is only a regression fixture, never a production fallback.

## Production check after merge

1. Keep `VITE_FIREBASE_DATABASE_URL` set for the deployment environment and allow Vercel to build the merged commit.
2. Firebase Realtime Database must have the rules in `database.rules.json` (compatible with the rules already supplied in this conversation). Do not enable public analytics reads. Existing Firestore admin-read rules must remain deployed.
3. Open the admin dashboard as the configured admin account. Historical Firestore totals should be included automatically if the records are still present and readable; the All filter shows lifetime history. A failed read is shown as an incomplete-data warning.
4. Open a separate private browser session, with no admin login, visit the home page and a second page. Verify new events and sessions under `analytics` in Firebase and increases in the open dashboard. Admin visits are intentionally excluded.
5. Close the private session and check the online count falls after disconnect/expiry.

Live historical contents and production Firebase permissions were not accessible during this fix. Restoring exactly the previously reported count cannot be confirmed until this production check. Old RTDB cumulative records do not contain enough information to reconstruct their original day-by-day history; their remaining counts retain the date available on those records. The existing public-write analytics design is not bot-proof, and lifetime event reads still need a separate aggregation/retention improvement as traffic grows.
