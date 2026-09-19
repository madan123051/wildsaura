import { db, realtimeDb } from '../firebaseCore';
import { get, onValue, push, ref, update, increment, serverTimestamp, type Unsubscribe } from 'firebase/database';
import { auth } from '../firebaseAuth';
import { onIdTokenChanged } from 'firebase/auth';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { buildAnalytics, sessionRows, recentVisitors, localParts, number, timestamp, type AnalyticsRow, type SiteAnalytics, type VisitorRecord, type VisitorEventInput } from './analyticsModel';
export type { SiteAnalytics, VisitorRecord, VisitorEventInput, VisitorEventType, AnalyticsTrendPoint, CategoryMetric, PageMetric } from './analyticsModel';

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'madan123050@gmail.com').trim().toLowerCase();
const CONFIG_ERROR = 'Live tracking is unavailable: set VITE_FIREBASE_DATABASE_URL in Vercel and redeploy.';
const READ_TIMEOUT_MS = 15000;
let memorySession = '';
function sessionId() {
  if (!memorySession) memorySession = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  try {
    const stored = sessionStorage.getItem('wa_session_id');
    if (stored && /^anon_[0-9]+_[A-Za-z0-9]+$/.test(stored)) memorySession = stored;
    else sessionStorage.setItem('wa_session_id', memorySession);
  } catch { /* Safari/storage restrictions should not disable tracking. */ }
  return memorySession;
}
function isAdmin(visitor: VisitorEventInput['visitor']) {
  if ((visitor?.email || '').trim().toLowerCase() === ADMIN_EMAIL) return true;
  try { return localStorage.getItem('wa_admin_session') === 'true'; } catch { return false; }
}

export async function trackVisitorEvent(input: VisitorEventInput): Promise<void> {
  if (isAdmin(input.visitor)) return;
  if (!realtimeDb) throw new Error(CONFIG_ERROR);
  const sid = sessionId(), { day, month, year } = localParts();
  const page = (input.page || window.location.pathname || '/').slice(0, 1000);
  const visitorType = input.visitor?.email ? 'logged-in' : 'anonymous';
  const category = (input.category || '').slice(0, 160);
  const categoryKey = category.toLowerCase().replace(/[.#$\[\]\/]/g, '_');
  const base = `analytics/sessions/${sid}`;
  const eventRef = push(ref(realtimeDb, 'analytics/events'));
  const changes: Record<string, any> = {};
  const profile = {
    sessionId: sid, visitorType, email: input.visitor?.email || '',
    displayName: input.visitor?.displayName || (visitorType === 'logged-in' ? 'Visitor' : 'Anonymous visitor'),
    avatarUrl: input.visitor?.avatarUrl || '', lastSeen: serverTimestamp(), lastPage: page,
    lastCategory: category, date: day, month, year,
  };
  for (const [key, value] of Object.entries(profile)) changes[`${base}/${key}`] = value;
  const counterByType: Record<string, string> = {
    page_view: 'pageViews', photo_view: 'photoViews', story_view: 'storyViews', video_view: 'videoViews',
    category_view: 'categoryViews', share: 'shares', download: 'downloads', like: 'likes', comment: 'comments',
  };
  const counters = ['events', counterByType[input.type]].filter(Boolean);
  for (const counter of counters) {
    changes[`${base}/${counter}`] = increment(1);
    changes[`${base}/days/${day}/${counter}`] = increment(1);
  }
  changes[`${base}/days/${day}/lastSeen`] = serverTimestamp();
  if (categoryKey && categoryKey !== 'all') {
    changes[`${base}/categoryCounts/${categoryKey}`] = increment(1);
    changes[`${base}/categoryLabels/${categoryKey}`] = category;
  }
  changes[`analytics/events/${eventRef.key}`] = {
    type: input.type, page, category, categoryKey, targetId: input.targetId || '', targetTitle: input.targetTitle || '',
    sessionId: sid, visitorType, date: day, month, year, timestamp: serverTimestamp(), referrer: document.referrer || '',
  };
  // One all-or-nothing write. Neither get() nor transactions: visitors cannot read private analytics.
  await update(ref(realtimeDb), changes);
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out. Check connection and database permissions.`)), READ_TIMEOUT_MS);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
interface History {
  rows: AnalyticsRow[]; events: AnalyticsRow[];
  likes: number; downloads: number; comments: number; communityPosts: number; errors: string[];
}
async function loadHistory(): Promise<History> {
  const names = ['visitor_daily_stats', 'visitor_events', 'visitors', 'photos', 'comments', 'community_posts'];
  const results = await Promise.allSettled(names.map(name => withTimeout(getDocs(collection(db, name)), name)));
  const errors: string[] = [];
  const data = results.map((result, i): AnalyticsRow[] => {
    if (result.status === 'rejected') { errors.push(`Historical ${names[i]} could not load (${result.reason?.code || result.reason?.message || 'read failed'}).`); return []; }
    return result.value.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  });
  return historyFromRows(data, errors);
}
function historyFromRows(data: AnalyticsRow[][], errors: string[]): History {
  const [stats, events, visitors, photos, comments, posts] = data;
  // No writes, deletion or migration of the historical collections.
  const rows = stats.length ? stats.map(s => ({ ...s, sessionId: s.sessionId || s.id })) : visitors.map(v => {
    const created = timestamp(v.createdAt), parts = created ? localParts(new Date(created)) : null;
    return { ...v, sessionId: v.email || v.id, visitorType: 'logged-in', lastSeen: v.lastSeen || v.createdAt,
      date: parts?.day || '', month: parts?.month || '', year: parts?.year || '' };
  });
  return { rows, events, errors,
    likes: photos.reduce((sum, p) => sum + number(p.likeCount), 0),
    downloads: visitors.reduce((sum, v) => sum + number(v.downloadCount), 0),
    comments: comments.length, communityPosts: posts.length };
}
function combined(history: History, sessions: Record<string, AnalyticsRow>, events: Record<string, AnalyticsRow>) {
  const rows = [...history.rows, ...sessionRows(sessions)];
  const analytics = buildAnalytics(rows, [...history.events, ...Object.values(events)]);
  // Content counts describe the same actions; adding them would double count.
  analytics.totalLikes = Math.max(analytics.totalLikes, history.likes);
  analytics.totalDownloads = Math.max(analytics.totalDownloads, history.downloads);
  analytics.totalComments = Math.max(analytics.totalComments, history.comments);
  analytics.totalCommunityPosts = history.communityPosts;
  return { analytics, visitors: recentVisitors(rows) };
}
const blankHistory = (): History => ({ rows: [], events: [], likes: 0, downloads: 0, comments: 0, communityPosts: 0, errors: [] });

// Keep listeners alive after the warning deadline: late server responses and
// Firebase's automatic network reconnect must still replace incomplete results.
function subscribeToHistory(cb: (history: History) => void): Unsubscribe {
  const names = ['visitor_daily_stats', 'visitor_events', 'visitors', 'photos', 'comments', 'community_posts'];
  const data: AnalyticsRow[][] = names.map(() => []);
  const ready = new Set<string>();
  const errors = new Map<string, string>();
  let active = true;
  const emit = () => {
    if (active && ready.size === names.length) cb(historyFromRows(data, [...errors.values()]));
  };
  const stops = names.map((name, i) => {
    const timer = setTimeout(() => {
      errors.set(name, `Historical ${name} is taking longer to load. Reconnecting; totals may be incomplete.`);
      ready.add(name); emit();
    }, READ_TIMEOUT_MS);
    const stop = onSnapshot(collection(db, name), { includeMetadataChanges: true }, snapshot => {
      if (!active) return;
      // An empty offline cache does not prove that the collection is empty.
      if (snapshot.metadata.fromCache) return;
      clearTimeout(timer);
      data[i] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      errors.delete(name); ready.add(name); emit();
    }, error => {
      if (!active) return;
      clearTimeout(timer);
      errors.set(name, `Historical ${name} could not load (${error.code || error.message}).`);
      ready.add(name); emit();
    });
    return () => { clearTimeout(timer); stop(); };
  });
  return () => { active = false; stops.forEach(stop => stop()); };
}

export function subscribeToAnalytics(
  cb: (data: SiteAnalytics, visitors: VisitorRecord[]) => void,
  onError: (message: string | null) => void = console.warn,
): Unsubscribe {
  let stopReads: Unsubscribe = () => {};
  // A local dashboard flag is not Firebase authentication. Reattach canceled
  // permission-denied listeners when sign-in or the ID token changes.
  const stopAuth = onIdTokenChanged(auth, user => {
    stopReads();
    stopReads = () => {};
    if (!user) {
      onError('Sign in with your admin account to load analytics.');
      const empty = combined(blankHistory(), {}, {});
      cb(empty.analytics, empty.visitors);
      return;
    }
    onError(null);
    stopReads = subscribeAuthenticatedAnalytics(cb, onError);
  });
  return () => { stopAuth(); stopReads(); };
}

function subscribeAuthenticatedAnalytics(
  cb: (data: SiteAnalytics, visitors: VisitorRecord[]) => void,
  onError: (message: string | null) => void = console.warn,
): Unsubscribe {
  let active = true, historyReady = false, sessionsReady = false, eventsReady = false;
  let history = blankHistory(), sessions: Record<string, AnalyticsRow> = {}, events: Record<string, AnalyticsRow> = {};
  const errors = new Map<string, string>();
  const emit = () => {
    if (!active) return;
    onError([...errors.values(), ...history.errors].join(' ') || null);
    if (historyReady && sessionsReady && eventsReady) {
      const result = combined(history, sessions, events);
      cb(result.analytics, result.visitors);
    }
  };
  const cleanups: Unsubscribe[] = [subscribeToHistory(value => {
    if (!active) return;
    history = value; historyReady = true; emit();
  })];
  if (!realtimeDb) {
    errors.set('config', CONFIG_ERROR); sessionsReady = eventsReady = true; emit();
  } else {
    // Separate listeners avoid retransferring the event tree on session updates.
    for (const name of ['sessions', 'events'] as const) {
      const ready = () => { if (name === 'sessions') sessionsReady = true; else eventsReady = true; };
      const timer = setTimeout(() => { errors.set(name, `Live ${name} has not connected. Check the database URL and connection.`); ready(); emit(); }, READ_TIMEOUT_MS);
      const unsub = onValue(ref(realtimeDb, `analytics/${name}`), snap => {
        clearTimeout(timer); errors.delete(name);
        if (name === 'sessions') sessions = snap.val() || {}; else events = snap.val() || {};
        ready(); emit();
      }, error => {
        clearTimeout(timer); errors.set(name, `Live ${name} could not load (${error.message}). Check your admin login and Realtime Database rules.`);
        ready(); emit();
      });
      cleanups.push(() => { clearTimeout(timer); unsub(); });
    }
  }
  return () => { active = false; cleanups.forEach(stop => stop()); };
}
export function subscribeToOnlineCount(cb: (count: number) => void, onError?: (message: string | null) => void): Unsubscribe {
  if (!realtimeDb) { onError?.(CONFIG_ERROR); return () => {}; }
  let presence: Record<string, AnalyticsRow> = {};
  const emit = () => cb(Object.values(presence).filter(p => p.online && number(p.lastSeen) > Date.now() - 90000).length);
  const timeout = setTimeout(() => onError?.('Online visitor count has not connected. Check the database URL and connection.'), READ_TIMEOUT_MS);
  const unsub = onValue(ref(realtimeDb, 'presence'), snap => {
    clearTimeout(timeout); presence = snap.val() || {}; onError?.(null); emit();
  }, error => { clearTimeout(timeout); onError?.(`Online visitor count unavailable: ${error.message}`); });
  const timer = setInterval(emit, 30000);
  return () => { clearTimeout(timeout); clearInterval(timer); unsub(); };
}
export async function fetchSiteAnalytics(): Promise<SiteAnalytics> {
  if (!realtimeDb) throw new Error(CONFIG_ERROR);
  const [history, sessions, events, presence] = await Promise.all([
    loadHistory(), ...['analytics/sessions', 'analytics/events', 'presence'].map(path => withTimeout(get(ref(realtimeDb!, path)), path)),
  ]);
  if (history.errors.length) throw new Error(history.errors.join(' '));
  const result = combined(history, sessions.val() || {}, events.val() || {}).analytics;
  result.onlineNow = Object.values(presence.val() || {}).filter((p: any) => p.online && number(p.lastSeen) > Date.now() - 90000).length;
  return result;
}
export async function fetchRecentVisitors(max = 10): Promise<VisitorRecord[]> {
  if (!realtimeDb) throw new Error(CONFIG_ERROR);
  const [history, sessions] = await Promise.all([loadHistory(), withTimeout(get(ref(realtimeDb, 'analytics/sessions')), 'sessions')]);
  if (history.errors.length) throw new Error(history.errors.join(' '));
  return recentVisitors([...history.rows, ...sessionRows(sessions.val() || {})], max);
}
export async function trackPageView(page: string) { await trackVisitorEvent({ type: 'page_view', page }); }
export async function trackShare(photoId: string) { await trackVisitorEvent({ type: 'share', targetId: photoId }); }
