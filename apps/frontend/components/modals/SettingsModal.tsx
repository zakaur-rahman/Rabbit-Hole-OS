'use client';

import React, { useState, useEffect } from 'react';
import {
  X, User, Shield, Settings as SettingsIcon, Mail, Calendar, AlertCircle,
  Trash2, Monitor, Smartphone, Tablet, CheckCircle2,
  Box, FileText, Globe, ExternalLink,
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SettingsIcon size={20} className="text-green-400" />
              <h2 className="text-lg font-semibold text-white">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-80 bg-neutral-950 border-r border-neutral-800 overflow-y-auto shrink-0 flex flex-col">
              {/* User Info or Sign In Prompt */}
              <div className="p-4 border-b border-neutral-800">
                {isLoadingUser && isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 bg-neutral-800 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-neutral-800 rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ) : isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name || user.email}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-sm">
                          {getUserInitials()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{user.email}</p>
                        <p className="text-xs text-neutral-400">Free Plan</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                      <User size={20} className="text-neutral-500" />
                    </div>
                    <div className="flex-1 w-full text-center">
                      <p className="text-sm text-neutral-400 mb-2">Sign in to access your account</p>
                      <button
                        onClick={() => {
                          onClose();
                          handleSignIn();
                        }}
                        className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <User size={16} />
                        <span>Sign In</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Categories */}
              <div className="flex-1 overflow-y-auto p-4">
                {settingsSections.map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    {section.title && (
                      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 px-2">
                        {section.title}
                      </h3>
                    )}
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isSelected = selectedItem === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedItem(item.id)}
                            className={`w-full px-3 py-2.5 rounded-lg text-left transition-all flex items-center gap-3 group ${isSelected
                              ? 'bg-green-500/10 text-green-400'
                              : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                              }`}
                          >
                            <Icon
                              size={18}
                              className={`shrink-0 ${isSelected ? 'text-green-400' : 'text-neutral-400 group-hover:text-neutral-300'
                                }`}
                            />
                            <span className="text-sm font-medium flex-1">{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Logout Button - Only show when logged in */}
              {isAuthenticated && (
                <div className="p-4 border-t border-neutral-800">
                  <button
                    onClick={async () => {
                      await logout();
                      onClose();
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-left transition-all flex items-center gap-3 text-red-400 hover:bg-neutral-800 hover:text-red-300 group"
                  >
                    <LogOut
                      size={18}
                      className="text-red-400 group-hover:text-red-300"
                    />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Content Pane */}
            <div className="flex-1 overflow-y-auto bg-neutral-900">
              {selectedItemData ? (
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-white mb-8">{selectedItemData.title}</h3>

                  {/* General Settings */}
                  {selectedItem === 'general' && (
                    <div className="space-y-8">
                      {/* Account Management */}
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Account Management</h4>
                        <div className="space-y-4">
                          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-white mb-1">Manage Account</h5>
                              <p className="text-xs text-neutral-400">Manage your account and billing</p>
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
                              className="px-4 py-2 text-sm text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <span>Open</span>
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Preferences */}
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Preferences</h4>
                        <div className="space-y-4">
                          {/* Sync layouts toggle */}
                          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-white mb-1">Sync layouts across windows</h5>
                              <p className="text-xs text-neutral-400">When enabled, all windows share the same layout</p>
                            </div>
                            <button
                              onClick={() => setSyncLayouts(!syncLayouts)}
                              className={`relative w-11 h-6 rounded-full transition-colors ${syncLayouts ? 'bg-green-500' : 'bg-neutral-700'
                                }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${syncLayouts ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                              />
                            </button>
                          </div>

                          {/* Editor Settings */}
                          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-white mb-1">Editor Settings</h5>
                              <p className="text-xs text-neutral-400">Configure font, formatting, minimap and more</p>
                            </div>
                            <button className="px-4 py-2 text-sm text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors">
                              Open
                            </button>
                          </div>

                          {/* Keyboard Shortcuts */}
                          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-white mb-1">Keyboard Shortcuts</h5>
                              <p className="text-xs text-neutral-400">Configure keyboard shortcuts</p>
                            </div>
                            <button className="px-4 py-2 text-sm text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors">
                              Open
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Profile Content */}
                  {selectedItem === 'profile' && (
                    <>
                      {isLoadingUser ? (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8 animate-pulse">
                          <div className="flex items-center gap-6 mb-8">
                            <div className="w-24 h-24 rounded-full bg-neutral-700" />
                            <div className="flex-1">
                              <div className="h-6 bg-neutral-700 rounded w-48 mb-3" />
                              <div className="h-4 bg-neutral-700 rounded w-64" />
                            </div>
                          </div>
                        </div>
                      ) : user ? (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8">
                          <div className="flex items-center gap-6 mb-8">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.name || user.email}
                                className="w-24 h-24 rounded-full"
                              />
                            ) : (
                              <div className="w-24 h-24 rounded-full bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-2xl">
                                {getUserInitials()}
                              </div>
                            )}
                            <div>
                              <h3 className="text-2xl font-bold text-white mb-1">
                                {user.name || 'User'}
                              </h3>
                              <p className="text-neutral-400">{user.email}</p>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="border-t border-neutral-700 pt-6">
                              <h4 className="text-sm font-medium text-neutral-400 mb-4">Account Information</h4>
                              <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                  <Mail size={20} className="text-neutral-500" />
                                  <div className="flex-1">
                                    <p className="text-xs text-neutral-400 mb-1">Email</p>
                                    <p className="text-sm text-white">{user.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <User size={20} className="text-neutral-500" />
                                  <div className="flex-1">
                                    <p className="text-xs text-neutral-400 mb-1">Display Name</p>
                                    <p className="text-sm text-white">{user.name || 'Not set'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Calendar size={20} className="text-neutral-500" />
                                  <div className="flex-1">
                                    <p className="text-xs text-neutral-400 mb-1">User ID</p>
                                    <p className="text-sm text-white font-mono">{user.id}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 p-4 bg-neutral-700/50 border border-neutral-600 rounded-lg">
                              <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="text-neutral-400 mt-0.5" />
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium text-white mb-1">About Your Account</h5>
                                  <p className="text-xs text-neutral-400">
                                    Your account is managed through Google OAuth. To update your name or profile picture,
                                    please update your Google account settings. Changes will be reflected here the next time you sign in.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center">
                          <User size={48} className="text-neutral-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-white mb-2">No Profile Found</h3>
                          <p className="text-neutral-400 text-sm">
                            Unable to load your profile information.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Models Content */}
                  {selectedItem === 'models' && (
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center">
                      <Box size={48} className="text-neutral-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">Models</h3>
                      <p className="text-neutral-400 text-sm">
                        Configure AI models and their settings.
                      </p>
                    </div>
                  )}

                  {/* Docs Content */}
                  {selectedItem === 'docs' && (
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center">
                      <FileText size={48} className="text-neutral-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">Documentation</h3>
                      <p className="text-neutral-400 text-sm mb-4">
                        Access documentation and help resources.
                      </p>
                      <button className="px-4 py-2 text-sm text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors flex items-center gap-2 mx-auto">
                        <span>Open Docs</span>
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  )}

                  {/* Sessions Content */}
                  {selectedItem === 'sessions' && (
                    <>
                      {sessionsError && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                          <AlertCircle size={20} className="text-red-400" />
                          <p className="text-red-400 text-sm">{sessionsError}</p>
                        </div>
                      )}

                      {sessions.length > 1 && (
                        <div className="mb-6 flex justify-end">
                          <button
                            onClick={handleRevokeAll}
                            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors"
                          >
                            Revoke All Other Sessions
                          </button>
                        </div>
                      )}

                      {isLoadingSessions ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 animate-pulse">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg bg-neutral-700" />
                                  <div>
                                    <div className="h-4 bg-neutral-700 rounded w-32 mb-2" />
                                    <div className="h-3 bg-neutral-700 rounded w-48" />
                                  </div>
                                </div>
                                <div className="h-8 bg-neutral-700 rounded w-24" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-12 text-center">
                          <Shield size={48} className="text-neutral-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-white mb-2">No Active Sessions</h3>
                          <p className="text-neutral-400 text-sm">
                            You don&apos;t have any active sessions at the moment.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {sessions.map((session) => (
                            <div
                              key={session.id}
                              className={`bg-neutral-800/50 border rounded-xl p-5 hover:bg-neutral-800 transition-all duration-200 ${session.is_current
                                ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_20px_-12px_rgba(34,197,94,0.3)]'
                                : 'border-neutral-700/50'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.is_current ? 'bg-green-500/10' : 'bg-neutral-700/50'
                                    }`}>
                                    {getDeviceIcon(session)}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                      <h3 className="text-sm font-semibold text-white truncate">
                                        {session.device_name || session.device_id || 'Unknown Device'}
                                      </h3>
                                      {session.is_current && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 rounded-full border border-green-500/20">
                                          Current
                                        </span>
                                      )}
                                      {session.app_version && (
                                        <span className="text-[10px] text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded">
                                          v{session.app_version}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-3 text-xs">
                                        {(session.city || session.country) ? (
                                          <div className="flex items-center gap-1 text-neutral-300">
                                            <MapPin size={12} className="text-neutral-500" />
                                            <span>
                                              {session.city ? `${session.city}, ` : ''}{session.country || 'Unknown Location'}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1 text-neutral-400 italic">
                                            <Globe size={12} className="text-neutral-500" />
                                            <span>Location not available</span>
                                          </div>
                                        )}
                                        {session.ip_address && (
                                          <span className="text-neutral-600 font-mono text-[10px]">
                                            {session.ip_address}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-4 text-[11px] text-neutral-500">
                                        <span>
                                          {session.is_current ? 'Active now' : `Last active ${formatDate(session.last_active_at)}`}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-neutral-700" />
                                        <span className={new Date(session.expires_at) < new Date() ? 'text-red-400' : ''}>
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
                                      className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 group relative"
                                      title="Revoke session"
                                    >
                                      {revokingSessionId === session.id ? (
                                        <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="px-3 py-1.5 text-xs font-medium text-green-400 flex items-center gap-2 bg-green-500/5 rounded-lg border border-green-500/10">
                                      <CheckCircle2 size={14} />
                                      <span>Active Now</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-6 p-4 bg-neutral-800 border border-neutral-700 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle size={20} className="text-neutral-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white mb-1">About Sessions</h4>
                            <p className="text-xs text-neutral-400">
                              Sessions allow you to stay signed in across devices. Each session expires after 30 days of inactivity.
                              Revoking a session will immediately sign you out from that device. Your current session cannot be revoked
                              from this page—use the Sign Out button in the user menu instead.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <SettingsIcon size={48} className="text-neutral-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Select a setting</h3>
                    <p className="text-neutral-400 text-sm">
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
