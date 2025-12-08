import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Alert, Skeleton } from '@mui/material';

const API_URL = 'http://127.0.0.1:8000/api'; // Updated API URL

interface DashboardStats {
  lowStock: number;
  pendingApprovals: number;
  totalItems: number;
}

interface GlobalDashboardStatsProps {
  token: string;
}

function GlobalDashboardStats({ token }: GlobalDashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || 'Failed to fetch dashboard stats');
        }
        setStats(await res.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) return (
    <Card sx={{ minWidth: 275, mt: 3 }}>
      <CardContent>
        <Skeleton variant="text" width="60%" height={30} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={20} />
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="90%" height={20} />
      </CardContent>
    </Card>
  );
  if (error) return (
    <Alert severity="error" sx={{ mt: 3 }}>
      Erreur: {error}
    </Alert>
  );
  if (!stats) return null;

  return (
    <Card sx={{ minWidth: 275, mt: 3 }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          Statistiques Globales
        </Typography>
        <Typography variant="body1">
          Articles en faible stock: <strong>{stats.lowStock}</strong>
        </Typography>
        <Typography variant="body1">
          Demandes en attente d'approbation: <strong>{stats.pendingApprovals}</strong>
        </Typography>
        <Typography variant="body1">
          Total des articles en stock: <strong>{stats.totalItems}</strong>
        </Typography>
      </CardContent>
    </Card>
  );
}

export default GlobalDashboardStats;
