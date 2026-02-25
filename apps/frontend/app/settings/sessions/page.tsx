'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page - sessions are now accessed via modal
    router.replace('/settings');
  }, [router]);

  return null;
}
