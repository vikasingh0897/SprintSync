'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email.trim(), password);
    if (!result.success) {
      setError(result.error ?? 'Invalid credentials.');
    }
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#0c0e17] relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1.2s' }} />
      <div className="absolute top-1/2 -left-10 w-56 h-56 bg-cyan-500/8 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2.4s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-[#181a26]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/30 ring-1 ring-white/10">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">SprintSync</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Email address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@admin.com"
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">lock</span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600 mt-5">
          © {new Date().getFullYear()} SprintSync. All rights reserved.
        </p>
      </div>
    </main>
  );
}
