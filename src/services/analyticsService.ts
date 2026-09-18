import { realtimeDb } from '../firebaseCore';
import { get, onValue, push, ref, runTransaction, set, update, type Unsubscribe } from 'firebase/database';

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

const ROOT = 'analytics';
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

function localParts(d = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  const day = local.toISOString().slice(0, 10);
  return { day, month: day.slice(0, 7), year: day.slice(0, 4) };
}
function sessionId() {
  let id = sessionStorage.getItem('wa_session_id');
  if (!id) { id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`; sessionStorage.setItem('wa_session_id', id); }
  return id;
}
function safeKey(v: string) { return v.replace(/[.#$\[\]\/]/g, '_').slice(0, 160); }
function isAdminVisitor(input?: VisitorEventInput['visitor']) {
  return !!ADMIN_EMAIL && (input?.email || '').trim().toLowerCase() === ADMIN_EMAIL;
}
function empty(): SiteAnalytics {
  return { totalVisitors:0,totalPageViews:0,totalEvents:0,totalLikes:0,totalShares:0,totalDownloads:0,totalComments:0,totalCommunityPosts:0,
    onlineNow:0,anonymousVisitors:0,loggedInVisitors:0,todayVisitors:0,weekVisitors:0,monthVisitors:0,yearVisitors:0,
    todayPageViews:0,weekPageViews:0,monthPageViews:0,yearPageViews:0,dailyTrend:[],monthlyTrend:[],yearlyTrend:[],
    topCategories:[],todayTopCategories:[],weekTopCategories:[],monthTopCategories:[],yearTopCategories:[],topPages:[] };
}
const n=(v:any)=>Number(v||0);
const categoryKey=(v?:string)=>safeKey((v||'').trim().toLowerCase());

export async function trackVisitorEvent(input: VisitorEventInput): Promise<void> {
  if (!realtimeDb || isAdminVisitor(input.visitor) || localStorage.getItem('wa_admin_session') === 'true') return;
  const sid=sessionId(), {day,month,year}=localParts(), now=Date.now();
  const visitorType=input.visitor?.email?'logged-in':'anonymous';
  const page=input.page || window.location.pathname || '/';
  const cat=categoryKey(input.category);
  const base=`${ROOT}/sessions/${safeKey(sid)}`;
  const counters:any={ events:1 };
  if(input.type==='page_view') counters.pageViews=1;
  if(input.type==='photo_view') counters.photoViews=1;
  if(input.type==='story_view') counters.storyViews=1;
  if(input.type==='video_view') counters.videoViews=1;
  if(input.type==='category_view') counters.categoryViews=1;
  if(input.type==='share') counters.shares=1;
  if(input.type==='download') counters.downloads=1;
  if(input.type==='like') counters.likes=1;
  if(input.type==='comment') counters.comments=1;

  const profile:any={sessionId:sid,visitorType,email:input.visitor?.email||'',displayName:input.visitor?.displayName||(visitorType==='logged-in'?'Visitor':'Anonymous visitor'),
    avatarUrl:input.visitor?.avatarUrl||'',lastSeen:now,lastPage:page,lastCategory:input.category||'',date:day,month,year};
  const existing=(await get(ref(realtimeDb,base))).val();
  if(!existing) profile.createdAt=now;
  await update(ref(realtimeDb,base),profile);
  for(const [key,amount] of Object.entries(counters)) {
    await runTransaction(ref(realtimeDb,`${base}/${key}`),(v)=>n(v)+n(amount));
  }
  if(cat) {
    await runTransaction(ref(realtimeDb,`${base}/categoryCounts/${cat}`),(v)=>n(v)+1);
    await set(ref(realtimeDb,`${base}/categoryLabels/${cat}`),input.category||cat);
  }
  await push(ref(realtimeDb,`${ROOT}/events`),{type:input.type,page,category:input.category||'',categoryKey:cat,targetId:input.targetId||'',targetTitle:input.targetTitle||'',
    sessionId:sid,visitorType,date,month,year,timestamp:now,referrer:document.referrer||''});
}

function buildAnalytics(sessions:any={},events:any={},presence:any={}):SiteAnalytics {
  const a=empty(), now=new Date(), {day:today,year:cy}=localParts(now);
  const weekAgo=Date.now()-7*86400000, monthAgo=Date.now()-30*86400000;
  const daily=new Map<string,any>(), monthly=new Map<string,any>(), yearly=new Map<string,any>();
  const cats=new Map<string,CategoryMetric>(), tc=new Map<string,CategoryMetric>(), wc=new Map<string,CategoryMetric>(), mc=new Map<string,CategoryMetric>(), yc=new Map<string,CategoryMetric>();
  const pages=new Map<string,PageMetric>();
  const addTrend=(m:Map<string,any>,k:string,sid:string,pv:number,ev:number)=>{if(!k)return;const x=m.get(k)||{sessions:new Set<string>(),pageViews:0,events:0};x.sessions.add(sid);x.pageViews+=pv;x.events+=ev;m.set(k,x);};
  const addCat=(m:Map<string,CategoryMetric>,k:string,label:string,type:VisitorEventType)=>{if(!k)return;const x=m.get(k)||{category:label||k,views:0,shares:0,downloads:0,likes:0,comments:0,total:0};if(['photo_view','category_view','page_view'].includes(type))x.views++;if(type==='share')x.shares++;if(type==='download')x.downloads++;if(type==='like')x.likes++;if(type==='comment')x.comments++;x.total++;m.set(k,x);};
  Object.values(sessions||{}).forEach((s:any)=>{
    if(!s?.sessionId)return; const pv=n(s.pageViews), ev=n(s.events), seen=n(s.lastSeen||s.createdAt);
    a.totalVisitors++;a.totalPageViews+=pv;a.totalEvents+=ev;a.totalShares+=n(s.shares);a.totalDownloads+=n(s.downloads);a.totalLikes+=n(s.likes);a.totalComments+=n(s.comments);
    if(s.visitorType==='logged-in')a.loggedInVisitors++;else a.anonymousVisitors++;
    if(s.date===today){a.todayVisitors++;a.todayPageViews+=pv;} if(seen>=weekAgo){a.weekVisitors++;a.weekPageViews+=pv;} if(seen>=monthAgo){a.monthVisitors++;a.monthPageViews+=pv;} if(s.year===cy){a.yearVisitors++;a.yearPageViews+=pv;}
    addTrend(daily,s.date,s.sessionId,pv,ev);addTrend(monthly,s.month,s.sessionId,pv,ev);addTrend(yearly,s.year,s.sessionId,pv,ev);
  });
  Object.values(events||{}).forEach((e:any)=>{const type=e.type as VisitorEventType,k=e.categoryKey||categoryKey(e.category),ts=n(e.timestamp);if(type==='page_view'){const x=pages.get(e.page)||{page:e.page||'/',views:0};x.views++;pages.set(x.page,x);}addCat(cats,k,e.category||k,type);if(e.date===today)addCat(tc,k,e.category||k,type);if(ts>=weekAgo)addCat(wc,k,e.category||k,type);if(ts>=monthAgo)addCat(mc,k,e.category||k,type);if(e.year===cy)addCat(yc,k,e.category||k,type);});
  a.onlineNow=Object.values(presence||{}).filter((p:any)=>p?.online && n(p.lastSeen)>Date.now()-90000).length;
  const trend=(m:Map<string,any>)=>Array.from(m.entries()).sort(([x],[y])=>x.localeCompare(y)).map(([label,x])=>({label,visitors:x.sessions.size,pageViews:x.pageViews,events:x.events}));
  const cm=(m:Map<string,CategoryMetric>)=>Array.from(m.values()).sort((x,y)=>y.total-x.total).slice(0,8);
  a.dailyTrend=trend(daily).slice(-30);a.monthlyTrend=trend(monthly).slice(-12);a.yearlyTrend=trend(yearly).slice(-5);
  a.topCategories=cm(cats);a.todayTopCategories=cm(tc);a.weekTopCategories=cm(wc);a.monthTopCategories=cm(mc);a.yearTopCategories=cm(yc);a.topPages=Array.from(pages.values()).sort((x,y)=>y.views-x.views).slice(0,8);
  return a;
}
export async function fetchSiteAnalytics():Promise<SiteAnalytics>{
  if(!realtimeDb)return empty();
  const [s,e,p]=await Promise.all([get(ref(realtimeDb,`${ROOT}/sessions`)),get(ref(realtimeDb,`${ROOT}/events`)),get(ref(realtimeDb,'presence'))]);
  return buildAnalytics(s.val(),e.val(),p.val());
}
export async function fetchRecentVisitors(max=10):Promise<VisitorRecord[]>{
  if(!realtimeDb)return[];
  const snap=await get(ref(realtimeDb,`${ROOT}/sessions`));
  return Object.values(snap.val()||{}).sort((a:any,b:any)=>n(b.lastSeen)-n(a.lastSeen)).slice(0,max).map((s:any)=>({...s,downloadCount:n(s.downloads),topCategory:Object.entries(s.categoryCounts||{}).sort((a:any,b:any)=>n(b[1])-n(a[1]))[0]?.[0]||''}));
}
export function subscribeToOnlineCount(cb:(count:number)=>void):Unsubscribe{
  if(!realtimeDb){cb(0);return()=>{};}
  return onValue(ref(realtimeDb,'presence'),snap=>cb(Object.values(snap.val()||{}).filter((p:any)=>p?.online&&n(p.lastSeen)>Date.now()-90000).length),()=>cb(0));
}
export function subscribeToAnalytics(cb:(data:SiteAnalytics,visitors:VisitorRecord[])=>void):Unsubscribe{
  if(!realtimeDb){cb(empty(),[]);return()=>{};}
  return onValue(ref(realtimeDb,ROOT),snap=>{const v=snap.val()||{};const data=buildAnalytics(v.sessions,v.events,v.presence);const visitors=Object.values(v.sessions||{}).sort((a:any,b:any)=>n(b.lastSeen)-n(a.lastSeen)).slice(0,8) as VisitorRecord[];cb(data,visitors);});
}
export async function trackPageView(page:string){await trackVisitorEvent({type:'page_view',page});}
export async function trackShare(photoId:string){await trackVisitorEvent({type:'share',targetId:photoId});}
