import { db } from '../firebase';
import {
  collection, query, getDocs, onSnapshot, orderBy, limit,
  where, doc, setDoc, getDoc, serverTimestamp, increment,
  Unsubscribe
} from 'firebase/firestore';

// ── Types ────────────────────────────────────────────────────────────────
export type VisitorEventType =
  | 'page_view'
  | 'category_view'
  | 'photo_view'
  | 'story_view'
  | 'video_view'
  | 'share'
  | 'download'
  | 'like'
  | 'comment';

export interface VisitorEventInput {
  type: VisitorEventType;
  page?: string;
  category?: string;
  targetId?: string;
  targetTitle?: string;
  visitor?: {
    email?: string;
    displayName?: string;
    avatarUrl?: string;
    loginMethod?: string;
  } | null;
}

export interface AnalyticsTrendPoint {
  label: string;
  visitors: number;
  pageViews: number;
  events: number;
}

export interface CategoryMetric {
  category: string;
  views: number;
  shares: number;
  downloads: number;
  likes: number;
  comments: number;
  total: number;
}

export interface PageMetric {
  page: string;
  views: number;
}

export interface SiteAnalytics {
  totalVisitors: number;
  totalPageViews: number;
  totalEvents: number;
  totalLikes: number;
  totalShares: number;
  totalDownloads: number;
  totalComments: number;
  totalCommunityPosts: number;
  onlineNow: number;
  anonymousVisitors: number;
  loggedInVisitors: number;
  todayVisitors: number;
  weekVisitors: number;
  monthVisitors: number;
  yearVisitors: number;
  todayPageViews: number;
  weekPageViews: number;
  monthPageViews: number;
  yearPageViews: number;
  dailyTrend: AnalyticsTrendPoint[];
  monthlyTrend: AnalyticsTrendPoint[];
  yearlyTrend: AnalyticsTrendPoint[];
  topCategories: CategoryMetric[];
  todayTopCategories: CategoryMetric[];
  weekTopCategories: CategoryMetric[];
  monthTopCategories: CategoryMetric[];
  yearTopCategories: CategoryMetric[];
  topPages: PageMetric[];
}

export interface VisitorRecord {
  email?: string;
  displayName: string;
  avatarUrl?: string;
  createdAt?: any;
  lastSeen?: any;
  downloadCount?: number;
  sessionId?: string;
  visitorType?: 'anonymous' | 'logged-in';
  pageViews?: number;
  events?: number;
  topCategory?: string;
  lastPage?: string;
  date?: string;
}

export interface AdSenseSettings {
  publisherId: string;       // ca-pub-XXXX
  bannerSlot: string;
  inFeedSlot: string;
  inArticleSlot: string;
  sidebarSlot: string;
  multiplexSlot: string;
  enabled: boolean;
  verificationCode?: string;
  updatedAt?: any;
}

// ── Tracking Collections ─────────────────────────────────────────────────
const VISITOR_EVENTS_COLLECTION = 'visitor_events';
const VISITOR_DAILY_STATS_COLLECTION = 'visitor_daily_stats';

function getLocalDateParts(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const iso = local.toISOString();
  const day = iso.slice(0, 10);
  return {
    day,
    month: day.slice(0, 7),
    year: day.slice(0, 4),
  };
}

function toDate(value: any): Date | null {
  try {
    if (value?.toDate) return value.toDate();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function getAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let sessionId = sessionStorage.getItem('wa_session_id');
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('wa_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return `anon_${Date.now()}`;
  }
}

function safeDocId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function normalizeCategory(category?: string): string {
  const normalized = (category || '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return '';
  return normalized.replace(/[^a-z0-9_-]/g, '_');
}

function emptyAnalytics(): SiteAnalytics {
  return {
    totalVisitors: 0,
    totalPageViews: 0,
    totalEvents: 0,
    totalLikes: 0,
    totalShares: 0,
    totalDownloads: 0,
    totalComments: 0,
    totalCommunityPosts: 0,
    onlineNow: 0,
    anonymousVisitors: 0,
    loggedInVisitors: 0,
    todayVisitors: 0,
    weekVisitors: 0,
    monthVisitors: 0,
    yearVisitors: 0,
    todayPageViews: 0,
    weekPageViews: 0,
    monthPageViews: 0,
    yearPageViews: 0,
    dailyTrend: [],
    monthlyTrend: [],
    yearlyTrend: [],
    topCategories: [],
    todayTopCategories: [],
    weekTopCategories: [],
    monthTopCategories: [],
    yearTopCategories: [],
    topPages: [],
  };
}

function addTrendPoint(
  map: Map<string, { sessions: Set<string>; pageViews: number; events: number }>,
  label: string,
  sessionId: string,
  pageViews: number,
  events: number,
) {
  if (!map.has(label)) map.set(label, { sessions: new Set(), pageViews: 0, events: 0 });
  const current = map.get(label)!;
  current.sessions.add(sessionId);
  current.pageViews += pageViews;
  current.events += events;
}

function toTrend(map: Map<string, { sessions: Set<string>; pageViews: number; events: number }>): AnalyticsTrendPoint[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, data]) => ({
      label,
      visitors: data.sessions.size,
      pageViews: data.pageViews,
      events: data.events,
    }));
}

function categoryLabelFromKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function addCategoryMetric(
  map: Map<string, CategoryMetric>,
  key: string,
  label: string,
  type: VisitorEventType,
) {
  const current = map.get(key) || {
    category: label || categoryLabelFromKey(key),
    views: 0,
    shares: 0,
    downloads: 0,
    likes: 0,
    comments: 0,
    total: 0,
  };
  if (type === 'photo_view' || type === 'category_view' || type === 'page_view') current.views += 1;
  if (type === 'share') current.shares += 1;
  if (type === 'download') current.downloads += 1;
  if (type === 'like') current.likes += 1;
  if (type === 'comment') current.comments += 1;
  current.total += 1;
  map.set(key, current);
}

function toCategoryMetrics(map: Map<string, CategoryMetric>): CategoryMetric[] {
  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8);
}

// ── Event Tracking ───────────────────────────────────────────────────────
export async function trackVisitorEvent(input: VisitorEventInput): Promise<void> {
  try {
    const sessionId = getAnalyticsSessionId();
    const { day, month, year } = getLocalDateParts();
    const categoryKey = normalizeCategory(input.category);
    const visitorType = input.visitor?.email ? 'logged-in' : 'anonymous';
    const eventDocId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const statsDocId = `${day}_${safeDocId(sessionId)}`;
    const page = input.page || (typeof window !== 'undefined' ? window.location.pathname : '/');

    const baseEvent = {
      type: input.type,
      page,
      category: input.category || '',
      categoryKey,
      targetId: input.targetId || '',
      targetTitle: input.targetTitle || '',
      sessionId,
      visitorType,
      email: input.visitor?.email || '',
      displayName: input.visitor?.displayName || (visitorType === 'logged-in' ? 'Visitor' : 'Anonymous visitor'),
      avatarUrl: input.visitor?.avatarUrl || '',
      loginMethod: input.visitor?.loginMethod || visitorType,
      timestamp: serverTimestamp(),
      date: day,
      month,
      year,
      referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
    };

    const categoryCounts = categoryKey ? { [categoryKey]: increment(1) } : {};
    const categoryLabels = categoryKey ? { [categoryKey]: input.category || categoryKey } : {};
    const statsUpdate: any = {
      sessionId,
      visitorType,
      email: input.visitor?.email || '',
      displayName: input.visitor?.displayName || (visitorType === 'logged-in' ? 'Visitor' : 'Anonymous visitor'),
      avatarUrl: input.visitor?.avatarUrl || '',
      lastPage: page,
      lastCategory: input.category || '',
      date: day,
      month,
      year,
      lastSeen: serverTimestamp(),
      events: increment(1),
      pageViews: increment(input.type === 'page_view' ? 1 : 0),
      photoViews: increment(input.type === 'photo_view' ? 1 : 0),
      storyViews: increment(input.type === 'story_view' ? 1 : 0),
      videoViews: increment(input.type === 'video_view' ? 1 : 0),
      categoryViews: increment(input.type === 'category_view' ? 1 : 0),
      shares: increment(input.type === 'share' ? 1 : 0),
      downloads: increment(input.type === 'download' ? 1 : 0),
      likes: increment(input.type === 'like' ? 1 : 0),
      comments: increment(input.type === 'comment' ? 1 : 0),
    };
    if (categoryKey) {
      statsUpdate.categoryCounts = categoryCounts;
      statsUpdate.categoryLabels = categoryLabels;
    }

    await Promise.allSettled([
      setDoc(doc(db, VISITOR_EVENTS_COLLECTION, eventDocId), baseEvent),
      setDoc(doc(db, VISITOR_DAILY_STATS_COLLECTION, statsDocId), statsUpdate, { merge: true }),
    ]);
  } catch (err) {
    console.warn('Visitor tracking failed:', err);
  }
}

// ── Backward-compatible Page View / Share Tracking ───────────────────────
export async function trackPageView(page: string, _sessionId?: string): Promise<void> {
  await trackVisitorEvent({ type: 'page_view', page });
}

export async function trackShare(photoId: string, _platform: string): Promise<void> {
  await trackVisitorEvent({ type: 'share', targetId: photoId });
}

// ── Fetch Analytics ──────────────────────────────────────────────────────
export async function fetchSiteAnalytics(): Promise<SiteAnalytics> {
  const analytics = emptyAnalytics();
  const now = new Date();
  const { day: todayStr, month: currentMonth, year: currentYear } = getLocalDateParts(now);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const allSessions = new Set<string>();
  const anonymousSessions = new Set<string>();
  const loggedInSessions = new Set<string>();
  const todaySessions = new Set<string>();
  const weekSessions = new Set<string>();
  const monthSessions = new Set<string>();
  const yearSessions = new Set<string>();
  const dailyMap = new Map<string, { sessions: Set<string>; pageViews: number; events: number }>();
  const monthlyMap = new Map<string, { sessions: Set<string>; pageViews: number; events: number }>();
  const yearlyMap = new Map<string, { sessions: Set<string>; pageViews: number; events: number }>();
  const categoryMap = new Map<string, CategoryMetric>();
  const todayCategoryMap = new Map<string, CategoryMetric>();
  const weekCategoryMap = new Map<string, CategoryMetric>();
  const monthCategoryMap = new Map<string, CategoryMetric>();
  const yearCategoryMap = new Map<string, CategoryMetric>();
  const pageMap = new Map<string, PageMetric>();

  try {
    const statsSnap = await getDocs(collection(db, VISITOR_DAILY_STATS_COLLECTION));
    statsSnap.forEach((statsDoc) => {
      const data: any = statsDoc.data();
      const sessionId = data.sessionId || statsDoc.id;
      const date = data.date || '';
      const month = data.month || (date ? date.slice(0, 7) : '');
      const year = data.year || (date ? date.slice(0, 4) : '');
      const visitorType = data.visitorType || (data.email ? 'logged-in' : 'anonymous');
      const pageViews = Number(data.pageViews || 0);
      const events = Number(data.events || 0);
      const dateObj = date ? new Date(`${date}T00:00:00`) : toDate(data.lastSeen);

      allSessions.add(sessionId);
      if (visitorType === 'logged-in') loggedInSessions.add(sessionId);
      else anonymousSessions.add(sessionId);
      analytics.totalPageViews += pageViews;
      analytics.totalEvents += events;
      analytics.totalShares += Number(data.shares || 0);
      analytics.totalDownloads += Number(data.downloads || 0);
      analytics.totalLikes += Number(data.likes || 0);
      analytics.totalComments += Number(data.comments || 0);

      if (date === todayStr) {
        todaySessions.add(sessionId);
        analytics.todayPageViews += pageViews;
      }
      if (dateObj && dateObj >= weekAgo) {
        weekSessions.add(sessionId);
        analytics.weekPageViews += pageViews;
      }
      if (dateObj && dateObj >= monthAgo) {
        monthSessions.add(sessionId);
        analytics.monthPageViews += pageViews;
      }
      if (year === currentYear) {
        yearSessions.add(sessionId);
        analytics.yearPageViews += pageViews;
      }

      if (date) addTrendPoint(dailyMap, date, sessionId, pageViews, events);
      if (month) addTrendPoint(monthlyMap, month, sessionId, pageViews, events);
      if (year) addTrendPoint(yearlyMap, year, sessionId, pageViews, events);

    });
  } catch (err) {
    console.warn('Visitor stats fetch failed:', err);
  }

  // Event-level details refine category action types and top pages.
  try {
    const eventsSnap = await getDocs(collection(db, VISITOR_EVENTS_COLLECTION));
    eventsSnap.forEach((eventDoc) => {
      const data: any = eventDoc.data();
      const page = data.page || '/';
      const type = data.type as VisitorEventType;
      if (type === 'page_view') {
        const current = pageMap.get(page) || { page, views: 0 };
        current.views += 1;
        pageMap.set(page, current);
      }
      const key = data.categoryKey || normalizeCategory(data.category);
      if (!key) return;
      const label = data.category || categoryLabelFromKey(key);
      const eventDate = data.date || '';
      const eventDateObj = eventDate ? new Date(`${eventDate}T00:00:00`) : toDate(data.timestamp);
      const eventYear = data.year || (eventDate ? eventDate.slice(0, 4) : '');

      addCategoryMetric(categoryMap, key, label, type);
      if (eventDate === todayStr) addCategoryMetric(todayCategoryMap, key, label, type);
      if (eventDateObj && eventDateObj >= weekAgo) addCategoryMetric(weekCategoryMap, key, label, type);
      if (eventDateObj && eventDateObj >= monthAgo) addCategoryMetric(monthCategoryMap, key, label, type);
      if (eventYear === currentYear) addCategoryMetric(yearCategoryMap, key, label, type);
    });
  } catch {
    // Older deployments may not have this collection yet.
  }

  // Registered visitors are kept as a fallback and source for legacy downloads.
  try {
    const visitorsSnap = await getDocs(collection(db, 'visitors'));
    let visitorDownloadTotal = 0;
    visitorsSnap.forEach((visitorDoc) => {
      const data: any = visitorDoc.data();
      visitorDownloadTotal += Number(data.downloadCount || 0);
      if (!allSessions.size) {
        const createdAt = toDate(data.createdAt);
        const sessionId = data.email || visitorDoc.id;
        allSessions.add(sessionId);
        loggedInSessions.add(sessionId);
        if (createdAt) {
          const created = getLocalDateParts(createdAt);
          if (created.day === todayStr) todaySessions.add(sessionId);
          if (createdAt >= weekAgo) weekSessions.add(sessionId);
          if (createdAt >= monthAgo) monthSessions.add(sessionId);
          if (created.year === currentYear) yearSessions.add(sessionId);
        }
      }
    });
    analytics.totalDownloads = Math.max(analytics.totalDownloads, visitorDownloadTotal);
  } catch {}

  // Content totals.
  try {
    const photosSnap = await getDocs(collection(db, 'photos'));
    let photoLikes = 0;
    photosSnap.forEach((photoDoc) => {
      const data: any = photoDoc.data();
      photoLikes += Number(data.likeCount || 0);
    });
    analytics.totalLikes = Math.max(analytics.totalLikes, photoLikes);
  } catch {}

  try {
    const commentsSnap = await getDocs(collection(db, 'comments'));
    analytics.totalComments = Math.max(analytics.totalComments, commentsSnap.size);
  } catch {}

  try {
    const communitySnap = await getDocs(collection(db, 'community_posts'));
    analytics.totalCommunityPosts = communitySnap.size;
  } catch {}

  try {
    const onlineQ = query(collection(db, 'online_visitors'), where('online', '==', true));
    const onlineSnap = await getDocs(onlineQ);
    analytics.onlineNow = onlineSnap.size;
  } catch {}

  analytics.totalVisitors = allSessions.size;
  analytics.anonymousVisitors = anonymousSessions.size;
  analytics.loggedInVisitors = loggedInSessions.size;
  analytics.todayVisitors = todaySessions.size;
  analytics.weekVisitors = weekSessions.size;
  analytics.monthVisitors = monthSessions.size;
  analytics.yearVisitors = yearSessions.size;
  analytics.dailyTrend = toTrend(dailyMap).slice(-30);
  analytics.monthlyTrend = toTrend(monthlyMap).slice(-12);
  analytics.yearlyTrend = toTrend(yearlyMap).slice(-5);
  analytics.topCategories = toCategoryMetrics(categoryMap);
  analytics.todayTopCategories = toCategoryMetrics(todayCategoryMap);
  analytics.weekTopCategories = toCategoryMetrics(weekCategoryMap);
  analytics.monthTopCategories = toCategoryMetrics(monthCategoryMap);
  analytics.yearTopCategories = toCategoryMetrics(yearCategoryMap);
  analytics.topPages = Array.from(pageMap.values()).sort((a, b) => b.views - a.views).slice(0, 8);

  return analytics;
}

// ── Recent Visitors List ─────────────────────────────────────────────────
export async function fetchRecentVisitors(max: number = 10): Promise<VisitorRecord[]> {
  try {
    const q = query(collection(db, VISITOR_DAILY_STATS_COLLECTION), orderBy('lastSeen', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((statsDoc) => {
      const data: any = statsDoc.data();
      const categoryCounts = data.categoryCounts || {};
      const topCategoryKey = Object.entries(categoryCounts).sort((a: any, b: any) => Number(b[1] || 0) - Number(a[1] || 0))[0]?.[0] || '';
      return {
        sessionId: data.sessionId || statsDoc.id,
        visitorType: data.visitorType || (data.email ? 'logged-in' : 'anonymous'),
        displayName: data.displayName || (data.email ? 'Visitor' : 'Anonymous visitor'),
        email: data.email || '',
        avatarUrl: data.avatarUrl || '',
        lastSeen: data.lastSeen,
        pageViews: Number(data.pageViews || 0),
        events: Number(data.events || 0),
        downloadCount: Number(data.downloads || 0),
        topCategory: (data.categoryLabels || {})[topCategoryKey] || categoryLabelFromKey(topCategoryKey),
        lastPage: data.lastPage || '/',
        date: data.date || '',
      };
    });
  } catch {
    try {
      const snap = await getDocs(collection(db, 'visitors'));
      return snap.docs.slice(0, max).map((visitorDoc) => visitorDoc.data() as VisitorRecord);
    } catch {
      return [];
    }
  }
}

// ── AdSense Settings (Firestore) ─────────────────────────────────────────
const ADSENSE_DOC = 'settings/adsense';

export async function getAdSenseSettings(): Promise<AdSenseSettings> {
  try {
    const snap = await getDoc(doc(db, ADSENSE_DOC));
    if (snap.exists()) return snap.data() as AdSenseSettings;
  } catch (err) {
    console.warn('AdSense settings fetch failed:', err);
  }
  return {
    publisherId: '',
    bannerSlot: '',
    inFeedSlot: '',
    inArticleSlot: '',
    sidebarSlot: '',
    multiplexSlot: '',
    enabled: false,
    verificationCode: '',
  };
}

export async function saveAdSenseSettings(settings: AdSenseSettings): Promise<void> {
  await setDoc(doc(db, ADSENSE_DOC), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

// ── Subscribe to online count (real-time) ────────────────────────────────
export function subscribeToOnlineCount(onUpdate: (count: number) => void): Unsubscribe {
  const q = query(collection(db, 'online_visitors'), where('online', '==', true));
  return onSnapshot(q, (snap) => onUpdate(snap.size), () => onUpdate(0));
}
