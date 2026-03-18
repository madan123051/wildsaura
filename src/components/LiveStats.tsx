import React, { useState } from 'react';
import { Users, Heart, MessageCircle, Eye } from 'lucide-react';

interface LiveStatsProps {
  onlineCount: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
}

export const LiveStats: React.FC<LiveStatsProps> = ({
  onlineCount, totalLikes, totalComments, totalViews,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '5.5rem',
        left: '1.25rem',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'flex-start',
      }}
    >
      {/* Expanded Stats Panel */}
      {expanded && (
        <div
          style={{
            background: 'rgba(10, 10, 10, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            minWidth: '180px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--wa-gold)', letterSpacing: '0.1em', fontWeight: 600 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,0.6)',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            LIVE STATS
          </div>

          <StatRow icon={<Users size={14} />} label="Online Now" value={onlineCount} color="#22c55e" pulse />
          <StatRow icon={<Heart size={14} />} label="Total Likes" value={totalLikes} color="#f87171" />
          <StatRow icon={<MessageCircle size={14} />} label="Comments" value={totalComments} color="#60a5fa" />
          <StatRow icon={<Eye size={14} />} label="Total Views" value={totalViews} color="#c084fc" />
        </div>
      )}

      {/* Toggle Button - Live Badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.85rem',
          background: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201, 168, 76, 0.3)',
          borderRadius: '24px',
          cursor: 'pointer',
          color: 'var(--wa-gold)',
          fontSize: '0.75rem',
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: onlineCount > 0 ? '#22c55e' : '#f59e0b',
          boxShadow: onlineCount > 0 ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 8px rgba(245,158,11,0.4)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <Users size={14} />
        <span>{onlineCount}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>LIVE</span>
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const StatRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  pulse?: boolean;
}> = ({ icon, label, value, color, pulse }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(235,230,220,0.5)', fontSize: '0.75rem' }}>
      <span style={{ color }}>{icon}</span>
      {label}
    </div>
    <span style={{
      fontSize: '0.85rem',
      fontWeight: 700,
      color,
      fontVariantNumeric: 'tabular-nums',
      transition: 'all 0.3s ease',
    }}>
      {value.toLocaleString()}
    </span>
  </div>
);
