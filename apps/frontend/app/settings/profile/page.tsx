'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page - profile is now accessed via modal
    router.replace('/settings');
  }, [router]);

  return null;
}
