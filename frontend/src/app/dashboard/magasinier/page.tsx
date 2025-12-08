'use client';

import MagasinierDashboard from '@/components/MagasinierDashboard';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { UserRole } from '@/types/api';

export default function MagasinierPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== UserRole.MAGASINIER) {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <MagasinierDashboard />;
}
