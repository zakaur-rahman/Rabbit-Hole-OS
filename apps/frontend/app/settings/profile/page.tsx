'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page - profile is now accessed via modal
    router.replace('/settings');
  }, [router]);

  return null;
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCurrentUser();
      setUser(data);
    } catch (err) {
      console.error('Failed to load user:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      // If unauthorized, redirect to sign-in
      if (err instanceof Error && err.message.includes('401')) {
        await logout();
        router.push('/sign-in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <User size={24} className="text-green-400" />
            <h1 className="text-2xl font-bold text-white">Profile</h1>
          </div>
          <p className="text-neutral-400 text-sm">
            Your account information and preferences.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Profile Content */}
        {isLoading ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 animate-pulse">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-neutral-800" />
              <div className="flex-1">
                <div className="h-6 bg-neutral-800 rounded w-48 mb-3" />
                <div className="h-4 bg-neutral-800 rounded w-64" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-neutral-800 rounded w-full" />
              <div className="h-4 bg-neutral-800 rounded w-3/4" />
            </div>
          </div>
        ) : user ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8">
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
                <h2 className="text-2xl font-bold text-white mb-1">
                  {user.name || 'User'}
                </h2>
                <p className="text-neutral-400">{user.email}</p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
              <div className="border-t border-neutral-800 pt-6">
                <h3 className="text-sm font-medium text-neutral-400 mb-4">Account Information</h3>
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
              <div className="mt-6 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-neutral-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white mb-1">About Your Account</h4>
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
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
            <User size={48} className="text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Profile Found</h3>
            <p className="text-neutral-400 text-sm">
              Unable to load your profile information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
