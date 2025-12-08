// src/app/dashboard/reports/stock-valuation/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useReportApi } from '@/api/reports';
import { StockValuationByCategory } from '@/types/report';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import StockValuationView from '@/components/reports/StockValuationView';

export default function StockValuationPage() {
    const { getStockValuationByCategory } = useReportApi();
    const [data, setData] = useState<StockValuationByCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Protected route for DAF and ADMIN
        if (user && user.role !== 'DAF' && user.role !== 'ADMIN') {
            router.push('/dashboard');
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                const reportData = await getStockValuationByCategory();
                setData(reportData);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Une erreur est survenue lors du chargement du rapport.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [getStockValuationByCategory, user, router]);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Rapport de Valorisation du Stock
            </Typography>
            
            {loading && <CircularProgress />}
            
            {error && <Alert severity="error">{error}</Alert>}
            
            {!loading && !error && (
                <StockValuationView data={data} />
            )}
        </Box>
    );
}
