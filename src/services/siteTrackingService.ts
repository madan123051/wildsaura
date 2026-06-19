import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  where,
  serverTimestamp,
  increment,
  Timestamp,
  addDoc,
} from 'firebase/firestore';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface DailyStats {
  date: string;       // YYYY-MM-DD
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: Record<string, number>;
}

export interface MonthlyStats {
  month: string;      // YYYY-MM
  totalVisits: number;
}

export interface YearlyStats {
  year: string;       // YYYY
  totalVisits: number;
}

export interface TodayStats {
  totalVisits: number;
  uniqueVisitors: number;
  pageBreakdown: Record<string, number>;
  newVisitors: number;
  returningVisitors: number;
  peakHour: number;          // 0–23
  peakHourVisits: number;
}

export interface RecentVisit {
  id: string;
  visitorId: string;
  sessionId: string;
  page: string;
  referrer: string;
  userAgent: string;
  screenSize: string;
  language: string;
  country: string;
  isAuthenticated: boolean;
  userEmail: string | null;
  timestamp: Date;
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Simple string hash → 8-char hex fingerprint.
 */
function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to unsigned 32-bit then hex, pad to 8 chars
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate a consistent browser fingerprint from stable properties.
 */
export function getVisitorFingerprint(): string {
  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(screen.colorDepth),
    String(navigator.hardwareConcurrency ?? ''),
    navigator.platform ?? '',
  ];
  return 'v_' + hashString(components.join('|'));
}

/**
 * Get or create a session ID stored in sessionStorage.
 */
export function getSessionId(): string {
  const KEY = 'ws_session_id';
  let sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem(KEY, sid);
  }
  return sid;
}

/**
 * Derive a rough country name from the IANA timezone.
 */
function countryFromTimezone(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "Asia/Kathmandu"
  const map: Record<string, string> = {
    'America': 'US', 'US': 'US', 'Canada': 'CA',
    'Europe': 'EU', 'Asia': 'AS', 'Africa': 'AF',
    'Australia': 'AU', 'Pacific': 'OC', 'Indian': 'IN',
    'Atlantic': 'EU', 'Arctic': 'EU',
  };
  const region = tz.split('/')[0];
  return map[region] ?? region;
}

/**
 * Detect device type from user agent.
 */
function detectDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Extract browser name from user agent.
 */
function detectBrowser(ua: string): string {
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  return 'Other';
}

/**
 * Sanitize a Firestore field-path segment (dots/slashes not allowed as keys).
 */
function sanitizePage(page: string): string {
  return page.replace(/[/.]/g, '_').replace(/^_+|_+$/g, '') || 'home';
}

// ─── Main Tracking Function ───────────────────────────────────────────────────

/**
 * Track a single page visit. Call this on every navigation.
 */
export async function trackSiteVisit(
  page: string,
  userEmail?: string
): Promise<void> {
  try {
    const now = new Date();
    const visitorId = getVisitorFingerprint();
    const sessionId = getSessionId();
    const ua = navigator.userAgent;
    const dateStr = now.toISOString().slice(0, 10);          // YYYY-MM-DD
    const monthStr = dateStr.slice(0, 7);                    // YYYY-MM
    const yearStr = dateStr.slice(0, 4);                     // YYYY
    const hourStr = String(now.getHours());
    const pageSafe = sanitizePage(page);

    // 1) Write individual visit record
    const visitData = {
      visitorId,
      sessionId,
      page,
      referrer: document.referrer || '',
      userAgent: ua,
      screenSize: `${screen.width}x${screen.height}`,
      language: navigator.language,
      country: countryFromTimezone(),
      isAuthenticated: !!userEmail,
      userEmail: userEmail ?? null,
      timestamp: serverTimestamp(),
      date: dateStr,
      month: monthStr,
      year: yearStr,
      hour: now.getHours(),
      device: detectDevice(ua),
      browser: detectBrowser(ua),
    };
    await addDoc(collection(db, 'site_visits'), visitData);

    // 2) Atomic daily aggregate
    const dailyRef = doc(db, 'analytics_daily', dateStr);
    await setDoc(
      dailyRef,
      {
        date: dateStr,
        totalVisits: increment(1),
        [`pageViews.${pageSafe}`]: increment(1),
        [`hourly.${hourStr}`]: increment(1),
      },
      { merge: true }
    );

    // 2b) Track unique visitor in subcollection
    const visitorRef = doc(db, 'analytics_daily', dateStr, 'visitors', visitorId);
    const visitorSnap = await getDoc(visitorRef);
    if (!visitorSnap.exists()) {
      await setDoc(visitorRef, {
        visitorId,
        firstSeen: serverTimestamp(),
        device: detectDevice(ua),
        browser: detectBrowser(ua),
        country: countryFromTimezone(),
      });
      // Increment unique counter on daily doc
      await setDoc(dailyRef, { uniqueVisitors: increment(1) }, { merge: true });
    }

    // 3) Atomic monthly aggregate
    const monthlyRef = doc(db, 'analytics_monthly', monthStr);
    await setDoc(
      monthlyRef,
      { month: monthStr, totalVisits: increment(1) },
      { merge: true }
    );

    // 4) Atomic yearly aggregate
    const yearlyRef = doc(db, 'analytics_yearly', yearStr);
    await setDoc(
      yearlyRef,
      { year: yearStr, totalVisits: increment(1) },
      { merge: true }
    );
  } catch (err) {
    // Tracking must never break the app
    console.error('[WildSaura Tracking] Error:', err);
  }
}

// ─── Fetch Functions ──────────────────────────────────────────────────────────

/**
 * Fetch daily analytics for the last N days.
 */
export async function fetchDailyAnalytics(days: number = 30): Promise<DailyStats[]> {
  const results: DailyStats[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const snap = await getDoc(doc(db, 'analytics_daily', dateStr));
    if (snap.exists()) {
      const data = snap.data();
      results.push({
        date: dateStr,
        totalVisits: data.totalVisits ?? 0,
        uniqueVisitors: data.uniqueVisitors ?? 0,
        pageViews: data.pageViews ?? {},
      });
    } else {
      results.push({ date: dateStr, totalVisits: 0, uniqueVisitors: 0, pageViews: {} });
    }
  }

  return results;
}

/**
 * Fetch monthly analytics for the last N months.
 */
export async function fetchMonthlyAnalytics(months: number = 12): Promise<MonthlyStats[]> {
  const results: MonthlyStats[] = [];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);

    const snap = await getDoc(doc(db, 'analytics_monthly', monthStr));
    if (snap.exists()) {
      const data = snap.data();
      results.push({ month: monthStr, totalVisits: data.totalVisits ?? 0 });
    } else {
      results.push({ month: monthStr, totalVisits: 0 });
    }
  }

  return results;
}

/**
 * Fetch all yearly analytics.
 */
export async function fetchYearlyAnalytics(): Promise<YearlyStats[]> {
  const snap = await getDocs(
    query(collection(db, 'analytics_yearly'), orderBy('year', 'asc'))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return { year: data.year ?? d.id, totalVisits: data.totalVisits ?? 0 };
  });
}

/**
 * Fetch detailed stats for today.
 */
export async function fetchTodayLiveStats(): Promise<TodayStats> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const dailySnap = await getDoc(doc(db, 'analytics_daily', dateStr));

  const base: TodayStats = {
    totalVisits: 0,
    uniqueVisitors: 0,
    pageBreakdown: {},
    newVisitors: 0,
    returningVisitors: 0,
    peakHour: 0,
    peakHourVisits: 0,
  };

  if (!dailySnap.exists()) return base;

  const data = dailySnap.data();
  base.totalVisits = data.totalVisits ?? 0;
  base.uniqueVisitors = data.uniqueVisitors ?? 0;
  base.pageBreakdown = data.pageViews ?? {};

  // Determine peak hour from hourly map
  const hourly: Record<string, number> = data.hourly ?? {};
  let peakH = 0;
  let peakV = 0;
  for (const [h, v] of Object.entries(hourly)) {
    if (v > peakV) {
      peakV = v;
      peakH = Number(h);
    }
  }
  base.peakHour = peakH;
  base.peakHourVisits = peakV;

  // Count new vs returning: fetch yesterday's visitors subcollection
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const ydateStr = yesterday.toISOString().slice(0, 10);

  const todayVisitorsSnap = await getDocs(
    collection(db, 'analytics_daily', dateStr, 'visitors')
  );
  const yesterdayVisitorsSnap = await getDocs(
    collection(db, 'analytics_daily', ydateStr, 'visitors')
  );

  const yesterdayIds = new Set(yesterdayVisitorsSnap.docs.map((d) => d.id));
  let returning = 0;
  todayVisitorsSnap.docs.forEach((d) => {
    if (yesterdayIds.has(d.id)) returning++;
  });
  base.returningVisitors = returning;
  base.newVisitors = todayVisitorsSnap.size - returning;

  return base;
}

/**
 * Fetch the most recent individual visits.
 */
export async function fetchRecentVisits(count: number = 15): Promise<RecentVisit[]> {
  const q = query(
    collection(db, 'site_visits'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(count)
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.timestamp as Timestamp | null;
    return {
      id: d.id,
      visitorId: data.visitorId ?? '',
      sessionId: data.sessionId ?? '',
      page: data.page ?? '',
      referrer: data.referrer ?? '',
      userAgent: data.userAgent ?? '',
      screenSize: data.screenSize ?? '',
      language: data.language ?? '',
      country: data.country ?? '',
      isAuthenticated: data.isAuthenticated ?? false,
      userEmail: data.userEmail ?? null,
      timestamp: ts ? ts.toDate() : new Date(),
      device: data.device ?? 'desktop',
      browser: data.browser ?? 'Other',
    };
  });
}
