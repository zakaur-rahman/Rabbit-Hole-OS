'use client';

import React, { useEffect, useState } from 'react';
import { User, Mail, Calendar, AlertCircle, X } from 'lucide-react';
import { getCurrentUser, User as UserType } from '@/lib/auth/api';
import { logout } from '@/lib/auth/logout';
import { useRouter } from 'next/navigation';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadUser();
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

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCurrentUser();
      setUser(data);
    } catch (err) {
      console.error('Failed to load user:', err);
      let errorMessage = 'Failed to load profile';
      
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
          className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <User size={24} className="text-green-400" />
              <h2 className="text-xl font-bold text-white">Profile</h2>
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

            {/* Profile Content */}
            {isLoading ? (
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8 animate-pulse">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-24 h-24 rounded-full bg-neutral-700" />
                  <div className="flex-1">
                    <div className="h-6 bg-neutral-700 rounded w-48 mb-3" />
                    <div className="h-4 bg-neutral-700 rounded w-64" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-neutral-700 rounded w-full" />
                  <div className="h-4 bg-neutral-700 rounded w-3/4" />
                </div>
              </div>
            ) : user ? (
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8">
                {/* Avatar and Name */}
                <div className="flex items-center gap-6 mb-8">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || user.email}
                      className="w-24 h-24 rounded-full"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <User size={40} className="text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {user.name || 'User'}
                    </h3>
                    <p className="text-neutral-400">{user.email}</p>
                  </div>
                </div>

                {/* Profile Details */}
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

                  {/* Info Box */}
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
          </div>
        </div>
      </div>
    </>
  );
}
