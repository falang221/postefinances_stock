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
  Skeleton,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Stack,
  Pagination, // Added Pagination
  SelectChangeEvent, // Import SelectChangeEvent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { format } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

interface StockReportProduct {
  id: string;
  name: string;
  reference: string;
  unit: string;
  category: {
    id: string;
    name: string;
  };
}

interface StockReportItem {
  product: StockReportProduct;
  currentQuantity: number;
  minStock: number;
  location?: string;
  lastAdjustmentDate?: string; // ISO string
  lastReceiptDate?: string; // ISO string
}

interface StockReportResponse {
  reportDate: string; // ISO string
  items: StockReportItem[];
  totalItems: number; // Added totalItems
}

interface StockReportProps {
  token: string | null;
}

function StockReport({ token }: StockReportProps) {
  const [report, setReport] = useState<StockReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and Sort States
  const [filterProductName, setFilterProductName] = useState('');
  const [filterReference, setFilterReference] = useState('');
  const [filterCategoryName, setFilterCategoryName] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination States
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (token) {
      fetchStockReport();
    }
  }, [token, page, rowsPerPage]); // Re-fetch when token, page, or rowsPerPage change

  const fetchStockReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filterProductName) queryParams.append('product_name', filterProductName);
      if (filterReference) queryParams.append('reference', filterReference);
      if (filterCategoryName) queryParams.append('category_name', filterCategoryName);
      if (filterLowStock) queryParams.append('low_stock', 'true');
      if (sortBy) queryParams.append('sort_by', sortBy);
      if (sortOrder) queryParams.append('sort_order', sortOrder);
      
      // Add pagination parameters
      queryParams.append('skip', String((page - 1) * rowsPerPage));
      queryParams.append('limit', String(rowsPerPage));

      const url = `${API_URL}/products/report?${queryParams.toString()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to fetch stock report');
      }
      const data: StockReportResponse = await res.json();
      setReport(data);
      setTotalItems(data.totalItems); // Update totalItems from response
    } catch (err) {
      console.error('Error fetching stock report:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to trigger fetch with current filters (e.g., on button click)
  const handleApplyFilters = () => {
    setPage(1); // Reset to first page when filters are applied
    fetchStockReport();
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleRowsPerPageChange = (event: SelectChangeEvent<string>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1); // Reset to first page when rows per page changes
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={300} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!report || report.items.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Aucune donnée de rapport de stock disponible.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h5" component="h3" gutterBottom>
        Rapport de Stock au {format(new Date(report.reportDate), 'dd/MM/yyyy HH:mm')}
      </Typography>

      {/* Filter and Sort Controls */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Filtres et Tri</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <TextField
            label="Nom du Produit"
            variant="outlined"
            size="small"
            value={filterProductName}
            onChange={(e) => setFilterProductName(e.target.value)}
          />
          <TextField
            label="Référence"
            variant="outlined"
            size="small"
            value={filterReference}
            onChange={(e) => setFilterReference(e.target.value)}
          />
          <TextField
            label="Nom de Catégorie"
            variant="outlined"
            size="small"
            value={filterCategoryName}
            onChange={(e) => setFilterCategoryName(e.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={filterLowStock}
                onChange={(e) => setFilterLowStock(e.target.checked)}
              />
            }
            label="Articles en Stock Faible"
          />
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel>Trier par</InputLabel>
            <Select
              value={sortBy}
              label="Trier par"
              onChange={(e) => setSortBy(e.target.value as string)}
            >
              <MenuItem value="name">Nom du Produit</MenuItem>
              <MenuItem value="quantity">Quantité Actuelle</MenuItem>
              <MenuItem value="last_adjustment">Dernier Ajustement</MenuItem>
              <MenuItem value="last_receipt">Dernière Réception</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel>Ordre</InputLabel>
            <Select
              value={sortOrder}
              label="Ordre"
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <MenuItem value="asc">Ascendant</MenuItem>
              <MenuItem value="desc">Descendant</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleApplyFilters}
          >
            Appliquer les Filtres
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produit</TableCell>
              <TableCell>Référence</TableCell>
              <TableCell>Catégorie</TableCell>
              <TableCell>Quantité Actuelle</TableCell>
              <TableCell>Stock Minimum</TableCell>
              <TableCell>Unité</TableCell>
              <TableCell>Emplacement</TableCell>
              <TableCell>Dernier Ajustement</TableCell>
              <TableCell>Dernière Réception</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.items.map((item) => (
              <TableRow key={item.product.id}>
                <TableCell>{item.product.name}</TableCell>
                <TableCell>{item.product.reference}</TableCell>
                <TableCell>{item.product.category.name}</TableCell>
                <TableCell>{item.currentQuantity}</TableCell>
                <TableCell>{item.minStock}</TableCell>
                <TableCell>{item.product.unit}</TableCell>
                <TableCell>{item.location || 'N/A'}</TableCell>
                <TableCell>
                  {item.lastAdjustmentDate ? format(new Date(item.lastAdjustmentDate), 'dd/MM/yyyy') : 'N/A'}
                </TableCell>
                <TableCell>
                  {item.lastReceiptDate ? format(new Date(item.lastReceiptDate), 'dd/MM/yyyy') : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={Math.ceil(totalItems / rowsPerPage)}
          page={page}
          onChange={handlePageChange}
          color="primary"
        />
        <FormControl sx={{ ml: 2 }} size="small">
          <InputLabel>Lignes par page</InputLabel>
          <Select
            value={rowsPerPage.toString()}
            onChange={handleRowsPerPageChange}
            label="Lignes par page"
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}

export default StockReport;
