'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminDashboard from '@/components/AdminDashboard';
import MagasinierDashboard from '@/components/MagasinierDashboard';
import ChefServiceDashboard from '@/components/ChefServiceDashboard';
import DAFDashboard from '@/components/DAFDashboard';
import SuperObservateurDashboard from '@/components/SuperObservateurDashboard'; // New import
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { UserFullResponse, UserRole } from '@/types/api'; // Add UserFullResponse and UserRole import

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth(); // Use useAuth hook, get loading from context

  useEffect(() => {
    if (!loading && !user) { // If auth context is done loading and no user is found
      router.push('/');
    }
  }, [user, loading, router]); // React to user and loading from context

  if (loading) { // Use loading from context
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !token) {
    // This case should ideally be handled by AuthProvider redirecting to login
    // but as a fallback, we can show an error or redirect here too.
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6" color="error">Accès non autorisé ou session expirée.</Typography>
      </Box>
    );
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return <AdminDashboard />;
    case UserRole.MAGASINIER:
      return <MagasinierDashboard />;
    case UserRole.CHEF_SERVICE:
      return <ChefServiceDashboard />;
    case UserRole.DAF:
      return <DAFDashboard />;
    case UserRole.SUPER_OBSERVATEUR:
      return <SuperObservateurDashboard />;
    default:
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography variant="h6" color="error">Rôle utilisateur inconnu.</Typography>
        </Box>
      );
  }
}
