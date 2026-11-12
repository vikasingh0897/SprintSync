'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';
import { notificationsApi } from '../lib/api';
import { getSocket } from '../lib/socket';
import { BackendStatusPill } from './BackendModal';

const NAV_LINKS = [
  { href: '/',          label: 'Dashboard', icon: 'dashboard'   },
  { href: '/board',     label: 'Board',     icon: 'view_kanban' },
  { href: '/employees', label: 'Employees', icon: 'group'       },
  { href: '/reports',   label: 'Reports',   icon: 'bar_chart'   },
  { href: '/settings',  label: 'Settings',  icon: 'settings'    },
];

interface NotificationItem {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt?: string;
  data?: any;
}

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toastAlert, setToastAlert] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load initial notifications
  useEffect(() => {
    if (user) {
      notificationsApi.getAll()
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setNotifications(res.data);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Real-time socket listener for live alerts
  useEffect(() => {
    const socket = getSocket();

    const handleNewNotif = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev]);
      setToastAlert(notif.title + ': ' + notif.message);
      setTimeout(() => setToastAlert(null), 5000);
    };

    const handleTaskAssigned = (data: any) => {
      const msg = `⚡ Task Assigned: ${data.task?.title} (${data.task?.priority} Priority)`;
      setToastAlert(msg);
      setTimeout(() => setToastAlert(null), 5000);
    };

    socket.on('notification:new', handleNewNotif);
    socket.on('task:assigned', handleTaskAssigned);

    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('task:assigned', handleTaskAssigned);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {}
  };

  const handleMarkSingleRead = async (id?: string) => {
    if (!id) return;
    setNotifications((prev) =>
      prev.map((n) => ((n._id === id || n.id === id) ? { ...n, isRead: true } : n))
    );
    try {
      await notificationsApi.markRead(id);
    } catch {}
  };

  return (
    <header
      className="w-full top-0 sticky z-[100] backdrop-blur-xl border-b transition-colors duration-200"
      style={{
        backgroundColor: 'var(--header-bg, rgba(12,14,23,0.85))',
        borderColor: 'var(--header-border, rgba(255,255,255,0.06))',
      }}
    >
      {/* Toast Alert Banner */}
      {toastAlert && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-[110] w-[calc(100vw-24px)] max-w-md bg-indigo-600/95 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-xl border border-indigo-400/30 shadow-xl shadow-indigo-500/20 flex items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] text-amber-300 animate-pulse shrink-0">notifications_active</span>
            <span className="truncate">{toastAlert}</span>
          </div>
          <button onClick={() => setToastAlert(null)} className="shrink-0 hover:opacity-75 p-0.5">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Accent hairline */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

      <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 w-full max-w-7xl mx-auto">
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 group-hover:scale-[1.03] transition-all">
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent select-none">
            SprintSync
          </span>
        </Link>

        {/* ── Desktop & Tablet Nav ── */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-3.5 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-[color:var(--nav-text,#9ca3af)] hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[17px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* ── User & Controls area ── */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <BackendStatusPill />
          {user ? (
            <>
              {/* Notification Bell (All screen sizes) */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    setIsOpen((v) => !v);
                    setIsProfileOpen(false);
                  }}
                  className="flex w-9 h-9 items-center justify-center rounded-xl text-[color:var(--nav-text,#9ca3af)] hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all relative"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-[var(--header-bg,#0c0e17)] animate-pulse" />
                  )}
                </button>

                {isOpen && (
                  <div className="fixed inset-x-3 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-3 sm:w-96 bg-[#1a1c28] border border-white/10 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden z-[150] animate-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.03]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                          <span className="material-symbols-outlined text-[28px] text-gray-600 block mb-1">notifications_off</span>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((notif, idx) => (
                          <div
                            key={notif._id || notif.id || idx}
                            onClick={() => handleMarkSingleRead(notif._id || notif.id)}
                            className={`p-3.5 hover:bg-white/5 transition-colors cursor-pointer flex gap-3 ${
                              !notif.isRead ? 'bg-indigo-500/5' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                              <span className="material-symbols-outlined text-[18px]">
                                {notif.type === 'task_assigned'
                                  ? 'assignment_turned_in'
                                  : notif.type === 'employee_confirmed'
                                  ? 'how_to_reg'
                                  : 'notifications'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{notif.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                              <span className="text-[10px] text-gray-500 mt-1 block">
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </span>
                            </div>
                            {!notif.isRead && (
                              <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 self-center" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Account Popover (Works on Mobile + Desktop) */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => {
                    setIsProfileOpen((v) => !v);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2.5 pl-1 pr-1 sm:pr-2 py-1 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left"
                  title="Account & Sign Out"
                >
                  <div className="hidden lg:block text-right">
                    <p
                      className="text-xs font-semibold leading-none"
                      style={{ color: 'var(--text-base, #f1f5f9)' }}
                    >
                      {user.name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 max-w-[140px] truncate">{user.email}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 shrink-0">
                    {user.name?.charAt(0).toUpperCase() ?? 'A'}
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2.5 w-60 bg-[#1a1c28] border border-white/10 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden z-[150] animate-in zoom-in-95 duration-150 p-2">
                    <div className="px-3 py-2.5 border-b border-white/5 mb-1.5">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[17px] text-indigo-400">settings</span>
                      Workspace Settings
                    </Link>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors mt-0.5"
                    >
                      <span className="material-symbols-outlined text-[17px]">logout</span>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium border border-transparent hover:border-white/10 transition-all"
                style={{ color: 'var(--nav-text, #d1d5db)' }}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
