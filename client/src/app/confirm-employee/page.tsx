'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { employeesApi, API_URL } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

interface InvitedEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

function ConfirmEmployeeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [employee, setEmployee] = useState<InvitedEmployee | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(searchParams.get('token')));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(() => searchParams.get('token') ? '' : 'No confirmation token provided. Please check your invitation email.');
  const [success, setSuccess] = useState(false);

  const { setAuthSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    employeesApi.verifyInvite(token)
      .then((res) => {
        if (res.success) {
          setEmployee(res.employee);
        } else {
          setError(res.message || 'Invalid or expired confirmation link.');
        }
      })
      .catch(() => {
        setError('Failed to verify token with server. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await employeesApi.confirmInvite({ token, password });
      if (res.success) {
        setSuccess(true);
        if (res.token && res.user) {
          setAuthSession(res.token, res.user);
        }
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setError(res.message || 'Failed to confirm account.');
      }
    } catch (err: any) {
      setError(`Error connecting to backend server (${API_URL}): ${err?.message || 'Network connection failed'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#0c0e17] relative overflow-hidden">
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#1a1c28]/95 backdrop-blur-2xl border border-white/8 rounded-3xl p-8 shadow-2xl shadow-black/60">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-3 shadow-xl shadow-indigo-500/30">
              <span className="material-symbols-outlined text-white text-[28px]">mark_email_read</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Confirm Employee Account</h1>
            <p className="text-sm text-gray-500 mt-1">Activate your profile & set password</p>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Verifying invitation token...</p>
            </div>
          ) : error && !employee ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[28px]">error</span>
              </div>
              <h3 className="text-base font-bold text-white">Verification Error</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{error}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all mt-2"
              >
                Back to Sign In
              </Link>
            </div>
          ) : success ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
                <span className="material-symbols-outlined text-[32px]">check_circle</span>
              </div>
              <h2 className="text-xl font-bold text-white">Account Activated!</h2>
              <p className="text-sm text-gray-400">Welcome to SprintSync. Redirecting you to workspace...</p>
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mt-4" />
            </div>
          ) : (
            <>
              {/* Employee Preview Badge */}
              <div className="mb-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Invited Employee</p>
                <p className="text-base font-bold text-white">{employee?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{employee?.role} · {employee?.department}</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">{employee?.email || emailParam}</p>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Create Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Activating Account...
                    </>
                  ) : (
                    <>
                      <span>Confirm Email & Activate</span>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ConfirmEmployeePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0e17] flex items-center justify-center text-white text-sm">Loading...</div>}>
      <ConfirmEmployeeContent />
    </Suspense>
  );
}

