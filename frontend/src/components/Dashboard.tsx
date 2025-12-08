'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { Box, CircularProgress, Typography } from '@mui/material';
import { UserFullResponse, UserRole } from '@/types/api'; // Import UserFullResponse and UserRole

import AdminDashboard from './AdminDashboard';
import ChefServiceDashboard from './ChefServiceDashboard';
import MagasinierDashboard from './MagasinierDashboard';
import DAFDashboard from './DAFDashboard';
import SuperObservateurDashboard from './SuperObservateurDashboard'; // Added SuperObservateurDashboard

// Define the structure of the decoded token payload
interface DecodedToken {
  userId: string;
  username: string;
  email: string;
  name: string;
  role: string; // From token it's a string, will be validated against UserRole
  department?: string;
  exp: number;
}

// Helper function to check if a string is a valid UserRole
const isUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserFullResponse | null>(null); // Use UserFullResponse
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/'); // Redirect to login if no token
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(storedToken);

      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        router.push('/');
        return;
      }

      // Validate the role from the token
      if (!isUserRole(decoded.role)) {
        console.error("Invalid user role in token:", decoded.role);
        localStorage.removeItem('token');
        router.push('/');
        return;
      }

      setUser({
        id: decoded.userId,
        username: decoded.username,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role as UserRole, // Cast after validation
        department: decoded.department || '',
        createdAt: new Date().toISOString(), // Placeholder, as createdAt is not in the token
      });
      setToken(storedToken);
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem('token');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !token) {
    // This case should ideally be handled by the initial redirect,
    // but as a fallback, if user/token somehow become null, redirect to login.
    router.push('/');
    return null;
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return <AdminDashboard />;
    case UserRole.CHEF_SERVICE:
      return <ChefServiceDashboard />;
    case UserRole.MAGASINIER:
      return <MagasinierDashboard />;
    case UserRole.DAF:
      return <DAFDashboard />;
    case UserRole.SUPER_OBSERVATEUR:
      return <SuperObservateurDashboard />;
    default:
      return <Typography>Rôle utilisateur non reconnu.</Typography>;
  }
}

export default Dashboard;