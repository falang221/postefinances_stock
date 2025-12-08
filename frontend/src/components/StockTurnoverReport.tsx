'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  Button,
  Skeleton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import SearchIcon from '@mui/icons-material/Search';

import { useApiClient } from '@/api/client';

// --- Interface Definitions ---
interface StockTurnoverReportItem {
  productId: string;
  productName: string;
  productReference: string;
  currentStock: number;
  totalQuantityOut: number;
  turnoverRate: number;
}

interface StockTurnoverReportResponse {
  reportDate: string; // Assuming ISO string from backend
  items: StockTurnoverReportItem[];
}

function StockTurnoverReport() {
  const apiClient = useApiClient();
  const [reportData, setReportData] = useState<StockTurnoverReportResponse>({
  reportDate: dayjs().toISOString(), // Default current date
  items: [],
});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(1, 'month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());

  useEffect(() => {
    fetchReport();
  }, []); // Fetch on initial mount

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.format('YYYY-MM-DD'));
      if (endDate) params.append('end_date', endDate.format('YYYY-MM-DD'));

      const data = await apiClient.get<StockTurnoverReportResponse>(`/reports/stock-turnover?${params.toString()}`);
      setReportData(data);
    } catch (err) {
      console.error('Error fetching stock turnover report:', err);
      setError('Failed to fetch stock turnover report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
        <Typography variant="h5" component="h3" gutterBottom>
          Rapport de Rotation des Stocks
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <DatePicker
            label="Date de début"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="Date de fin"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small' } }}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={fetchReport}
            disabled={isLoading}
          >
            Rechercher
          </Button>
        </Box>

        {isLoading ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : reportData?.items?.length > 0 ? (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell>Référence</TableCell>
                  <TableCell align="right">Stock Actuel</TableCell>
                  <TableCell align="right">Qté Sortie (Période)</TableCell>
                  <TableCell align="right">Taux de Rotation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productReference}</TableCell>
                    <TableCell align="right">{item.currentStock}</TableCell>
                    <TableCell align="right">{item.totalQuantityOut}</TableCell>
                    <TableCell align="right">{item.turnoverRate.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography>Aucune donnée de rotation de stock disponible pour la période sélectionnée.</Typography>
        )}
      </Paper>
    </LocalizationProvider>
  );
}

export default StockTurnoverReport;
