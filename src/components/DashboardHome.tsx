import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Wifi,
  Eye,
  Heart,
  Image,
  BookOpen,
  Film,
  Download,
  MessageSquare,
  Activity,
  TrendingUp,
  Clock,
  Monitor,
  Smartphone,
  Globe,
  BarChart3,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import type { Photo, Story, Video } from '../types';
import type { SiteAnalytics, VisitorRecord } from '../services/analyticsService';
import {
  fetchDailyAnalytics,
  fetchMonthlyAnalytics,
  fetchYearlyAnalytics,
  fetchTodayLiveStats,
  fetchRecentVisits,
  type DailyStats,
  type MonthlyStats,
  type YearlyStats,
  type TodayStats,
  type RecentVisit,
} from '../services/siteTrackingService';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DashboardHomeProps {
  photos: Photo[];
  stories: Story[];
  videos: Video[];
  analytics: SiteAnalytics | null;
  onlineCount: number;
  totalLikes: number;
  recentVisitors: VisitorRecord[];
  analyticsLoading: boolean;
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(201,168,76,0.1)',
  borderRadius: 12,
  padding: 20,
  transition: 'transform 0.2s, box-shadow 0.2s',
};

const cardHover: React.CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

const goldText: React.CSSProperties = { color: 'var(--wa-gold, #c9a84c)' };
const mutedText: React.CSSProperties = { color: 'rgba(255,255,255,0.5)', fontSize: 13 };
const bigNumber: React.CSSProperties = { fontSize: 32, fontWeight: 700, color: '#fff', margin: '8px 0 2px' };

const sectionTitle: React.CSSProperties = {
  ...goldText,
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function countryEmoji(country: string): string {
  const map: Record<string, string> = {
    US: '🇺🇸', CA: '🇨🇦', EU: '🇪🇺', AS: '🌏', AF: '🌍',
    AU: '🇦🇺', OC: '🌏', IN: '🇮🇳', 'Asia': '🌏',
    'America': '🇺🇸', 'Europe': '🇪🇺', 'Africa': '🌍',
    'Australia': '🇦🇺', 'Pacific': '🌏',
  };
  return map[country] ?? '🌐';
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// ─── Animated Number ───────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 30;
    const stepTime = duration / steps;
    let current = 0;
    const inc = value / steps;
    const timer = setInterval(() => {
      current += inc;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(current));
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

// ─── Bar Chart Component ───────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

function BarChart({ data, height = 200 }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: data.length > 20 ? 2 : 6,
          height,
          padding: '0 4px',
          minWidth: data.length * (data.length > 20 ? 16 : 36),
        }}
      >
        {data.map((item, i) => {
          const barH = Math.max((item.value / maxVal) * (height - 30), 2);
          const isHovered = hoveredIdx === i;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: data.length > 20 ? 12 : 28,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: barH + 30,
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid var(--wa-gold, #c9a84c)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                >
                  {item.label}: <strong>{item.value.toLocaleString()}</strong>
                </div>
              )}
              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  height: barH,
                  borderRadius: '4px 4px 0 0',
                  background: isHovered
                    ? 'linear-gradient(180deg, #e2c060, rgba(201,168,76,0.6))'
                    : 'linear-gradient(180deg, var(--wa-gold, #c9a84c), rgba(201,168,76,0.3))',
                  transition: 'height 0.5s ease, background 0.2s',
                  minHeight: 2,
                }}
              />
              {/* Label */}
              <span
                style={{
                  fontSize: data.length > 20 ? 8 : 10,
                  color: 'rgba(255,255,255,0.4)',
                  transform: data.length > 15 ? 'rotate(-45deg)' : undefined,
                  transformOrigin: 'top center',
                  whiteSpace: 'nowrap',
                  height: 20,
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pulse Dot ─────────────────────────────────────────────────────────────────

function PulseDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: '#22c55e',
        boxShadow: '0 0 8px #22c55e',
        animation: 'pulse-dot 1.5s infinite',
        marginRight: 6,
      }}
    >
      <style>{`@keyframes pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }`}</style>
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type ChartTab = 'daily' | 'monthly' | 'yearly';

const DashboardHome: React.FC<DashboardHomeProps> = ({
  photos,
  stories,
  videos,
  analytics,
  onlineCount,
  totalLikes,
  recentVisitors: _recentVisitors,
  analyticsLoading,
}) => {
  // ── State ──
  const [chartTab, setChartTab] = useState<ChartTab>('daily');
  const [dailyData, setDailyData] = useState<DailyStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyStats[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load chart data on tab change ──
  const loadChartData = useCallback(async (tab: ChartTab) => {
    setChartLoading(true);
    try {
      if (tab === 'daily') {
        const data = await fetchDailyAnalytics(30);
        setDailyData(data);
      } else if (tab === 'monthly') {
        const data = await fetchMonthlyAnalytics(12);
        setMonthlyData(data);
      } else {
        const data = await fetchYearlyAnalytics();
        setYearlyData(data);
      }
    } catch (err) {
      console.error('Chart data load error:', err);
    }
    setChartLoading(false);
  }, []);

  // ── Load today stats & recent visits on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const [today, recent] = await Promise.all([
          fetchTodayLiveStats(),
          fetchRecentVisits(15),
        ]);
        setTodayStats(today);
        setRecentVisits(recent);
      } catch (err) {
        console.error('Dashboard data load error:', err);
      }
    };
    load();
    loadChartData('daily');
  }, [loadChartData]);

  useEffect(() => {
    loadChartData(chartTab);
  }, [chartTab, loadChartData]);

  // ── Refresh ──
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [today, recent] = await Promise.all([
        fetchTodayLiveStats(),
        fetchRecentVisits(15),
      ]);
      setTodayStats(today);
      setRecentVisits(recent);
      await loadChartData(chartTab);
    } catch (err) {
      console.error('Refresh error:', err);
    }
    setRefreshing(false);
  };

  // ── Derived values ──
  const allTimeVisits = yearlyData.reduce((sum, y) => sum + y.totalVisits, 0);
  const todayVisits = todayStats?.totalVisits ?? 0;
  const totalUsers = analytics?.totalUsers ?? 0;

  // Week visits: sum of last 7 days
  const weekVisits = dailyData.slice(-7).reduce((s, d) => s + d.totalVisits, 0);
  // Month visits from current monthly data
  const thisMonthStr = new Date().toISOString().slice(0, 7);
  const thisMonthVisits = monthlyData.find((m) => m.month === thisMonthStr)?.totalVisits ?? 0;
  // Year visits from current yearly data
  const thisYearStr = new Date().toISOString().slice(0, 4);
  const thisYearVisits = yearlyData.find((y) => y.year === thisYearStr)?.totalVisits ?? 0;

  // Chart data mapping
  const chartData =
    chartTab === 'daily'
      ? dailyData.map((d) => ({ label: d.date.slice(5), value: d.totalVisits }))
      : chartTab === 'monthly'
        ? monthlyData.map((m) => ({ label: m.month.slice(2), value: m.totalVisits }))
        : yearlyData.map((y) => ({ label: y.year, value: y.totalVisits }));

  // ── Render ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Refresh Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 8,
            padding: '8px 16px',
            color: 'var(--wa-gold, #c9a84c)',
            cursor: refreshing ? 'wait' : 'pointer',
            fontSize: 13,
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </button>
      </div>

      {/* ═══ A) Top Stats — 4 big cards ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {/* Total Visits */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={18} style={goldText} />
            <span style={mutedText}>Total Visits</span>
          </div>
          <div style={bigNumber}>
            <AnimatedNumber value={allTimeVisits} />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>All time</span>
        </div>

        {/* Online Now */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={18} style={{ color: '#22c55e' }} />
            <span style={mutedText}>Online Now</span>
          </div>
          <div style={bigNumber}>
            <PulseDot />
            <AnimatedNumber value={onlineCount} />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Active visitors</span>
        </div>

        {/* Today */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} style={goldText} />
            <span style={mutedText}>Today's Visits</span>
          </div>
          <div style={bigNumber}>
            <AnimatedNumber value={todayVisits} />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {todayStats ? `${todayStats.uniqueVisitors} unique` : '—'}
          </span>
        </div>

        {/* Total Users */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={goldText} />
            <span style={mutedText}>Registered Users</span>
          </div>
          <div style={bigNumber}>
            <AnimatedNumber value={totalUsers} />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Total accounts</span>
        </div>
      </div>

      {/* ═══ B) Second Stats Row — 6 smaller cards ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { icon: <Image size={16} />, label: 'Photos', value: photos.length },
          { icon: <BookOpen size={16} />, label: 'Stories', value: stories.length },
          { icon: <Film size={16} />, label: 'Videos', value: videos.length },
          { icon: <Download size={16} />, label: 'Downloads', value: analytics?.totalDownloads ?? 0 },
          { icon: <MessageSquare size={16} />, label: 'Comments', value: analytics?.totalComments ?? 0 },
          { icon: <Heart size={16} />, label: 'Likes', value: totalLikes },
        ].map((item, i) => (
          <div key={i} style={{ ...card, padding: 14, textAlign: 'center' }}>
            <div style={{ ...goldText, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              <AnimatedNumber value={item.value} />
            </div>
            <div style={mutedText}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ C) Visit Analytics — Tabbed Charts ═══ */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={sectionTitle}>
            <BarChart3 size={20} />
            Visit Analytics
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['daily', 'monthly', 'yearly'] as ChartTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setChartTab(tab)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: chartTab === tab ? 'var(--wa-gold, #c9a84c)' : 'rgba(255,255,255,0.06)',
                  color: chartTab === tab ? '#000' : 'rgba(255,255,255,0.6)',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {chartLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
            Loading chart data...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>
            No data yet
          </div>
        ) : (
          <BarChart data={chartData} height={220} />
        )}

        <div style={{ marginTop: 12, textAlign: 'center', ...mutedText }}>
          Total:{' '}
          <strong style={{ color: 'var(--wa-gold, #c9a84c)' }}>
            {chartData.reduce((s, d) => s + d.value, 0).toLocaleString()}
          </strong>{' '}
          visits in this period
        </div>
      </div>

      {/* ═══ D) Today's Live Dashboard ═══ */}
      <div style={card}>
        <div style={sectionTitle}>
          <Clock size={20} />
          Today's Live Dashboard
        </div>

        {todayStats ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {/* Page Breakdown */}
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ ...goldText, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                📄 Page Breakdown
              </div>
              {Object.keys(todayStats.pageBreakdown).length === 0 ? (
                <div style={mutedText}>No page data yet</div>
              ) : (
                Object.entries(todayStats.pageBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([page, count]) => (
                    <div
                      key={page}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>/{page.replace(/_/g, '/')}</span>
                      <span style={{ ...goldText, fontWeight: 600 }}>{count}</span>
                    </div>
                  ))
              )}
            </div>

            {/* Visitors Type */}
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ ...goldText, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                👥 Visitor Types
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>
                    {todayStats.newVisitors}
                  </div>
                  <div style={mutedText}>New</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>
                    {todayStats.returningVisitors}
                  </div>
                  <div style={mutedText}>Returning</div>
                </div>
              </div>
            </div>

            {/* Peak Hour */}
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ ...goldText, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                ⏰ Peak Hour
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>
                {formatHour(todayStats.peakHour)}
              </div>
              <div style={mutedText}>
                {todayStats.peakHourVisits} visit{todayStats.peakHourVisits !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, ...mutedText }}>
            {analyticsLoading ? 'Loading...' : 'No data for today yet'}
          </div>
        )}
      </div>

      {/* ═══ E) Visitor Growth Card ═══ */}
      <div style={card}>
        <div style={sectionTitle}>
          <TrendingUp size={20} />
          Visitor Growth
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 16,
          }}
        >
          {[
            { label: 'Today', value: todayVisits, icon: '📅' },
            { label: 'This Week', value: weekVisits, icon: '📊' },
            { label: 'This Month', value: thisMonthVisits, icon: '🗓️' },
            { label: 'This Year', value: thisYearVisits, icon: '📈' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                padding: 16,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>
                <AnimatedNumber value={item.value} />
              </div>
              <div style={mutedText}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ F) Recent Visits ═══ */}
      <div style={card}>
        <div style={sectionTitle}>
          <Activity size={20} />
          Recent Visits
        </div>

        {recentVisits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, ...mutedText }}>
            No recent visits recorded yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentVisits.map((visit) => (
              <div
                key={visit.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 8,
                  fontSize: 13,
                  flexWrap: 'wrap',
                }}
              >
                {/* Device icon */}
                <div style={{ ...goldText, flexShrink: 0 }}>
                  {visit.device === 'mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}
                </div>

                {/* Page */}
                <div style={{ flex: '1 1 120px', color: '#fff', fontWeight: 500, minWidth: 80 }}>
                  {visit.page || '/'}
                </div>

                {/* Browser */}
                <div style={{ ...mutedText, flex: '0 0 auto' }}>
                  {visit.browser}
                </div>

                {/* Country */}
                <div style={{ flex: '0 0 auto', fontSize: 16 }}>
                  {countryEmoji(visit.country)}
                </div>

                {/* User */}
                {visit.isAuthenticated && (
                  <div
                    style={{
                      flex: '0 0 auto',
                      background: 'rgba(201,168,76,0.15)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 11,
                      color: 'var(--wa-gold, #c9a84c)',
                    }}
                  >
                    {visit.userEmail?.split('@')[0] ?? 'user'}
                  </div>
                )}

                {/* Time */}
                <div style={{ ...mutedText, flex: '0 0 auto', marginLeft: 'auto' }}>
                  {timeAgo(visit.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ G) Quick Stats — Category Breakdown ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {/* Category breakdown */}
        <div style={card}>
          <div style={sectionTitle}>
            <Globe size={20} />
            Content Overview
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Wildlife Photos', count: photos.filter((p) => p.category === 'wildlife').length, color: '#22c55e' },
              { label: 'Landscape Photos', count: photos.filter((p) => p.category === 'landscape').length, color: '#3b82f6' },
              { label: 'Macro Photos', count: photos.filter((p) => p.category === 'macro').length, color: '#f59e0b' },
              { label: 'Bird Photos', count: photos.filter((p) => p.category === 'birds').length, color: '#ef4444' },
              { label: 'Published Stories', count: stories.filter((s) => s.published).length, color: '#a855f7' },
              { label: 'Video Content', count: videos.length, color: '#06b6d4' },
            ].map((item, i) => {
              const maxCount = Math.max(photos.length, 1);
              const barWidth = Math.min((item.count / maxCount) * 100, 100);
              return (
                <div key={i}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{item.count}</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: item.color,
                        borderRadius: 3,
                        transition: 'width 0.8s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent photos */}
        <div style={card}>
          <div style={sectionTitle}>
            <Image size={20} />
            Recent Photos
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 8,
            }}
          >
            {photos.slice(0, 9).map((photo) => (
              <div
                key={photo.id}
                style={{
                  aspectRatio: '1',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                <img
                  src={photo.thumbnailUrl || photo.imageUrl}
                  alt={photo.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {photos.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, ...mutedText }}>
              No photos yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
