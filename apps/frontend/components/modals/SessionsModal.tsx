'use client';

import React from 'react';
import SettingsModal from './SettingsModal';

interface SessionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SessionsModal({ isOpen, onClose }: SessionsModalProps) {
    return <SettingsModal isOpen={isOpen} onClose={onClose} initialTab="sessions" />;
}
