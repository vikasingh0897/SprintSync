'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/api';
import { resetSocket } from '../lib/socket';

interface BackendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackendModal({ isOpen, onClose }: BackendModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = typeof window !== 'undefined' ? localStorage.getItem('ss_backend_url') : null;
      const initial = current || getApiUrl().replace(/\/api\/?$/, '');
      setUrlInput(initial);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setTesting(true);
    setStatusMessage({ type: 'info', text: 'Testing backend connection...' });

    const cleanBase = urlInput.trim().replace(/\/api\/?$/, '');
    const healthUrl = `${cleanBase}/api/health`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(healthUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('ss_backend_url', cleanBase);
        resetSocket();
        setStatusMessage({
          type: 'success',
          text: `Connected successfully! (Server: ${data.app || 'SprintSync Backend'})`,
        });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setStatusMessage({
          type: 'error',
          text: `Backend responded with HTTP ${res.status}. If sleeping on Render, please wait ~40 seconds and try again.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Cannot reach ${healthUrl}: ${err.message || 'Connection failed'}. Please verify URL or deploy backend service.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('ss_backend_url');
    resetSocket();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#161824] border border-white/10 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <span className="material-symbols-outlined">dns</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Backend Connection Setup</h3>
            <p className="text-xs text-slate-400">Connect SprintSync to your live Render backend</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3.5 mb-5 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">info</span>
            Where to find your Backend URL on Render:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
            <li>Go to your <a href="https://dashboard.render.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">Render Dashboard</a></li>
            <li>Look for your backend web service (e.g. <code className="text-white bg-black/40 px-1 py-0.5 rounded">sprintsync-api-xxxx</code>)</li>
            <li>Copy the public URL (e.g. <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">https://sprintsync-api-xxxx.onrender.com</code>)</li>
            <li>Paste it below and click <strong>Test & Save</strong>.</li>
          </ol>
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Backend Server URL:
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://sprintsync-api-xxxx.onrender.com"
              className="w-full bg-[#0c0e17] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Currently using:{' '}
              <span className="text-slate-400 break-all">{getApiUrl()}</span>
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              <span className="material-symbols-outlined text-sm mt-0.5">
                {statusMessage.type === 'success' ? 'check_circle' : statusMessage.type === 'error' ? 'error' : 'hourglass_top'}
              </span>
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Reset to default
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={testing}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
              >
                {testing ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    Testing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">link</span>
                    Test & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BackendStatusPill() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const base = getApiUrl().replace(/\/api\/?$/, '');
        const res = await fetch(`${base}/api/health`, {
          signal: AbortSignal.timeout(4000),
        });
        if (isMounted) setIsConnected(res.ok);
      } catch {
        if (isMounted) setIsConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        title="Click to check or configure Backend Connection"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
          isConnected === true
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
            : isConnected === false
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 animate-pulse'
            : 'bg-slate-800 text-slate-400 border-white/5'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected === true ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : isConnected === false ? 'bg-amber-400' : 'bg-slate-500'
          }`}
        />
        <span className="hidden sm:inline">
          {isConnected === true ? 'Backend Live' : isConnected === false ? 'Backend Offline' : 'Checking...'}
        </span>
      </button>

      <BackendModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
