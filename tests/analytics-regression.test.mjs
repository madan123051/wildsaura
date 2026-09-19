import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// SDK boundary doubles deliberately deny reads to anonymous tracking clients.
// Run with: node --experimental-vm-modules --test tests/analytics-regression.test.mjs
async function setup({ history = {}, live = {}, noDatabase = false, readError = false, admin = false, blockedStorage = false, deferAuth = false, deferHistory = false } = {}) {
  const writes = [], subscriptions = [], errors = [];
  const timers = new Set();
  const deadlines = new Map(), historyListeners = new Map();
  let authListener;
  let stoppedReads = 0;
  const context = vm.createContext({
    console, Date, Math, Map, Set, Promise,
    setTimeout: (fn, delay) => { const timer = setTimeout(fn, delay); timers.add(timer); deadlines.set(timer, fn); return timer; },
    clearTimeout: timer => { clearTimeout(timer); timers.delete(timer); deadlines.delete(timer); }, setInterval, clearInterval,
    localStorage: { getItem: () => { if (blockedStorage) throw Error('Storage blocked'); return admin ? 'true' : null; } },
    sessionStorage: { getItem: () => { if (blockedStorage) throw Error('Storage blocked'); return 'anon_123_abc'; }, setItem() {} },
    window: { location: { pathname: '/' } }, document: { referrer: '' },
  });
  function synthetic(exports) {
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  }
  const mocks = {
    '../firebaseAuth': synthetic({ auth: {} }),
    'firebase/auth': synthetic({ onIdTokenChanged: (_auth, cb) => { authListener = cb; if (!deferAuth) queueMicrotask(() => cb({ uid: 'admin' })); return () => { authListener = null; }; } }),
    '../firebaseCore': synthetic({ db: {}, realtimeDb: noDatabase ? null : {} }),
    'firebase/database': synthetic({
      get: () => { throw Error('Anonymous analytics must never read private data'); },
      onValue: (ref, success, fail) => {
        subscriptions.push(ref.path);
        if (readError) fail(new Error('PERMISSION_DENIED')); else success({ val: () => live[ref.path] || null });
        return () => { stoppedReads++; };
      },
      push: () => ({ key: 'event123' }), ref: (_db, path = '') => ({ path }),
      increment: amount => ({ '.sv': { increment: amount } }), serverTimestamp: () => ({ '.sv': 'timestamp' }),
      update: async (ref, value) => writes.push({ ref, value }),
    }),
    'firebase/firestore': synthetic({
      collection: (_db, name) => name,
      onSnapshot: (name, _options, success, fail) => {
        historyListeners.set(name, success);
        if (!deferHistory) queueMicrotask(() => {
          if (!historyListeners.has(name)) return;
          if (history[name] instanceof Error) fail(history[name]);
          else success({ metadata: { fromCache: false }, docs: (history[name] || []).map((value, i) => ({ id: `${name}_${i}`, data: () => value })) });
        });
        return () => historyListeners.delete(name);
      },
      getDocs: async name => {
        if (history[name] instanceof Error) throw history[name];
        return { docs: (history[name] || []).map((value, i) => ({ id: `${name}_${i}`, data: () => value })) };
      },
    }),
  };
  async function module(path) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    return new vm.SourceTextModule(output, { context, initializeImportMeta(meta) { meta.env = {}; } });
  }
  const model = await module('../src/services/analyticsModel.ts');
  await model.link(() => { throw Error('Unexpected model dependency'); }); await model.evaluate();
  const service = await module('../src/services/analyticsService.ts');
  await service.link(name => name === './analyticsModel' ? model : mocks[name]); await service.evaluate();
  const close = () => { for (const timer of timers) clearTimeout(timer); };
  const snapshot = () => new Promise(resolve => {
    let stop;
    stop = service.namespace.subscribeToAnalytics((analytics, visitors) => {
      queueMicrotask(() => { stop(); close(); resolve({ analytics, visitors, errors }); });
    }, message => { if (message) errors.push(message); });
  });
  return { service: service.namespace, model: model.namespace, writes, snapshot, close, subscriptions,
    signIn: user => authListener?.(user), stoppedReads: () => stoppedReads,
    expire: () => { for (const [timer, fn] of [...deadlines]) { clearTimeout(timer); deadlines.delete(timer); fn(); } },
    historyResult: (name, rows, fromCache = false) => historyListeners.get(name)?.({ metadata: { fromCache }, docs: rows.map((value, i) => ({ id: `${name}_${i}`, data: () => value })) }),
  };
}

test('anonymous tracking submits one atomic write with no reads and no login', async () => {
  const h = await setup();
  await h.service.trackVisitorEvent({ type: 'page_view', page: '/photos' });
  assert.equal(h.writes.length, 1);
  const change = h.writes[0].value;
  assert.equal(change['analytics/events/event123'].type, 'page_view');
  assert.equal(change['analytics/sessions/anon_123_abc/pageViews']['.sv'].increment, 1);
  assert.ok(Object.keys(change).some(key => /\/days\/\d{4}-\d{2}-\d{2}\/pageViews$/.test(key)));
  assert.equal(change['analytics/sessions/anon_123_abc/lastSeen']['.sv'], 'timestamp');
  h.close();
});

test('blocked browser storage does not stop anonymous event recording', async () => {
  const h = await setup({ blockedStorage: true });
  await h.service.trackVisitorEvent({ type: 'share', targetId: '1' });
  assert.equal(h.writes.length, 1); h.close();
});

test('admin browsing is excluded', async () => {
  const h = await setup({ admin: true });
  await h.service.trackVisitorEvent({ type: 'page_view' });
  assert.equal(h.writes.length, 0); h.close();
});

test('historical 940 views remain visible and new views are added once', async () => {
  const h = await setup({
    history: { visitor_daily_stats: [{ sessionId: 'old', pageViews: 940, events: 940, date: '2026-09-17' }], community_posts: [{}, {}], photos: [{ likeCount: 74 }] },
    live: { 'analytics/sessions': { new: { sessionId: 'new', pageViews: 2, events: 2, date: '2026-09-18' } } },
  });
  const { analytics } = await h.snapshot();
  assert.equal(analytics.totalPageViews, 942); assert.equal(analytics.totalVisitors, 2);
  assert.equal(analytics.totalCommunityPosts, 2); assert.equal(analytics.totalLikes, 74);
});

test('visitor fallback restores every registered visitor, not just the first', async () => {
  const h = await setup({ history: { visitors: [{ email: 'a@test', downloadCount: 2 }, { email: 'b@test', downloadCount: 3 }, { email: 'c@test' }] } });
  const { analytics } = await h.snapshot();
  assert.equal(analytics.totalVisitors, 3); assert.equal(analytics.totalDownloads, 5);
});

test('a cross-midnight session retains separate daily views without counting its lifetime twice', async () => {
  const h = await setup();
  const rows = h.model.sessionRows({ a: { sessionId: 'a', pageViews: 5, events: 5, date: '2026-09-18', days: {
    '2026-09-17': { pageViews: 3, events: 3 }, '2026-09-18': { pageViews: 2, events: 2 },
  } } });
  const analytics = h.model.buildAnalytics(rows, [], new Date('2026-09-18T12:00:00'));
  assert.equal(analytics.totalVisitors, 1); assert.equal(analytics.totalPageViews, 5);
  assert.equal(analytics.todayPageViews, 2); assert.equal(analytics.dailyTrend[0].pageViews, 3);
  h.close();
});

test('legacy RTDB cumulative counts survive addition of daily buckets', async () => {
  const h = await setup();
  const rows = h.model.sessionRows({ a: { sessionId: 'a', pageViews: 12, events: 12, date: '2026-09-18', days: { '2026-09-18': { pageViews: 2, events: 2 } } } });
  assert.equal(h.model.buildAnalytics(rows, []).totalPageViews, 12); h.close();
});

test('missing URL keeps history visible and surfaces a configuration error', async () => {
  const h = await setup({ noDatabase: true, history: { visitor_daily_stats: [{ sessionId: 'old', pageViews: 940 }] } });
  const { analytics, errors } = await h.snapshot();
  assert.equal(analytics.totalPageViews, 940); assert.match(errors.join(' '), /VITE_FIREBASE_DATABASE_URL/);
  await assert.rejects(h.service.trackVisitorEvent({ type: 'page_view' }), /VITE_FIREBASE_DATABASE_URL/);
});

test('denied live and historical reads are reported rather than silently presented as empty history', async () => {
  const h = await setup({ readError: true, history: { visitor_daily_stats: new Error('permission-denied') } });
  const { errors } = await h.snapshot();
  assert.match(errors.join(' '), /PERMISSION_DENIED/);
  assert.match(errors.join(' '), /Historical visitor_daily_stats could not load/);
});


test('private reads wait for auth restoration and restart after token changes', async () => {
  const h = await setup({ deferAuth: true });
  const stop = h.service.subscribeToAnalytics(() => {}, () => {});
  assert.equal(h.subscriptions.length, 0);
  h.signIn(null);
  assert.equal(h.subscriptions.length, 0);
  h.signIn({ uid: 'admin' });
  assert.equal(h.subscriptions.length, 2);
  h.signIn({ uid: 'admin' });
  assert.equal(h.stoppedReads(), 2);
  assert.equal(h.subscriptions.length, 4);
  stop();
  assert.equal(h.stoppedReads(), 4);
  h.signIn({ uid: 'admin' });
  assert.equal(h.subscriptions.length, 4);
  h.close();
});

test('history arriving after timeout recovers totals and clears warnings without remount', async () => {
  const h = await setup({ deferHistory: true });
  let result, error;
  const stop = h.service.subscribeToAnalytics(data => { result = data; }, value => { error = value; });
  await Promise.resolve();
  h.expire();
  assert.match(error, /taking longer/);
  h.historyResult('visitor_daily_stats', [{ sessionId: 'old', pageViews: 940 }]);
  assert.equal(result.totalPageViews, 940);
  for (const name of ['visitor_events', 'visitors', 'photos', 'comments', 'community_posts']) h.historyResult(name, []);
  assert.equal(error, null);
  h.historyResult('visitor_daily_stats', [], true);
  assert.equal(result.totalPageViews, 940, 'empty offline cache cannot erase received totals');
  stop();
  h.historyResult('visitor_daily_stats', []);
  assert.equal(result.totalPageViews, 940, 'disposed listeners cannot update dashboard');
  h.close();
});
