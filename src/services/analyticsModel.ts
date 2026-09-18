export type VisitorEventType =
  | 'page_view' | 'category_view' | 'photo_view' | 'story_view' | 'video_view'
  | 'share' | 'download' | 'like' | 'comment';

export interface VisitorEventInput {
  type: VisitorEventType;
  page?: string;
  category?: string;
  targetId?: string;
  targetTitle?: string;
  visitor?: { email?: string; displayName?: string; avatarUrl?: string; loginMethod?: string } | null;
}
export interface AnalyticsTrendPoint { label: string; visitors: number; pageViews: number; events: number; }
export interface CategoryMetric { category: string; views: number; shares: number; downloads: number; likes: number; comments: number; total: number; }
export interface PageMetric { page: string; views: number; }
export interface SiteAnalytics {
  totalVisitors: number; totalPageViews: number; totalEvents: number; totalLikes: number;
  totalShares: number; totalDownloads: number; totalComments: number; totalCommunityPosts: number;
  onlineNow: number; anonymousVisitors: number; loggedInVisitors: number;
  todayVisitors: number; weekVisitors: number; monthVisitors: number; yearVisitors: number;
  todayPageViews: number; weekPageViews: number; monthPageViews: number; yearPageViews: number;
  dailyTrend: AnalyticsTrendPoint[]; monthlyTrend: AnalyticsTrendPoint[]; yearlyTrend: AnalyticsTrendPoint[];
  topCategories: CategoryMetric[]; todayTopCategories: CategoryMetric[]; weekTopCategories: CategoryMetric[];
  monthTopCategories: CategoryMetric[]; yearTopCategories: CategoryMetric[]; topPages: PageMetric[];
}
export interface VisitorRecord {
  email?: string; displayName: string; avatarUrl?: string; createdAt?: number; lastSeen?: number;
  downloadCount?: number; sessionId?: string; visitorType?: 'anonymous' | 'logged-in';
  pageViews?: number; events?: number; topCategory?: string; lastPage?: string; date?: string;
}



export type AnalyticsRow = Record<string, any>;
export const number = (value: any): number => {
  const result = Number(value || 0);
  return Number.isFinite(result) ? Math.max(0, result) : 0;
};
export function timestamp(value: any): number {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number') return value;
  return value ? new Date(value).getTime() || 0 : 0;
}
export function localParts(d = new Date()) {
  const day = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return { day, month: day.slice(0, 7), year: day.slice(0, 4) };
}
const counters = ['pageViews', 'events', 'likes', 'shares', 'downloads', 'comments'];

// New daily buckets coexist with the cumulative records written by PR #243.
// The residual preserves pre-fix activity without counting new buckets twice.
export function sessionRows(sessions: Record<string, AnalyticsRow>): AnalyticsRow[] {
  return Object.entries(sessions).flatMap(([id, s]) => {
    const days = Object.entries(s.days || {}) as [string, AnalyticsRow][];
    if (!days.length) return [{ ...s, sessionId: s.sessionId || id }];
    const rows = days.map(([date, values]) => ({
      ...s, ...values, sessionId: s.sessionId || id, date,
      month: date.slice(0, 7), year: date.slice(0, 4),
    }));
    const residual: AnalyticsRow = { ...s, sessionId: s.sessionId || id };
    for (const key of counters) {
      residual[key] = Math.max(0, number(s[key]) - rows.reduce((sum, r) => sum + number(r[key]), 0));
    }
    if (counters.some(key => residual[key] > 0)) rows.push(residual as typeof rows[number]);
    return rows;
  });
}

export function buildAnalytics(rows: AnalyticsRow[], events: AnalyticsRow[], now = new Date()): SiteAnalytics {
  const { day: today, year } = localParts(now);
  const weekAgo = now.getTime() - 7 * 86400000;
  const monthAgo = now.getTime() - 30 * 86400000;
  const a: SiteAnalytics = {
    totalVisitors: 0, totalPageViews: 0, totalEvents: 0, totalLikes: 0,
    totalShares: 0, totalDownloads: 0, totalComments: 0, totalCommunityPosts: 0,
    onlineNow: 0, anonymousVisitors: 0, loggedInVisitors: 0,
    todayVisitors: 0, weekVisitors: 0, monthVisitors: 0, yearVisitors: 0,
    todayPageViews: 0, weekPageViews: 0, monthPageViews: 0, yearPageViews: 0,
    dailyTrend: [], monthlyTrend: [], yearlyTrend: [], topCategories: [],
    todayTopCategories: [], weekTopCategories: [], monthTopCategories: [], yearTopCategories: [], topPages: [],
  };
  const all = new Set<string>(), logged = new Set<string>();
  const periods = [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()];
  type Trend = { sessions: Set<string>; pageViews: number; events: number };
  const trends = [new Map<string, Trend>(), new Map<string, Trend>(), new Map<string, Trend>()];
  for (const row of rows) {
    const id = row.sessionId || row.id;
    if (!id) continue;
    all.add(id);
    if (row.visitorType === 'logged-in' || row.email) logged.add(id);
    const pv = number(row.pageViews), ev = number(row.events);
    a.totalPageViews += pv; a.totalEvents += ev;
    a.totalLikes += number(row.likes); a.totalShares += number(row.shares);
    a.totalDownloads += number(row.downloads); a.totalComments += number(row.comments);
    const date = row.date || '', month = row.month || date.slice(0, 7), yr = row.year || date.slice(0, 4);
    const seen = date ? new Date(date + 'T00:00:00').getTime() : timestamp(row.lastSeen || row.createdAt);
    const inPeriod = [date === today, seen >= weekAgo, seen >= monthAgo, yr === year];
    const viewKeys = ['todayPageViews', 'weekPageViews', 'monthPageViews', 'yearPageViews'] as const;
    inPeriod.forEach((included, i) => { if (included) { periods[i].add(id); a[viewKeys[i]] += pv; } });
    [date, month, yr].forEach((label, i) => {
      if (!label) return;
      const entry = trends[i].get(label) || { sessions: new Set<string>(), pageViews: 0, events: 0 };
      entry.sessions.add(id); entry.pageViews += pv; entry.events += ev;
      trends[i].set(label, entry);
    });
  }
  a.totalVisitors = all.size; a.loggedInVisitors = logged.size;
  a.anonymousVisitors = all.size - logged.size;
  [a.todayVisitors, a.weekVisitors, a.monthVisitors, a.yearVisitors] = periods.map(p => p.size);
  const trendArrays = trends.map(m => Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({ label, visitors: v.sessions.size, pageViews: v.pageViews, events: v.events })));
  [a.dailyTrend, a.monthlyTrend, a.yearlyTrend] = [trendArrays[0].slice(-30), trendArrays[1].slice(-12), trendArrays[2].slice(-5)];
  const categories = Array.from({ length: 5 }, () => new Map<string, CategoryMetric>());
  const pages = new Map<string, PageMetric>();
  for (const event of events) {
    if (event.type === 'page_view') {
      const page = event.page || '/';
      const entry = pages.get(page) || { page, views: 0 };
      entry.views++; pages.set(page, entry);
    }
    const key = event.categoryKey || event.category;
    if (!key || key === 'all') continue;
    const time = timestamp(event.timestamp);
    const date = event.date || (time ? localParts(new Date(time)).day : '');
    [true, date === today, time >= weekAgo, time >= monthAgo, (event.year || date.slice(0, 4)) === year].forEach((included, i) => {
      if (!included) return;
      const c = categories[i].get(key) || { category: event.category || key, views: 0, shares: 0, downloads: 0, likes: 0, comments: 0, total: 0 };
      if (['page_view', 'photo_view', 'category_view'].includes(event.type)) c.views++;
      if (event.type === 'share') c.shares++;
      if (event.type === 'download') c.downloads++;
      if (event.type === 'like') c.likes++;
      if (event.type === 'comment') c.comments++;
      c.total++; categories[i].set(key, c);
    });
  }
  [a.topCategories, a.todayTopCategories, a.weekTopCategories, a.monthTopCategories, a.yearTopCategories] =
    categories.map(m => Array.from(m.values()).sort((a, b) => b.total - a.total).slice(0, 8));
  a.topPages = Array.from(pages.values()).sort((a, b) => b.views - a.views).slice(0, 8);
  return a;
}

export function recentVisitors(rows: AnalyticsRow[], max = 8): VisitorRecord[] {
  const bySession = new Map<string, AnalyticsRow>();
  for (const row of rows) {
    const id = row.sessionId || row.id;
    if (!id) continue;
    const previous = bySession.get(id);
    if (!previous || timestamp(row.lastSeen) > timestamp(previous.lastSeen)) bySession.set(id, row);
  }
  return Array.from(bySession.values()).sort((a, b) => timestamp(b.lastSeen) - timestamp(a.lastSeen)).slice(0, max).map(s => ({
    ...s, sessionId: s.sessionId || s.id, displayName: s.displayName || 'Anonymous visitor',
    lastSeen: timestamp(s.lastSeen), createdAt: timestamp(s.createdAt), downloadCount: number(s.downloads || s.downloadCount),
    topCategory: s.lastCategory || '',
  }));
}
