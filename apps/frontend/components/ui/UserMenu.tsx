'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';
import { logout } from '@/lib/auth/logout';
import { getCurrentUser, User as UserType } from '@/lib/auth/api';
import SessionsModal from '../modals/SessionsModal';
import ProfileModal from '../modals/ProfileModal';
import SettingsModal from '../modals/SettingsModal';

interface UserMenuProps {
  userAvatar?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

export default function UserMenu({ userAvatar, userName, userEmail }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Load user info
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadUser();
    }
  }, [isOpen]);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push('/sign-in');
  };

  const displayName = user?.name || userName || 'User';
  const displayEmail = user?.email || userEmail || '';
  const avatarUrl = user?.avatar_url || userAvatar;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        )}
        <ChevronDown size={14} className="text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-neutral-800">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-800 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-neutral-800 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-neutral-800 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{displayName}</p>
                  <p className="text-xs text-neutral-400 truncate">{displayEmail}</p>
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowProfileModal(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-3 transition-colors"
            >
              <User size={16} className="text-neutral-400" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowSessionsModal(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-3 transition-colors"
            >
              <Shield size={16} className="text-neutral-400" />
              <span>Active Sessions</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowSettingsModal(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-3 transition-colors"
            >
              <Settings size={16} className="text-neutral-400" />
              <span>Settings</span>
            </button>
            <div className="h-px bg-neutral-800 my-1" />
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-neutral-800 flex items-center gap-3 transition-colors"
            >
              <LogOut size={16} className="text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <SessionsModal isOpen={showSessionsModal} onClose={() => setShowSessionsModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </div>
  );
}
