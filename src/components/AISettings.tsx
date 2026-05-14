import React, { useState, useEffect } from 'react';
import {
  Settings, Key, Cpu, Sparkles, MessageSquare, Eye, EyeOff,
  Save, CheckCircle2, XCircle, Loader2, Zap, Brain, Camera,
  AlertTriangle, RefreshCw,
} from 'lucide-react';
import { AISettings } from '../types';
import { getAISettings, saveAISettings } from '../services/aiSettingsService';

// ── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.15)',
  borderRadius: '8px', color: 'var(--wa-light)', fontSize: '0.85rem',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'rgba(235,230,220,0.5)',
  marginBottom: '0.35rem', letterSpacing: '0.05em',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(201,168,76,0.1)',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--wa-gold)',
  fontWeight: 600,
  marginBottom: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  letterSpacing: '0.05em',
};

// ── Provider Info ──────────────────────────────────────────────────────────

interface ProviderInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  supportsVision: boolean;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: <Sparkles size={20} />,
    color: '#8dc3d8',
    bgColor: 'rgba(66,133,244,0.1)',
    borderColor: 'rgba(66,133,244,0.25)',
    description: 'Fast, vision-capable, great for photo analysis',
    supportsVision: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: <Brain size={20} />,
    color: '#9fcb8f',
    bgColor: 'rgba(124,58,237,0.1)',
    borderColor: 'rgba(124,58,237,0.25)',
    description: 'Powerful text generation, cost-effective',
    supportsVision: false,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT (OpenAI)',
    icon: <Zap size={20} />,
    color: '#72aa81',
    bgColor: 'rgba(16,163,127,0.1)',
    borderColor: 'rgba(16,163,127,0.25)',
    description: 'Premium quality, vision-capable',
    supportsVision: true,
  },
];

// ── API Key Card ──────────────────────────────────────────────────────────

interface APIKeyCardProps {
  provider: ProviderInfo;
  value: string;
  onChange: (val: string) => void;
  onTest: () => void;
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  testMessage?: string;
}

const APIKeyCard: React.FC<APIKeyCardProps> = ({
  provider, value, onChange, onTest, testStatus, testMessage,
}) => {
  const [showKey, setShowKey] = useState(false);
  const hasKey = value && value.length > 0;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)',
      border: `1px solid ${hasKey ? provider.borderColor : 'rgba(201,168,76,0.08)'}`,
      borderRadius: '12px',
      padding: '1.25rem',
      transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: provider.bgColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: provider.color,
          }}>
            {provider.icon}
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--wa-light)', fontWeight: 600 }}>{provider.name}</p>
            <p style={{ fontSize: '0.65rem', color: 'rgba(235,230,220,0.35)' }}>{provider.description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {provider.supportsVision && (
            <span style={{
              padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.6rem',
              background: 'rgba(34,197,94,0.1)', color: '#4ade80',
              border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <Camera size={10} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} />
              Vision
            </span>
          )}
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: hasKey ? '#4ade80' : 'rgba(239,68,68,0.5)',
            boxShadow: hasKey ? '0 0 8px rgba(74,222,128,0.4)' : 'none',
          }} />
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${provider.name} API key...`}
          style={{ ...inputStyle, paddingRight: '2.5rem' }}
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(235,230,220,0.3)', padding: '0.25rem',
          }}
        >
          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onTest}
          disabled={!hasKey || testStatus === 'testing'}
          style={{
            padding: '0.4rem 0.85rem',
            background: hasKey ? provider.bgColor : 'rgba(255,255,255,0.03)',
            border: `1px solid ${hasKey ? provider.borderColor : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '8px',
            color: hasKey ? provider.color : 'rgba(235,230,220,0.3)',
            fontSize: '0.75rem', fontWeight: 500,
            cursor: hasKey ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            transition: 'all 0.2s',
            opacity: testStatus === 'testing' ? 0.7 : 1,
          }}
        >
          {testStatus === 'testing' ? (
            <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Testing...</>
          ) : testStatus === 'success' ? (
            <><CheckCircle2 size={13} /> Connected</>
          ) : testStatus === 'error' ? (
            <><XCircle size={13} /> Failed</>
          ) : (
            <><RefreshCw size={13} /> Test Key</>
          )}
        </button>
        {testMessage && (
          <span style={{
            fontSize: '0.7rem',
            color: testStatus === 'success' ? '#4ade80' : testStatus === 'error' ? '#f87171' : 'rgba(235,230,220,0.4)',
          }}>
            {testMessage}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Provider Selector ──────────────────────────────────────────────────────

interface ProviderSelectorProps {
  label: string;
  icon: React.ReactNode;
  description: string;
  value: string;
  onChange: (val: string) => void;
  options: { id: string; name: string; disabled?: boolean; disabledReason?: string }[];
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  label, icon, description, value, onChange, options,
}) => {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid rgba(201,168,76,0.1)',
      borderRadius: '12px',
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ color: 'var(--wa-gold)' }}>{icon}</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--wa-light)', fontWeight: 600 }}>{label}</span>
      </div>
      <p style={{ fontSize: '0.7rem', color: 'rgba(235,230,220,0.35)', marginBottom: '1rem' }}>{description}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {options.map((opt) => {
          const providerInfo = PROVIDERS.find(p => p.id === opt.id);
          const isSelected = value === opt.id;
          const isDisabled = opt.disabled;

          return (
            <label
              key={opt.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${isSelected ? (providerInfo?.borderColor || 'rgba(201,168,76,0.3)') : 'rgba(255,255,255,0.05)'}`,
                background: isSelected ? (providerInfo?.bgColor || 'rgba(201,168,76,0.08)') : 'rgba(0,0,0,0.15)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                transition: 'all 0.2s',
              }}
            >
              <input
                type="radio"
                name={label.replace(/\s+/g, '-').toLowerCase()}
                value={opt.id}
                checked={isSelected}
                onChange={() => !isDisabled && onChange(opt.id)}
                disabled={isDisabled}
                style={{ display: 'none' }}
              />
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: `2px solid ${isSelected ? (providerInfo?.color || 'var(--wa-gold)') : 'rgba(235,230,220,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {isSelected && (
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: providerInfo?.color || 'var(--wa-gold)',
                  }} />
                )}
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: '8px',
                background: providerInfo?.bgColor || 'rgba(201,168,76,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: providerInfo?.color || 'var(--wa-gold)',
              }}>
                {providerInfo?.icon || <Cpu size={16} />}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{
                  fontSize: '0.8rem',
                  color: isSelected ? 'var(--wa-light)' : 'rgba(235,230,220,0.5)',
                  fontWeight: isSelected ? 600 : 400,
                }}>
                  {opt.name}
                </span>
                {isDisabled && opt.disabledReason && (
                  <p style={{ fontSize: '0.6rem', color: 'rgba(239,68,68,0.7)', marginTop: '0.15rem' }}>
                    {opt.disabledReason}
                  </p>
                )}
              </div>
              {isSelected && (
                <CheckCircle2 size={16} style={{ color: providerInfo?.color || 'var(--wa-gold)' }} />
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
};

// ── Main AI Settings Panel ────────────────────────────────────────────────

export const AISettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<string, { status: string; message: string }>>({});

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const s = await getAISettings();
      setSettings(s);
    } catch (err) {
      showToast('error', 'Failed to load AI settings');
    }
    setLoading(false);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveAISettings(settings);
      showToast('success', '✅ AI settings saved successfully!');
    } catch (err) {
      showToast('error', '❌ Failed to save settings. Please try again.');
    }
    setSaving(false);
  };

  const handleTestKey = async (providerId: string) => {
    if (!settings) return;
    const key =
      providerId === 'gemini' ? settings.geminiKey :
      providerId === 'deepseek' ? settings.deepseekKey :
      settings.chatgptKey;

    if (!key) return;

    setTestStatuses(prev => ({ ...prev, [providerId]: { status: 'testing', message: '' } }));

    try {
      let success = false;
      let message = '';

      if (providerId === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "connected" in one word.' }] }],
            generationConfig: {
              maxOutputTokens: 100,
            },
          }),
        });
        success = response.ok;
        message = success ? 'Gemini API key is valid!' : `Error: ${response.status}`;
      } else if (providerId === 'deepseek') {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
            max_tokens: 10,
          }),
        });
        success = response.ok;
        message = success ? 'DeepSeek API key is valid!' : `Error: ${response.status}`;
      } else if (providerId === 'chatgpt') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
            max_tokens: 10,
          }),
        });
        success = response.ok;
        message = success ? 'OpenAI API key is valid!' : `Error: ${response.status}`;
      }

      setTestStatuses(prev => ({
        ...prev,
        [providerId]: { status: success ? 'success' : 'error', message },
      }));

      // Reset after 5s
      setTimeout(() => {
        setTestStatuses(prev => ({ ...prev, [providerId]: { status: 'idle', message: '' } }));
      }, 5000);
    } catch (err) {
      setTestStatuses(prev => ({
        ...prev,
        [providerId]: { status: 'error', message: err instanceof Error ? err.message : 'Connection failed' },
      }));
    }
  };

  const updateKey = (provider: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      ...(provider === 'gemini' && { geminiKey: value }),
      ...(provider === 'deepseek' && { deepseekKey: value }),
      ...(provider === 'chatgpt' && { chatgptKey: value }),
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem' }}>
        <Loader2 size={24} style={{ color: 'var(--wa-gold)', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'rgba(235,230,220,0.5)', fontSize: '0.9rem' }}>Loading AI settings...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(235,230,220,0.4)' }}>
        <XCircle size={32} style={{ marginBottom: '1rem', color: 'rgba(239,68,68,0.5)' }} />
        <p>Failed to load AI settings. Please refresh.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--wa-gold)',
          }}>
            <Settings size={24} />
          </div>
          <div>
            <h2 className="font-cinzel" style={{ fontSize: '1.1rem', color: 'var(--wa-light)', fontWeight: 600 }}>
              AI Provider Configuration
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)' }}>
              Manage API keys and select providers for each AI feature
            </p>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>
          <Key size={18} /> API Keys
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {PROVIDERS.map((p) => (
            <APIKeyCard
              key={p.id}
              provider={p}
              value={
                p.id === 'gemini' ? settings.geminiKey :
                p.id === 'deepseek' ? settings.deepseekKey :
                settings.chatgptKey
              }
              onChange={(val) => updateKey(p.id, val)}
              onTest={() => handleTestKey(p.id)}
              testStatus={(testStatuses[p.id]?.status || 'idle') as any}
              testMessage={testStatuses[p.id]?.message}
            />
          ))}
        </div>
      </div>

      {/* Provider Selection Section */}
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>
          <Cpu size={18} /> Provider Assignment
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.35)', marginBottom: '1.25rem', marginTop: '-0.5rem' }}>
          Choose which AI provider to use for each feature
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Photo Analysis Provider */}
          <ProviderSelector
            label="Photo Analysis"
            icon={<Camera size={18} />}
            description="Analyze uploaded photos to auto-detect title, category, animal name, and tags"
            value={settings.photoAnalysisProvider}
            onChange={(val) => setSettings({ ...settings, photoAnalysisProvider: val as 'gemini' | 'chatgpt' })}
            options={[
              { id: 'gemini', name: 'Google Gemini' },
              { id: 'chatgpt', name: 'ChatGPT (OpenAI)' },
              { id: 'deepseek', name: 'DeepSeek', disabled: true, disabledReason: 'Does not support image/vision analysis' },
            ]}
          />

          {/* Story Generation Provider */}
          <ProviderSelector
            label="Story Generation"
            icon={<Sparkles size={18} />}
            description="Generate compelling photography stories from photo data and Wikipedia info"
            value={settings.storyProvider}
            onChange={(val) => setSettings({ ...settings, storyProvider: val as 'gemini' | 'deepseek' | 'chatgpt' })}
            options={[
              { id: 'gemini', name: 'Google Gemini' },
              { id: 'deepseek', name: 'DeepSeek' },
              { id: 'chatgpt', name: 'ChatGPT (OpenAI)' },
            ]}
          />

          {/* Chat Provider */}
          <ProviderSelector
            label="Chat Assistant"
            icon={<MessageSquare size={18} />}
            description="Power the wildlife chat assistant that helps visitors explore the gallery"
            value={settings.chatProvider}
            onChange={(val) => setSettings({ ...settings, chatProvider: val as 'gemini' | 'deepseek' | 'chatgpt' })}
            options={[
              { id: 'gemini', name: 'Google Gemini' },
              { id: 'deepseek', name: 'DeepSeek' },
              { id: 'chatgpt', name: 'ChatGPT (OpenAI)' },
            ]}
          />
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'rgba(201,168,76,0.05)',
        border: '1px solid rgba(201,168,76,0.15)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}>
        <AlertTriangle size={18} style={{ color: 'var(--wa-gold)', marginTop: '0.1rem', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--wa-gold)', fontWeight: 600, marginBottom: '0.3rem' }}>Important Notes</p>
          <ul style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.5)', lineHeight: 1.6, paddingLeft: '1rem', margin: 0 }}>
            <li>API keys are stored securely in Firebase Firestore</li>
            <li>DeepSeek does <strong>not</strong> support image/vision analysis — use Gemini or ChatGPT for photo analysis</li>
            <li>Changes take effect immediately after saving</li>
            <li>Use the "Test Key" button to verify each key before saving</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button
          onClick={loadSettings}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'rgba(235,230,220,0.6)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={16} /> Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.65rem 1.5rem',
            background: saving
              ? 'rgba(201,168,76,0.15)'
              : 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.1))',
            border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: '10px',
            color: 'var(--wa-gold)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'all 0.3s',
            boxShadow: '0 2px 12px rgba(201,168,76,0.1)',
          }}
          onMouseOver={(e) => { if (!saving) e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(201,168,76,0.1)'; }}
        >
          {saving ? (
            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
          ) : (
            <><Save size={16} /> Save Settings</>
          )}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          padding: '0.75rem 1.5rem',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '10px',
          color: toast.type === 'success' ? '#9fcb8f' : '#f87171',
          fontSize: '0.85rem', fontWeight: 500,
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
};
