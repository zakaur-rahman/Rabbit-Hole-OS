'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Trash2, Monitor, Smartphone, Tablet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { getSessions, revokeSession, revokeAllSessions, Session } from '@/lib/auth/api';
import { logout } from '@/lib/auth/logout';
import { useRouter } from 'next/navigation';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionsModal({ isOpen, onClose }: SessionsModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    // Close on ESC key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      let errorMessage = 'Failed to load sessions';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // Handle network errors
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to backend server. Please ensure the backend is running.';
        }
      }
      
      setError(errorMessage);
      
      // If unauthorized, logout and close modal
      if (err instanceof Error && (errorMessage.includes('401') || errorMessage.includes('Not authenticated') || errorMessage.includes('Invalid or expired token'))) {
        await logout();
        onClose();
        router.push('/sign-in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId);
      await revokeSession(sessionId);
      await loadSessions();
      
      // If revoking current session, logout
      const currentSession = sessions.find(s => s.is_current && s.id === sessionId);
      if (currentSession) {
        await logout();
        onClose();
        router.push('/sign-in');
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

  const getDeviceIcon = (deviceId: string | null) => {
    if (!deviceId) return <Monitor size={18} className="text-neutral-400" />;
    
    const lower = deviceId.toLowerCase();
    if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) {
      return <Smartphone size={18} className="text-neutral-400" />;
    }
    if (lower.includes('tablet') || lower.includes('ipad')) {
      return <Tablet size={18} className="text-neutral-400" />;
    }
    return <Monitor size={18} className="text-neutral-400" />;
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

  if (!isOpen) return null;

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
          className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <Shield size={24} className="text-green-400" />
              <h2 className="text-xl font-bold text-white">Active Sessions</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                <AlertCircle size={20} className="text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
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

            {/* Sessions List */}
            {isLoading ? (
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
                  You don't have any active sessions at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`bg-neutral-800 border rounded-lg p-6 ${
                      session.is_current
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-neutral-700 flex items-center justify-center">
                          {getDeviceIcon(session.device_id)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium text-white">
                              {session.device_id || 'Unknown Device'}
                            </h3>
                            {session.is_current && (
                              <span className="px-2 py-0.5 text-xs font-medium text-green-400 bg-green-500/10 rounded">
                                Current Session
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-neutral-400">
                            <span>Created {formatDate(session.created_at)}</span>
                            <span>•</span>
                            <span>{formatExpiry(session.expires_at)}</span>
                          </div>
                        </div>
                      </div>
                      {!session.is_current && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingSessionId === session.id}
                          className="px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {revokingSessionId === session.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              <span>Revoking...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 size={16} />
                              <span>Revoke</span>
                            </>
                          )}
                        </button>
                      )}
                      {session.is_current && (
                        <div className="px-4 py-2 text-sm text-green-400 flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info Box */}
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
          </div>
        </div>
      </div>
    </>
  );
}
