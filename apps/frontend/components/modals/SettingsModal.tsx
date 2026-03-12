'use client';

import React, { useState, useEffect } from 'react';
import {
  X, User, Shield, Settings as SettingsIcon, Mail, Calendar, AlertCircle,
  Trash2, Monitor, Smartphone, Tablet, CheckCircle2,
  Box, FileText, Globe, ExternalLink, Download,
  LogOut, MapPin, Apple, Laptop as _Laptop
} from 'lucide-react';
import { getCurrentUser, getSessions, revokeSession, revokeAllSessions, User as UserType, Session } from '@/lib/auth/api';
import { logout } from '@/lib/auth/logout';
import { useRouter } from 'next/navigation';
import { isElectron } from '@/lib/auth/config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: string;
}



const settingsSections: SettingsSection[] = [
  {
    title: '',
    items: [
      {
        id: 'general',
        title: 'General',
        icon: SettingsIcon,
        color: 'text-neutral-400',
      },
      {
        id: 'models',
        title: 'Models',
        icon: Box,
        color: 'text-neutral-400',
      },
      {
        id: 'profile',
        title: 'Profile',
        icon: User,
        color: 'text-blue-400',
      },
      {
        id: 'sessions',
        title: 'Active Sessions',
        icon: Shield,
        color: 'text-green-400',
      },
      {
        id: 'updates',
        title: 'Updates',
        icon: Download,
        color: 'text-neutral-400',
      },
      {
        id: 'docs',
        title: 'Docs',
        icon: FileText,
        color: 'text-neutral-400',
      },
    ],
  },
];

export default function SettingsModal({ isOpen, onClose, initialTab = 'general' }: SettingsModalProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(initialTab);
  const router = useRouter();

  // Electron-aware sign-in: opens system browser instead of navigating locally
  const handleSignIn = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronApi = (window as any).electron;
    if (electronApi?.auth?.openLogin) {
      const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
      const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://cognode.tech';
      const loginUrl = `${webBaseUrl}/login?source=desktop&device_id=${deviceId}&redirect_uri=cognode://auth/callback`;
      electronApi.auth.openLogin(loginUrl);
      if (electronApi.auth.onDirectTokensReceived) {
        electronApi.auth.onDirectTokensReceived(({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
          localStorage.setItem('auth_token', access_token);
          if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
          window.dispatchEvent(new Event('auth-state-changed'));
        });
      }
      if (electronApi.auth.onDeepLinkAuth) {
        electronApi.auth.onDeepLinkAuth(async ({ code }: { code: string }) => {
          try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.cognode.tech';
            const response = await fetch(`${apiBaseUrl}/api/v1/oauth/desktop/exchange`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            if (!response.ok) throw new Error('Exchange failed');
            const data = await response.json();
            localStorage.setItem('auth_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            window.dispatchEvent(new Event('auth-state-changed'));
          } catch (err) { console.error('[Auth] Desktop exchange failed:', err); }
        });
      }
    } else {
      router.push('/sign-in?auto=false');
    }
  };

  // User state - initialize from cache if available
  const [user, setUser] = useState<UserType | null>(() => {
    if (typeof window !== 'undefined') {
      const cachedUser = localStorage.getItem('cached_user');
      if (cachedUser) {
        try {
          return JSON.parse(cachedUser);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('auth_token');
    }
    return false;
  });

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  // General settings state
  const [syncLayouts, setSyncLayouts] = useState(true);

  // Updates state
  const [appVersion, setAppVersion] = useState<string>('Unknown');
  const [updateChannel, setUpdateChannel] = useState<'stable' | 'beta' | 'nightly'>('stable');

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Synchronize internal selected tab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setSelectedItem(initialTab);
    }
  }, [isOpen, initialTab]);

  // Check authentication status and load user (only if not cached)
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        const authenticated = !!token;
        setIsAuthenticated(authenticated);

        if (authenticated) {
          // Only load user if we don't have cached data
          if (!user) {
            loadUser();
          }
        } else {
          // If not authenticated, clear cached user and set loading to false
          setUser(null);
          localStorage.removeItem('cached_user');
          setIsLoadingUser(false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Listen for auth state changes (login/logout) to update user cache
  useEffect(() => {
    const handleAuthChange = () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        const authenticated = !!token;
        setIsAuthenticated(authenticated);

        if (authenticated) {
          // Refresh user data when auth state changes (e.g., after login)
          loadUser();
        } else {
          // Clear user data on logout
          setUser(null);
          localStorage.removeItem('cached_user');
          setIsLoadingUser(false);
        }
      }
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
  }, []);

  // Sync update state from Electron
  useEffect(() => {
    if (isOpen && selectedItem === 'updates') {
      if (typeof window !== 'undefined' && window.electron?.updater) {
         window.electron.ipcRenderer.invoke('app:version').then((v) => setAppVersion(v as string));
         window.electron.updater.getState().then(state => {
            if (state.updateInfo?.channel) setUpdateChannel(state.updateInfo.channel);
         });
      }
    }
  }, [isOpen, selectedItem]);

  // Load data when selection changes
  useEffect(() => {
    if (isOpen) {
      if (selectedItem === 'sessions') {
        loadSessions();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedItem]);

  // Load user and cache it
  const loadUser = async () => {
    try {
      setIsLoadingUser(true);
      const data = await getCurrentUser();
      setUser(data);
      // Cache user data in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_user', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      // Clear cache on error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cached_user');
        setUser(null);
      }
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Load sessions
  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      setSessionsError(null);
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      let errorMessage = 'Failed to load sessions';

      if (err instanceof Error) {
        errorMessage = err.message;
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to backend server. Please ensure the backend is running.';
        }
      }

      setSessionsError(errorMessage);

      if (err instanceof Error && (errorMessage.includes('401') || errorMessage.includes('Not authenticated') || errorMessage.includes('Invalid or expired token'))) {
        await logout();
        onClose();
        handleSignIn();
      }
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId);
      await revokeSession(sessionId);
      await loadSessions();

      const currentSession = sessions.find(s => s.is_current && s.id === sessionId);
      if (currentSession) {
        await logout();
        onClose();
        handleSignIn();
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
      alert(err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? You will remain signed in on this device.')) {
      return;
    }

    try {
      await revokeAllSessions();
      await loadSessions();
    } catch (err) {
      console.error('Failed to revoke all sessions:', err);
      alert(err instanceof Error ? err.message : 'Failed to revoke all sessions');
    }
  };

  const getDeviceIcon = (session: Session) => {
    const platform = session.platform?.toLowerCase() || '';
    const deviceId = session.device_id?.toLowerCase() || '';

    if (platform.includes('mac') || platform.includes('apple')) return <Apple size={20} className="text-neutral-300" />;
    if (platform.includes('win')) return <_Laptop size={20} className="text-neutral-300" />;

    if (deviceId.includes('mobile') || deviceId.includes('iphone') || deviceId.includes('android')) {
      return <Smartphone size={20} className="text-neutral-300" />;
    }
    if (deviceId.includes('tablet') || deviceId.includes('ipad')) {
      return <Tablet size={20} className="text-neutral-300" />;
    }
    return <Monitor size={20} className="text-neutral-300" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatExpiry = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    if (diffDays < 7) return `Expires in ${diffDays} days`;

    return `Expires ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Get selected item
  const getSelectedItem = () => {
    for (const section of settingsSections) {
      const item = section.items.find((i) => i.id === selectedItem);
      if (item) return item;
    }
    return null;
  };

  const selectedItemData = getSelectedItem();


  if (!isOpen) return null;

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r2)] shadow-2xl w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center gap-2 font-semibold text-[14px] text-[var(--text)]">
              <span className="text-[16px]">⚙️</span>
              <span>Preferences</span>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 border-none bg-transparent text-[var(--sub)] hover:text-[var(--text)] hover:bg-[var(--raised)] rounded-[var(--r)] grid place-items-center transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-64 bg-[var(--bg)] border-r border-[var(--border)] overflow-y-auto shrink-0 flex flex-col">
              {/* User Info or Sign In Prompt */}
              <div className="p-4 border-b border-[var(--border)]">
                {isLoadingUser && isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--raised)] animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 bg-[var(--raised)] rounded animate-pulse mb-2" />
                      <div className="h-3 bg-[var(--raised)] rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ) : isAuthenticated && user ? (
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name || user.email}
                        className="w-9 h-9 rounded-[var(--r)]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-[var(--r)] bg-[var(--amber-bg)] text-[var(--amber)] flex items-center justify-center font-bold text-[12px]">
                        {getUserInitials()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[var(--text)] font-semibold truncate">{user.email}</p>
                      <p className="text-[11px] text-[var(--sub)] font-medium mt-0.5">Free Plan</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 py-2">
                    <p className="text-[12px] font-medium text-[var(--sub)] text-center">Sign in to sync your data</p>
                    <button
                      onClick={() => {
                        onClose();
                        handleSignIn();
                      }}
                      className="w-full px-3 py-2 bg-[var(--amber-bg)] hover:bg-[var(--amber-glow)] text-[var(--amber)] border border-[rgba(232,160,32,0.2)] text-[12px] font-medium rounded-[var(--r)] transition-colors flex items-center justify-center gap-2"
                    >
                      <User size={14} />
                      <span>Sign In</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Settings Categories */}
              <div className="flex-1 overflow-y-auto p-3">
                {settingsSections.map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    {section.title && (
                      <h3 className="text-[10px] font-bold text-[var(--sub)] uppercase tracking-wider mb-3 px-3">
                        {section.title}
                      </h3>
                    )}
                    <div className="space-y-[2px]">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isSelected = selectedItem === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedItem(item.id)}
                            className={`w-full px-3 py-[7px] rounded-[var(--r)] text-left transition-all flex items-center gap-3 group ${isSelected
                              ? 'bg-[var(--raised)] text-[var(--text)] font-semibold'
                              : 'text-[var(--sub)] font-medium hover:bg-[var(--raised)] hover:text-[var(--text)]'
                              }`}
                          >
                            <Icon
                              size={15}
                              className={`shrink-0 ${isSelected ? 'text-[var(--amber)]' : 'text-[var(--sub)] group-hover:text-[var(--text)]'
                                }`}
                            />
                            <span className="text-[12px] flex-1">{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Logout Button - Only show when logged in */}
              {isAuthenticated && (
                <div className="p-3 border-t border-[var(--border)]">
                  <button
                    onClick={async () => {
                      await logout();
                      onClose();
                    }}
                    className="w-full px-3 py-[7px] rounded-[var(--r)] text-left transition-all flex items-center gap-3 text-[var(--sub)] font-medium hover:bg-[rgba(224,85,85,0.1)] hover:text-[var(--red)] group"
                  >
                    <LogOut
                      size={15}
                      className="shrink-0"
                    />
                    <span className="text-[12px]">Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Content Pane */}
            <div className="flex-1 overflow-y-auto bg-[var(--bg)] p-[24px] flex flex-col gap-6 no-scrollbar">
              {selectedItemData ? (
                <>
                  {/* General Settings */}
                  {selectedItem === 'general' && (
                    <>
                      {/* Account Management */}
                      <div className="flex flex-col gap-3">
                        <div className="text-[12px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Account Management</div>
                        
                        <div className="flex items-center justify-between p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] hover:border-[var(--border2)] transition-colors">
                          <div className="flex-1">
                            <div className="text-[13px] font-semibold text-[var(--text)]">Manage Account</div>
                            <div className="text-[11px] font-medium text-[var(--sub)] mt-0.5">Manage your account and billing</div>
                          </div>
                          <button
                            onClick={() => {
                              const url = process.env.NEXT_PUBLIC_WEB_BASE_URL || 'https://cognode.tech';
                              const billingUrl = `${url}/dashboard`;
                              if (isElectron()) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const electron = (window as any).electron;
                                if (electron?.shell?.openExternal) {
                                  electron.shell.openExternal(billingUrl);
                                  return;
                                }
                              }
                              window.open(billingUrl, '_blank');
                            }}
                            className="px-3 py-1.5 text-[11px] font-semibold text-[var(--text)] bg-[var(--raised)] hover:bg-[var(--border)] border border-[var(--border)] rounded-[var(--r)] transition-colors flex items-center gap-2"
                          >
                            <span>Open</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Preferences */}
                      <div className="flex flex-col gap-3">
                        <div className="text-[12px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Preferences</div>
                        
                        <div className="flex flex-col border border-[var(--border)] rounded-[var(--r)] bg-[var(--surface)] overflow-hidden">
                          {/* Sync layouts toggle */}
                          <div className="flex items-center justify-between p-3 hover:bg-[var(--raised)] transition-colors border-b border-[var(--border)]">
                            <div className="flex-1">
                              <div className="text-[13px] font-semibold text-[var(--text)]">Sync layouts across windows</div>
                              <div className="text-[11px] font-medium text-[var(--sub)] mt-0.5">When enabled, all windows share the same layout</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={syncLayouts} onChange={() => setSyncLayouts(!syncLayouts)} />
                                <div className="w-8 h-4 bg-[var(--border2)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--amber)]"></div>
                            </label>
                          </div>

                          {/* Editor Settings */}
                          <div className="flex items-center justify-between p-3 hover:bg-[var(--raised)] transition-colors border-b border-[var(--border)]">
                            <div className="flex-1">
                              <div className="text-[13px] font-semibold text-[var(--text)]">Editor Settings</div>
                              <div className="text-[11px] font-medium text-[var(--sub)] mt-0.5">Configure font, formatting, minimap and more</div>
                            </div>
                            <button className="px-3 py-1 text-[11px] font-semibold text-[var(--text)] bg-[var(--raised)] hover:bg-[var(--border)] border border-[var(--border)] rounded-[var(--r)] transition-colors">
                              Open
                            </button>
                          </div>

                          {/* Keyboard Shortcuts */}
                          <div className="flex items-center justify-between p-3 hover:bg-[var(--raised)] transition-colors">
                            <div className="flex-1">
                              <div className="text-[13px] font-semibold text-[var(--text)]">Keyboard Shortcuts</div>
                              <div className="text-[11px] font-medium text-[var(--sub)] mt-0.5">Configure keyboard shortcuts</div>
                            </div>
                            <button className="px-3 py-1 text-[11px] font-semibold text-[var(--text)] bg-[var(--raised)] hover:bg-[var(--border)] border border-[var(--border)] rounded-[var(--r)] transition-colors">
                              Open
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Profile Content */}
                  {selectedItem === 'profile' && (
                    <>
                      {isLoadingUser ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] p-8 animate-pulse">
                          <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 rounded-full bg-[var(--raised)]" />
                            <div className="flex-1">
                              <div className="h-5 bg-[var(--raised)] rounded w-40 mb-3" />
                              <div className="h-3 bg-[var(--raised)] rounded w-56" />
                            </div>
                          </div>
                        </div>
                      ) : user ? (
                        <div className="flex flex-col gap-6">
                           <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] p-6">
                             <div className="flex items-center gap-6 mb-6">
                               {user.avatar_url ? (
                                 <img
                                   src={user.avatar_url}
                                   alt={user.name || user.email}
                                   className="w-20 h-20 rounded-full border-2 border-[var(--border2)]"
                                 />
                               ) : (
                                 <div className="w-20 h-20 rounded-full bg-[var(--amber-bg)] flex items-center justify-center text-[var(--amber)] font-bold text-2xl border border-[rgba(232,160,32,0.2)]">
                                   {getUserInitials()}
                                 </div>
                               )}
                               <div>
                                 <h3 className="text-[20px] font-bold text-[var(--text)] mb-1">
                                   {user.name || 'User'}
                                 </h3>
                                 <p className="text-[13px] font-medium text-[var(--sub)]">{user.email}</p>
                               </div>
                             </div>

                             <div className="border-t border-[var(--border)] pt-5">
                               <div className="text-[12px] font-bold text-[var(--text)] uppercase tracking-wider mb-4">Account Information</div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="flex items-start gap-3 p-3 bg-[var(--raised)] rounded-[var(--r)] border border-[var(--border)]">
                                   <Mail size={16} className="text-[var(--sub)] mt-0.5" />
                                   <div className="flex-1">
                                     <p className="text-[10px] font-bold text-[var(--sub)] uppercase tracking-wider mb-0.5">Email</p>
                                     <p className="text-[13px] font-semibold text-[var(--text)] truncate">{user.email}</p>
                                   </div>
                                 </div>
                                 
                                 <div className="flex items-start gap-3 p-3 bg-[var(--raised)] rounded-[var(--r)] border border-[var(--border)]">
                                   <User size={16} className="text-[var(--sub)] mt-0.5" />
                                   <div className="flex-1">
                                     <p className="text-[10px] font-bold text-[var(--sub)] uppercase tracking-wider mb-0.5">Display Name</p>
                                     <p className="text-[13px] font-semibold text-[var(--text)] truncate">{user.name || 'Not set'}</p>
                                   </div>
                                 </div>
                                 
                                 <div className="flex items-start gap-3 p-3 bg-[var(--raised)] rounded-[var(--r)] border border-[var(--border)] md:col-span-2">
                                   <Calendar size={16} className="text-[var(--sub)] mt-0.5" />
                                   <div className="flex-1 min-w-0">
                                     <p className="text-[10px] font-bold text-[var(--sub)] uppercase tracking-wider mb-0.5">User ID</p>
                                     <p className="text-[13px] font-mono text-[var(--text)] truncate">{user.id}</p>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>

                          <div className="p-4 bg-[var(--amber-bg)] border border-[rgba(232,160,32,0.2)] rounded-[var(--r)]">
                            <div className="flex items-start gap-3">
                              <AlertCircle size={18} className="text-[var(--amber)] mt-0.5" />
                              <div className="flex-1">
                                <h5 className="text-[13px] font-semibold text-[var(--amber)] mb-1">About Your Account</h5>
                                <p className="text-[11px] font-medium text-[rgba(232,160,32,0.8)] leading-relaxed">
                                  Your account is managed through Google OAuth. To update your name or profile picture,
                                  please update your Google account settings. Changes will be reflected here the next time you sign in.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r2)] p-12 text-center h-full flex flex-col justify-center items-center">
                          <User size={48} className="text-[var(--border2)] mx-auto mb-4" />
                          <h3 className="text-[16px] font-semibold text-[var(--text)] mb-2">No Profile Found</h3>
                          <p className="text-[var(--sub)] text-[12px] font-medium">
                            Unable to load your profile information.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Models Content */}
                  {selectedItem === 'models' && (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r2)] p-12 text-center h-full flex flex-col justify-center items-center">
                      <Box size={48} className="text-[var(--border2)] mx-auto mb-4" />
                      <h3 className="text-[16px] font-semibold text-[var(--text)] mb-2">Models</h3>
                      <p className="text-[var(--sub)] text-[12px] font-medium">
                        Configure AI models and their settings.
                      </p>
                    </div>
                  )}

                  {/* Docs Content */}
                  {selectedItem === 'docs' && (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r2)] p-12 text-center h-full flex flex-col justify-center items-center">
                      <FileText size={48} className="text-[var(--border2)] mx-auto mb-4" />
                      <h3 className="text-[16px] font-semibold text-[var(--text)] mb-2">Documentation</h3>
                      <p className="text-[var(--sub)] text-[12px] font-medium mb-4">
                        Access documentation and help resources.
                      </p>
                      <button className="px-4 py-2 text-[12px] font-medium text-[var(--text)] bg-[var(--raised)] hover:bg-[var(--border)] border border-[var(--border)] rounded-[var(--r)] transition-colors flex items-center gap-2 mx-auto">
                        <span>Open Docs</span>
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  )}

                  {/* Updates Content */}
                  {selectedItem === 'updates' && (
                    <div className="flex flex-col gap-6">
                       <div className="flex flex-col gap-3">
                         <div className="text-[12px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Software Update</div>
                         <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] p-5">
                            <div className="flex items-center gap-4 mb-5">
                               <div className="w-14 h-14 bg-[var(--raised)] border border-[var(--border)] rounded-[var(--r2)] flex items-center justify-center">
                                  <Download className="text-[var(--text)]" size={24} />
                               </div>
                               <div>
                                  <h5 className="text-[15px] font-bold text-[var(--text)]">Cognode Desktop</h5>
                                  <p className="text-[12px] font-medium text-[var(--sub)] mt-0.5">Version {appVersion}</p>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                               <button 
                                 onClick={() => {
                                   if (window.electron?.updater) {
                                      window.electron.updater.check();
                                   } else {
                                      alert("Updates are only supported in the Desktop application.");
                                   }
                                 }}
                                 className="px-4 py-2 text-[12px] font-semibold text-[var(--text)] bg-[var(--amber-bg)] hover:bg-[var(--amber-glow)] text-[var(--amber)] border border-[rgba(232,160,32,0.2)] rounded-[var(--r)] transition-colors"
                               >
                                 Check for Updates
                               </button>
                            </div>
                         </div>
                       </div>
                       
                       <div className="flex flex-col gap-3">
                          <div className="text-[12px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">Update Preferences</div>
                          <div className="flex flex-col border border-[var(--border)] rounded-[var(--r)] bg-[var(--surface)] overflow-hidden">
                            <div className="flex items-center justify-between p-4 hover:bg-[var(--raised)] transition-colors">
                              <div className="flex-1">
                                <div className="text-[13px] font-semibold text-[var(--text)]">Release Channel</div>
                                <div className="text-[11px] font-medium text-[var(--sub)] mt-0.5">Choose which updates to receive.</div>
                              </div>
                              <select
                                value={updateChannel}
                                onChange={(e) => {
                                   const val = e.target.value as 'stable' | 'beta' | 'nightly';
                                   setUpdateChannel(val);
                                   if (window.electron?.updater) {
                                      window.electron.updater.setChannel(val);
                                   }
                                }}
                                className="bg-[var(--raised)] text-[var(--text)] text-[12px] font-medium rounded-[var(--r)] px-3 py-1.5 border border-[var(--border2)] outline-none w-32 focus:border-[var(--amber)] transition-colors"
                              >
                                 <option value="stable">Stable</option>
                                 <option value="beta">Beta</option>
                                 <option value="nightly">Nightly</option>
                              </select>
                            </div>
                          </div>
                          <p className="text-[11px] font-medium text-[var(--sub)] mt-1 px-1">
                            Beta and Nightly channels may contain bugs and experimental features. Use them at your own risk.
                          </p>
                       </div>
                    </div>
                  )}

                  {/* Sessions Content */}
                  {selectedItem === 'sessions' && (
                    <div className="flex flex-col gap-6">
                      {sessionsError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[var(--r)] flex items-center gap-2">
                          <AlertCircle size={16} className="text-red-400" />
                          <p className="text-red-400 text-[12px] font-medium">{sessionsError}</p>
                        </div>
                      )}

                      {sessions.length > 1 && (
                        <div className="flex justify-end">
                          <button
                            onClick={handleRevokeAll}
                            className="px-4 py-2 text-[12px] font-semibold text-[rgba(224,85,85,0.9)] hover:text-[var(--red)] bg-[rgba(224,85,85,0.1)] hover:bg-[rgba(224,85,85,0.15)] border border-[rgba(224,85,85,0.2)] rounded-[var(--r)] transition-colors"
                          >
                            Revoke All Other Sessions
                          </button>
                        </div>
                      )}

                      {isLoadingSessions ? (
                        <div className="flex flex-col gap-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r)] p-4 animate-pulse">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-[var(--r)] bg-[var(--raised)]" />
                                  <div>
                                    <div className="h-3 bg-[var(--raised)] rounded w-24 mb-2" />
                                    <div className="h-2 bg-[var(--raised)] rounded w-32" />
                                  </div>
                                </div>
                                <div className="h-6 bg-[var(--raised)] rounded w-20" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r2)] p-12 text-center h-full flex flex-col justify-center items-center">
                          <Shield size={48} className="text-[var(--border2)] mx-auto mb-4" />
                          <h3 className="text-[16px] font-semibold text-[var(--text)] mb-2">No Active Sessions</h3>
                          <p className="text-[var(--sub)] text-[12px] font-medium">
                            You don&apos;t have any active sessions at the moment.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {sessions.map((session) => (
                            <div
                              key={session.id}
                              className={`bg-[var(--surface)] border rounded-[var(--r)] p-4 hover:bg-[var(--raised)] transition-all duration-200 ${session.is_current
                                ? 'border-[var(--green)] bg-[var(--green-bg)] shadow-[0_0_20px_-12px_rgba(76,175,125,0.3)]'
                                : 'border-[var(--border)]'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                  <div className={`w-10 h-10 rounded-[var(--r)] flex items-center justify-center border ${session.is_current ? 'bg-[rgba(76,175,125,0.1)] border-[rgba(76,175,125,0.2)] text-[var(--green)]' : 'bg-[var(--raised)] border-[var(--border)] text-[var(--sub)]'
                                    }`}>
                                    {getDeviceIcon(session)}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2 mb-1">
                                      <h3 className="text-[13px] font-semibold text-[var(--text)] truncate">
                                        {session.device_name || session.device_id || 'Unknown Device'}
                                      </h3>
                                      {session.is_current && (
                                        <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--green)] bg-[var(--green-bg)] rounded-[var(--r)] border border-[rgba(76,175,125,0.2)]">
                                          Current
                                        </span>
                                      )}
                                      {session.app_version && (
                                        <span className="text-[9px] font-medium text-[var(--sub)] bg-[var(--bg)] border border-[var(--border2)] px-1.5 py-0.5 rounded-[var(--r)]">
                                          v{session.app_version}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-3 text-[11px] font-medium">
                                        {(session.city || session.country) ? (
                                          <div className="flex items-center gap-1 text-[var(--sub)]">
                                            <MapPin size={12} className="text-[var(--border2)]" />
                                            <span>
                                              {session.city ? `${session.city}, ` : ''}{session.country || 'Unknown Location'}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1 text-[var(--muted)] italic">
                                            <Globe size={12} className="text-[var(--border2)]" />
                                            <span>Location not available</span>
                                          </div>
                                        )}
                                        {session.ip_address && (
                                          <span className="text-[var(--muted)] font-mono text-[9px]">
                                            {session.ip_address}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mt-1">
                                        <span>
                                          {session.is_current ? 'Active now' : `Last active ${formatDate(session.last_active_at)}`}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--border2)]" />
                                        <span className={new Date(session.expires_at) < new Date() ? 'text-[var(--red)]' : ''}>
                                          {formatExpiry(session.expires_at)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center self-center">
                                  {!session.is_current ? (
                                    <button
                                      onClick={() => handleRevokeSession(session.id)}
                                      disabled={revokingSessionId === session.id}
                                      className="p-2 text-[var(--muted)] hover:text-[var(--red)] hover:bg-[rgba(224,85,85,0.1)] rounded-[var(--r)] transition-all duration-200 group relative"
                                      title="Revoke session"
                                    >
                                      {revokingSessionId === session.id ? (
                                        <div className="w-4 h-4 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--green)] flex items-center gap-1.5 bg-[var(--green-bg)] rounded-[var(--r)] border border-[rgba(76,175,125,0.2)]">
                                      <CheckCircle2 size={12} />
                                      <span>Active Now</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r)]">
                        <div className="flex items-start gap-3">
                          <AlertCircle size={18} className="text-[var(--border2)] mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-[13px] font-semibold text-[var(--text)] mb-1">About Sessions</h4>
                            <p className="text-[11px] font-medium text-[var(--sub)] leading-relaxed">
                              Sessions allow you to stay signed in across devices. Each session expires after 30 days of inactivity.
                              Revoking a session will immediately sign you out from that device. Your current session cannot be revoked
                              from this page—use the Sign Out button in the user menu instead.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <SettingsIcon size={48} className="text-[var(--border2)] mx-auto mb-4" />
                    <h3 className="text-[16px] font-semibold text-[var(--text)] mb-2">Select a setting</h3>
                    <p className="text-[var(--sub)] text-[12px] font-medium">
                      Choose an option from the sidebar to view and manage your settings.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
