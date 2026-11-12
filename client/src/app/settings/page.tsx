'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../lib/api';
import { resetSocket } from '../../lib/socket';

type Theme = 'dark' | 'light' | 'system';

const ACCENT_COLORS = [
  { name: 'Indigo',  value: 'indigo',  tw: 'bg-indigo-500'  },
  { name: 'Violet',  value: 'violet',  tw: 'bg-violet-500'  },
  { name: 'Pink',    value: 'pink',    tw: 'bg-pink-500'    },
  { name: 'Cyan',    value: 'cyan',    tw: 'bg-cyan-500'    },
  { name: 'Emerald', value: 'emerald', tw: 'bg-emerald-500' },
  { name: 'Amber',   value: 'amber',   tw: 'bg-amber-500'   },
];

const NOTIFICATION_SETTINGS = [
  { id: 'task_assigned', label: 'Task Assigned to Me',   description: 'Get notified when a task is assigned to you',       default: true  },
  { id: 'task_due',      label: 'Task Due Reminders',    description: 'Receive reminders before task deadlines',            default: true  },
  { id: 'mentions',      label: 'Mentions & Comments',   description: 'Notify when someone mentions you in a comment',     default: true  },
  { id: 'sprint_start',  label: 'Sprint Start/End',      description: 'Notify when a new sprint starts or ends',           default: false },
  { id: 'weekly_report', label: 'Weekly Summary',        description: 'Receive a weekly performance summary email',         default: true  },
  { id: 'team_updates',  label: 'Team Updates',          description: 'Notify on team member status changes',              default: false },
];

/** Apply a theme to the <html> element and save to localStorage */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  root.classList.remove('dark', 'light');
  root.classList.add(isDark ? 'dark' : 'light');

  // Swap key CSS variables so the whole page reflects the theme
  if (isDark) {
    root.style.setProperty('--bg-page',   '#0c0e17');
    root.style.setProperty('--bg-card',   '#1d1f29');
    root.style.setProperty('--text-base', '#f1f5f9');
    root.style.setProperty('--border',    'rgba(255,255,255,0.07)');
    document.body.style.backgroundColor  = '#0c0e17';
    document.body.style.color            = '#f1f5f9';
  } else {
    root.style.setProperty('--bg-page',   '#f1f5f9');
    root.style.setProperty('--bg-card',   '#ffffff');
    root.style.setProperty('--text-base', '#0f172a');
    root.style.setProperty('--border',    'rgba(0,0,0,0.08)');
    document.body.style.backgroundColor  = '#f1f5f9';
    document.body.style.color            = '#0f172a';
  }

  localStorage.setItem('ss_theme', theme);
}

export default function SettingsPage() {
  const { user, logout } = useAuth();

  // ── state ──────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [theme, setTheme]             = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('ss_theme') ?? 'dark') as Theme;
  });
  const [accentColor, setAccentColor] = useState(() => {
    if (typeof window === 'undefined') return 'indigo';
    let saved = localStorage.getItem('ss_accent') ?? 'indigo';
    if (saved.startsWith('#')) saved = 'indigo';
    return saved;
  });
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map(s => [s.id, s.default]))
  );
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

  // Backend URL configuration
  const [backendUrl, setBackendUrl] = useState('');
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendFeedback, setBackendFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // ── restore saved preferences on mount ────────────────────────────────
  useEffect(() => {
    const savedTheme  = (localStorage.getItem('ss_theme')  ?? 'dark') as Theme;
    let savedAccent = localStorage.getItem('ss_accent') ?? 'indigo';
    
    // Migrate old hex values to names if present
    if (savedAccent.startsWith('#')) savedAccent = 'indigo';
    
    applyTheme(savedTheme);
    
    // Apply accent class
    const root = document.documentElement;
    root.classList.remove('theme-indigo', 'theme-violet', 'theme-pink', 'theme-cyan', 'theme-emerald', 'theme-amber');
    root.classList.add(`theme-${savedAccent}`);

    // Load backend URL
    const customBackend = localStorage.getItem('ss_backend_url');
    setBackendUrl(customBackend || getApiUrl().replace(/\/api\/?$/, ''));
  }, []);

  const handleTestBackend = async () => {
    if (!backendUrl.trim()) return;
    setTestingBackend(true);
    setBackendFeedback(null);
    const clean = backendUrl.trim().replace(/\/api\/?$/, '');
    try {
      const res = await fetch(`${clean}/api/health`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        localStorage.setItem('ss_backend_url', clean);
        resetSocket();
        setBackendFeedback({ ok: true, message: `Connected to ${clean}! Reloading data...` });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setBackendFeedback({ ok: false, message: `Server returned HTTP ${res.status}. Check if sleeping on Render.` });
      }
    } catch (err: any) {
      setBackendFeedback({ ok: false, message: `Connection failed: ${err.message || 'Cannot reach server'}` });
    } finally {
      setTestingBackend(false);
    }
  };

  // ── theme switch ───────────────────────────────────────────────────────
  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };

  // ── accent color ──────────────────────────────────────────────────────
  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('ss_accent', color);
    const root = document.documentElement;
    root.classList.remove('theme-indigo', 'theme-violet', 'theme-pink', 'theme-cyan', 'theme-emerald', 'theme-amber');
    root.classList.add(`theme-${color}`);
  };

  // ── save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem('ss_displayName', displayName);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── helpers ────────────────────────────────────────────────────────────
  const themeOptions: { key: Theme; label: string; icon: string; preview: string }[] = [
    { key: 'dark',   label: 'Dark',   icon: 'dark_mode',        preview: 'bg-[#0c0e17]' },
    { key: 'light',  label: 'Light',  icon: 'light_mode',       preview: 'bg-[#f1f5f9]' },
    { key: 'system', label: 'System', icon: 'brightness_auto',  preview: 'bg-gradient-to-br from-[#0c0e17] to-[#f1f5f9]' },
  ];

  const card  = 'glass-card rounded-2xl p-5 sm:p-6 mb-5';
  const label = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2';
  const input = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all';

  return (
    <main className="min-h-screen bg-[#0c0e17] pb-24 md:pb-12 pt-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">

        {/* ── Page header ── */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 flex items-center gap-2 tracking-tight">
            <span className="material-symbols-outlined text-indigo-400">settings</span>
            Settings
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">Manage your account, appearance and notifications.</p>
        </div>

        {/* ── Profile ── */}
        <div className={card}>
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-[20px]">person</span>
            Profile
          </h3>

          <div className="flex items-center gap-4 sm:gap-5 mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/20 shrink-0">
              {displayName.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName || user?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={label}>Display Name</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input type="email" value={user?.email ?? ''} disabled
                className="w-full bg-white/3 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed" />
              <p className="text-xs text-gray-500 mt-1">Primary account email is managed by your workspace admin</p>
            </div>
          </div>
        </div>

        {/* ── Appearance ── */}
        <div className={card}>
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-violet-400 text-[20px]">palette</span>
            Appearance
          </h3>

          {/* Theme selector */}
          <div className="mb-6">
            <label className={label}>Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleThemeChange(t.key)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                    theme === t.key
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                      : 'border-white/5 bg-white/3 hover:border-white/15 hover:bg-white/5'
                  }`}
                >
                  {/* Mini preview swatch */}
                  <div className={`w-full h-10 rounded-xl ${t.preview} border border-white/10 flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-[20px] ${theme === t.key ? 'text-indigo-400' : 'text-gray-500'}`}>{t.icon}</span>
                  </div>
                  <span className={`text-xs font-semibold ${theme === t.key ? 'text-indigo-400' : 'text-gray-400'}`}>{t.label}</span>

                  {/* Active checkmark */}
                  {theme === t.key && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[14px]">check</span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Theme description */}
            <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {theme === 'dark'   && 'Dark mode is applied to the entire app.'}
              {theme === 'light'  && 'Light mode is applied to the entire app.'}
              {theme === 'system' && 'Follows your OS preference automatically.'}
            </p>
          </div>

          {/* Accent color */}
          <div>
            <label className={label}>Accent Color</label>
            <div className="flex gap-3 flex-wrap">
              {ACCENT_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => handleAccentChange(color.value)}
                  title={color.name}
                  className={`relative w-10 h-10 rounded-xl ${color.tw} transition-all hover:scale-110 active:scale-95 ${
                    accentColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1d1f29] scale-110' : ''
                  }`}
                >
                  {accentColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[20px] leading-none select-none">
                        check
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">Selected: {ACCENT_COLORS.find(c => c.value === accentColor)?.name}</p>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className={card}>
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-[20px]">notifications</span>
            Notifications
          </h3>
          <div className="divide-y divide-white/5">
            {NOTIFICATION_SETTINGS.map(setting => (
              <div key={setting.id} className="flex items-center justify-between py-3.5">
                <div className="flex-1 mr-6">
                  <p className="text-sm font-medium text-gray-200">{setting.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
                </div>
                {/* Toggle switch */}
                <button
                  role="switch"
                  aria-checked={notifications[setting.id]}
                  onClick={() => setNotifications(p => ({ ...p, [setting.id]: !p[setting.id] }))}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                    notifications[setting.id] ? 'bg-indigo-500' : 'bg-white/10'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${
                    notifications[setting.id] ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Team ── */}
        <div className={card}>
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">groups</span>
            Team Management
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-200">Invite Team Members</p>
              <p className="text-xs text-gray-500 mt-0.5">Send email confirmation invites via Brevo to add people</p>
            </div>
            <Link
              href="/employees"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-medium hover:bg-emerald-500/25 active:scale-95 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Invite
            </Link>
          </div>
        </div>

        {/* ── Backend Server Connection ── */}
        <div className={card}>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-[20px]">dns</span>
            Backend Connection
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Configure the live API & WebSocket server endpoint. If hosted on Render, paste your backend URL here.
          </p>

          <div className="space-y-3">
            <div>
              <label className={label}>Backend URL</label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={backendUrl}
                  onChange={e => setBackendUrl(e.target.value)}
                  placeholder="https://sprintsync-api-xxxx.onrender.com"
                  className={input}
                />
                <button
                  type="button"
                  onClick={handleTestBackend}
                  disabled={testingBackend}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5"
                >
                  {testingBackend ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                      Testing
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">link</span>
                      Test & Connect
                    </>
                  )}
                </button>
              </div>
            </div>

            {backendFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                  backendFeedback.ok
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm shrink-0">
                  {backendFeedback.ok ? 'check_circle' : 'error'}
                </span>
                <span className="break-words">{backendFeedback.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Danger zone ── */}
        <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5 sm:p-6 mb-8">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400 text-[20px]">warning</span>
            Danger Zone
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-200">Sign Out</p>
              <p className="text-xs text-gray-500 mt-0.5">End your current session</p>
            </div>
            <button
              onClick={logout}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/25 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign Out
            </button>
          </div>
        </div>

        {/* ── Save ── */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 ${
              saved
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {saving ? 'hourglass_empty' : saved ? 'check_circle' : 'save'}
            </span>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </main>
  );
}
