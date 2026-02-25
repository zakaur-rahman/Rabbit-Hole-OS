'use client';

import React from 'react';
import SettingsModal from './SettingsModal';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    return <SettingsModal isOpen={isOpen} onClose={onClose} initialTab="profile" />;
}
