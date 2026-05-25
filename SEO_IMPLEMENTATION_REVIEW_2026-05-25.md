# React SPA SEO Engineering Review (Indexing Focus)

Date: 2026-05-25  
Reviewer role: Senior Technical SEO Engineer (SPA / JavaScript indexing)

## Scope reviewed
- Routing and deep linking behavior in `src/App.tsx`
- Runtime metadata and structured data management in `src/utils/seo.ts`
- Sitemap generation in `api/sitemap.js`, `api/sitemap.xml.js`, and static `public/sitemap.xml`
- Photo page entry points and rendering behavior in `src/components/PhotoGridPage.tsx`, `src/components/PhotoCard.tsx`, and `src/components/PhotoModal.tsx`

## High-confidence findings

### 1) Routing architecture is custom History API, not React Router (crawl risk: medium)
The app relies on manual `window.history.pushState` / `popstate` and internal view state instead of declarative route components.

Why this matters:
- Google can render JS, but manual route state increases risk of route-state mismatches during render queueing.
- The app supports deep links like `/photo/:id` and `/story/:slug`, but many states are modal-based overlays on the home document, not truly separate route components.

Observed behavior:
- Path parsing is done manually on boot for `/photo/:id` and `/story/:slug`.
- Popstate handler updates selected entities based on loaded runtime data.
- Routing to `/photos` maps to a specific view, but individual photo pages are opened as modal state with path updates.

Recommendation:
- Migrate to file- or component-based routing (`react-router`) with route-level elements for `/photo/:slug` and `/story/:slug`.
- Keep modal UX via route layering (background location pattern) while preserving canonical route semantics.

### 2) Canonical and OG URL inconsistency for photos (crawl risk: high)
Photo links in cards use `slug || firestoreId || id`, but SEO metadata canonical uses `firestoreId || id` and ignores `slug`.

Why this matters:
- The same photo can resolve under multiple URL variants (slug-based and ID-based), causing canonical mismatch and index fragmentation.
- Internal links and sitemap primarily emit slug URLs, while runtime canonical may point to ID URL.

Recommendation:
- Single URL strategy: always canonicalize to slug (`/photo/:slug`) where available.
- Ensure `updatePhotoMeta` receives slug and uses it for `pageUrl`.
- Add 301/normalization logic server-side so non-canonical forms resolve to canonical slug path.

### 3) Deep-link hydration depends on async Firestore subscriptions (crawl risk: medium-high)
Deep-linked photo/story resolution occurs after live subscriptions load.

Why this matters:
- If crawler render budget is tight or Firestore fetch is delayed, page may be indexed in a partial state.
- Important photo content may not be present at initial render tick.

Recommendation:
- Add server-side rendering/prerender for photo and story routes (or static snapshots).
- At minimum, expose server-rendered HTML for route critical content (title, main image, H1, caption, JSON-LD).

### 4) Metadata update system is robust but currently incomplete for Twitter card type and robots directives (crawl risk: low-medium)
`src/utils/seo.ts` updates title, description, canonical, OG tags, Twitter title/description/image, and JSON-LD.

Gaps:
- No explicit `twitter:card` set during runtime.
- No route-level robots/noindex toggling logic for non-indexable views.

Recommendation:
- Add `twitter:card` (typically `summary_large_image`).
- Add explicit robots meta management for admin/private/non-public routes as needed.

### 5) Duplicate sitemap implementations create maintenance and consistency risk (crawl risk: medium)
Both `api/sitemap.js` and `api/sitemap.xml.js` generate sitemaps with overlapping but different logic.

Why this matters:
- Different URL sets / metadata richness may be served depending on rewrite configuration.
- Inconsistent sitemap output can confuse crawler discovery and debugging.

Recommendation:
- Keep one dynamic sitemap endpoint only.
- Delete or deprecate the alternate implementation after verifying `vercel.json` route mapping.

### 6) Static routes in sitemap include pages not represented as explicit initial route states (crawl risk: medium)
Sitemap includes `/stories`, but primary route logic in `App.tsx` does not initialize a dedicated `stories` view from pathname on first load.

Why this matters:
- Crawlers discovering URLs in sitemap should land on route content deterministically.
- If `/stories` does not map cleanly on initial load, it can degrade indexability and quality signals.

Recommendation:
- Ensure every sitemap URL has deterministic route handling at boot and on popstate.

### 7) Photo page UX has semantic discoverability gap despite anchor usage (crawl risk: low-medium)
`PhotoCard` includes an anchor to `/photo/...` but prevents default and opens modal.

Why this matters:
- This helps discovery of links in DOM, but interaction behavior is JS-controlled and may not represent independent document navigation.
- In crawler contexts without full interaction, route discovery may still occur, but rendering route-specific content depends on SPA boot and data load.

Recommendation:
- Keep real anchor behavior for non-JS / crawler fallback (do not always `preventDefault`), or provide SSR route documents.

## Priority action plan
1. **Canonical normalization fix (P0)**: align photo canonical, internal links, and sitemap to slug URLs only.
2. **Route determinism fix (P0/P1)**: ensure all sitemap URLs map to explicit initial route states.
3. **Sitemap consolidation (P1)**: one source of truth for dynamic sitemap output.
4. **Render strategy upgrade (P1)**: SSR/prerender photo/story routes for reliable indexing.
5. **Metadata hardening (P2)**: add `twitter:card` and route-level robots policy.

## Quick validation checklist (post-fix)
- `/photo/:slug` returns matching canonical URL, OG:url, JSON-LD URL, and sitemap loc.
- `/story/:slug` resolves on first load without requiring user interaction.
- `/stories` and all static sitemap URLs resolve to intended content view.
- Only one sitemap endpoint is active; `robots.txt` references the same endpoint.
- Google Rich Results Test shows valid `ImageObject`/`Article` on deep links.
