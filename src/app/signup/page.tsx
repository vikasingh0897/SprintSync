'use client';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#0c0e17] relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-[#1a1c28]/95 backdrop-blur-2xl border border-white/8 rounded-3xl p-8 shadow-2xl shadow-black/60 text-center">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/30 ring-1 ring-white/10">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">SprintSync</h1>
            <p className="text-sm text-gray-500 mt-1">Create your account</p>
          </div>

          {/* Server error notice */}
          <div className="mb-6 p-5 rounded-2xl bg-amber-500/8 border border-amber-500/25">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-amber-400 text-[26px]">construction</span>
            </div>
            <h2 className="text-base font-bold text-amber-300 mb-2">Registrations Temporarily Closed</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Due to a server issue, new account registrations are currently unavailable.
              We&apos;re working to resolve this as soon as possible.
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400 font-semibold">We&apos;ll be back soon</span>
            </div>
          </div>

          {/* Support */}
          <p className="text-xs text-gray-500 mb-6">
            If you have an existing account,{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              sign in here
            </Link>
            . For urgent access, contact your workspace admin.
          </p>

          {/* Back to login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Sign In
          </Link>
        </div>

        <p className="text-center text-xs text-gray-600 mt-5">
          © {new Date().getFullYear()} SprintSync. All rights reserved.
        </p>
      </div>
    </main>
  );
}
