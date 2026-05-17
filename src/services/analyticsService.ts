import { db } from '../firebase';
import {
  collection, query, getDocs, onSnapshot, orderBy, limit,
  where, doc, setDoc, getDoc, serverTimestamp, Timestamp,
  Unsubscribe
} from 'firebase/firestore';

// ── Types ────────────────────────────────────────────────────────────────
export interface SiteAnalytics {
  totalVisitors: number;
  totalPageViews: number;
  totalLikes: number;
  totalShares: number;
  totalDownloads: number;
  totalComments: number;
  totalCommunityPosts: number;
  onlineNow: number;
  todayVisitors: number;
  weekVisitors: number;
  monthVisitors: number;
}

export interface VisitorRecord {
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt?: any;
  lastSeen?: any;
  downloadCount?: number;
}

export interface AdSenseSettings {
  publisherId: string;       // ca-pub-XXXX
  bannerSlot: string;
  inFeedSlot: string;
  inArticleSlot: string;
  sidebarSlot: string;
  multiplexSlot: string;
  enabled: boolean;
  updatedAt?: any;
}

// ── Page View Tracking ───────────────────────────────────────────────────
const PAGE_VIEWS_COLLECTION = 'page_views';

export async function trackPageView(page: string, sessionId?: string): Promise<void> {
  try {
    const docId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, PAGE_VIEWS_COLLECTION, docId), {
      page,
      sessionId: sessionId || 'anonymous',
      timestamp: serverTimestamp(),
      date: new Date().toISOString().split('T')[0],
    });
  } catch (err) {
    console.warn('Page view tracking failed:', err);
  }
}

// ── Share Tracking ───────────────────────────────────────────────────────
const SHARES_COLLECTION = 'shares';

export async function trackShare(photoId: string, platform: string): Promise<void> {
  try {
    const docId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, SHARES_COLLECTION, docId), {
      photoId,
      platform,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Share tracking failed:', err);
  }
}

// ── Fetch Analytics ──────────────────────────────────────────────────────
export async function fetchSiteAnalytics(): Promise<SiteAnalytics> {
  const analytics: SiteAnalytics = {
    totalVisitors: 0,
    totalPageViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalDownloads: 0,
    totalComments: 0,
    totalCommunityPosts: 0,
    onlineNow: 0,
    todayVisitors: 0,
    weekVisitors: 0,
    monthVisitors: 0,
  };

  try {
    // Total registered visitors
    const visitorsSnap = await getDocs(collection(db, 'visitors'));
    analytics.totalVisitors = visitorsSnap.size;

    // Calculate time-based visitor counts
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    visitorsSnap.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.();
      if (createdAt) {
        if (createdAt.toISOString().split('T')[0] === todayStr) analytics.todayVisitors++;
        if (createdAt >= weekAgo) analytics.weekVisitors++;
        if (createdAt >= monthAgo) analytics.monthVisitors++;
      }
      // Sum downloads
      analytics.totalDownloads += (data.downloadCount || 0);
    });

    // Total page views
    try {
      const pvSnap = await getDocs(collection(db, PAGE_VIEWS_COLLECTION));
      analytics.totalPageViews = pvSnap.size;
    } catch { analytics.totalPageViews = 0; }

    // Total likes from photos
    try {
      const photosSnap = await getDocs(collection(db, 'photos'));
      photosSnap.forEach((doc) => {
        const data = doc.data();
        analytics.totalLikes += (data.likeCount || 0);
      });
    } catch {}

    // Total shares
    try {
      const sharesSnap = await getDocs(collection(db, SHARES_COLLECTION));
      analytics.totalShares = sharesSnap.size;
    } catch { analytics.totalShares = 0; }

    // Total comments
    try {
      const commentsSnap = await getDocs(collection(db, 'comments'));
      analytics.totalComments = commentsSnap.size;
    } catch {}

    // Community posts
    try {
      const communitySnap = await getDocs(collection(db, 'community_posts'));
      analytics.totalCommunityPosts = communitySnap.size;
    } catch {}

    // Online now
    try {
      const onlineQ = query(collection(db, 'online_visitors'), where('online', '==', true));
      const onlineSnap = await getDocs(onlineQ);
      analytics.onlineNow = onlineSnap.size;
    } catch {}

  } catch (err) {
    console.error('Analytics fetch failed:', err);
  }

  return analytics;
}

// ── Recent Visitors List ─────────────────────────────────────────────────
export async function fetchRecentVisitors(max: number = 10): Promise<VisitorRecord[]> {
  try {
    const q = query(collection(db, 'visitors'), orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data() as VisitorRecord);
  } catch {
    // Fallback without orderBy (no index)
    const snap = await getDocs(collection(db, 'visitors'));
    const visitors = snap.docs.map((doc) => doc.data() as VisitorRecord);
    return visitors.slice(0, max);
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
