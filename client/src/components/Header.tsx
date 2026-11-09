'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';
import { notificationsApi } from '../lib/api';
import { getSocket } from '../lib/socket';

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
  const [toastAlert, setToastAlert] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
        borderColor:      'var(--header-border, rgba(255,255,255,0.06))',
      }}
    >
      {/* Toast Alert Banner */}
      {toastAlert && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-[110] bg-indigo-600/90 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-xl border border-indigo-400/30 shadow-xl shadow-indigo-500/20 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <span className="material-symbols-outlined text-[18px] text-amber-300 animate-pulse">notifications_active</span>
          <span>{toastAlert}</span>
          <button onClick={() => setToastAlert(null)} className="ml-2 hover:opacity-75">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Rainbow accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

      <div className="flex justify-between items-center px-6 py-3 w-full max-w-7xl mx-auto">
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent select-none">
            SprintSync
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        {user && (
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                      : 'text-[color:var(--nav-text,#9ca3af)] hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {icon}
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* ── User area ── */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Notification Popover */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="hidden md:flex w-9 h-9 items-center justify-center rounded-xl text-[color:var(--nav-text,#9ca3af)] hover:text-white hover:bg-white/5 transition-all relative"
                  title="Notifications"
                >
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-[var(--header-bg,#0c0e17)] animate-pulse" />
                  )}
                </button>

                {isOpen && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#1a1c28] border border-white/10 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden z-[150] animate-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/3">
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
                          Mark all as read
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

              {/* Name + avatar */}
              <div className="hidden md:block text-right">
                <p
                  className="text-sm font-semibold leading-none"
                  style={{ color: 'var(--text-base, #f1f5f9)' }}
                >
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0">
                {user.name?.charAt(0).toUpperCase() ?? 'A'}
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                title="Sign out"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden lg:inline text-xs font-medium">Sign out</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium border border-transparent hover:border-white/10 transition-all"
                style={{ color: 'var(--nav-text, #d1d5db)' }}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
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
