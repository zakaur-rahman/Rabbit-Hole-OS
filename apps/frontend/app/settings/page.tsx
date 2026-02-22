'use client';

import React, { useState } from 'react';
import { User, Shield, Settings as SettingsIcon, ArrowRight } from 'lucide-react';
import SessionsModal from '@/components/modals/SessionsModal';
import ProfileModal from '@/components/modals/ProfileModal';

export default function SettingsPage() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  const settingsItems = [
    {
      title: 'Profile',
      description: 'View and manage your account information',
      icon: User,
      onClick: () => setShowProfileModal(true),
      color: 'text-blue-400',
    },
    {
      title: 'Active Sessions',
      description: 'Manage your active sessions across all devices',
      icon: Shield,
      onClick: () => setShowSessionsModal(true),
      color: 'text-green-400',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-xl">
              <SettingsIcon size={20} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          </div>
          <p className="text-neutral-400 text-sm">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Settings Items */}
        <div className="space-y-3">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={item.onClick}
                className="w-full bg-neutral-900/60 backdrop-blur-xl border border-neutral-800/60 rounded-2xl p-6 hover:border-neutral-700/80 hover:bg-neutral-800/40 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-neutral-800/80 flex items-center justify-center ${item.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-neutral-400">{item.description}</p>
                  </div>
                </div>
                <ArrowRight size={20} className="text-neutral-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <SessionsModal isOpen={showSessionsModal} onClose={() => setShowSessionsModal(false)} />
    </div>
  );
}
