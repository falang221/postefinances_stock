// src/components/reports/StockValuationView.tsx
'use client';

import React from 'react';
import { StockValuationByCategory } from '@/types/report';
import { 
    Paper, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Typography,
    Grid,
    Card,
    CardContent
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StockValuationViewProps {
    data: StockValuationByCategory[];
}

// Couleurs pour le graphique
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <Paper elevation={3} sx={{ padding: '10px' }}>
                <Typography variant="body1">{`${payload[0].name} : ${new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF' }).format(payload[0].value)}`}</Typography>
            </Paper>
        );
    }
    return null;
};

export default function StockValuationView({ data }: StockValuationViewProps) {
    const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);

    return (
        <Grid container spacing={3}>
            {/* Total Value Card */}
            <Grid item xs={12}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="text.secondary">
                            Valeur Totale du Stock
                        </Typography>
                        <Typography variant="h4" color="primary">
                            {new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF' }).format(totalValue)}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            {/* Pie Chart */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 400 }}>
                    <Typography variant="h6" gutterBottom>
                        Répartition par Catégorie
                    </Typography>
                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="totalValue"
                                    nameKey="categoryName"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Paper>
            </Grid>

            {/* Data Table */}
            <Grid item xs={12} md={6}>
                <TableContainer component={Paper}>
                    <Table aria-label="stock valuation table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Catégorie</TableCell>
                                <TableCell align="right">Valeur Totale</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((row) => (
                                <TableRow key={row.categoryName}>
                                    <TableCell component="th" scope="row">
                                        {row.categoryName}
                                    </TableCell>
                                    <TableCell align="right">
                                        {new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF' }).format(row.totalValue)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
        </Grid>
    );
}
