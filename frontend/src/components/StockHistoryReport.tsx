"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TablePagination,
} from "@mui/material";
import {
  PaginatedTransactionHistoryResponse,
  TransactionHistoryResponse,
  UserFullResponse,
  ProductFullResponse,
  TransactionType,
  TransactionSource,
} from "@/types/api";

import { useApiClient } from '@/api/client'; // New import
import { useUserApi } from '@/api/users'; // New import
import { useProductApi } from '@/api/products'; // New import

// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"; // No longer needed here

interface StockHistoryReportProps {
  token: string | null;
}

const StockHistoryReport: React.FC<StockHistoryReportProps> = ({ token }) => {
  const apiClient = useApiClient(); // Initialize API client
  const userApi = useUserApi(); // Initialize User API
  const productApi = useProductApi(); // Initialize Product API

  const [reportData, setReportData] = useState<PaginatedTransactionHistoryResponse | null>(null);
  const [users, setUsers] = useState<UserFullResponse[]>([]);
  const [products, setProducts] = useState<ProductFullResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [productId, setProductId] = useState<string>("");
  const [transactionType, setTransactionType] = useState<TransactionType | "">("");
  const [userId, setUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const fetchReport = async (currentPage = page, currentRowsPerPage = rowsPerPage) => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (productId) params.append("product_id", productId);
      if (transactionType) params.append("transaction_type", transactionType);
      if (userId) params.append("user_id", userId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("page", (currentPage + 1).toString());
      params.append("page_size", currentRowsPerPage.toString());

      const data: PaginatedTransactionHistoryResponse = await apiClient.get<PaginatedTransactionHistoryResponse>(`/reports/stock-history?${params.toString()}`);
      setReportData(data);
    } catch (err: unknown) {
      console.error('Error fetching stock history report:', err);
      setError(err instanceof Error ? err.message : "Failed to fetch stock history report.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    if (!token) return;
    try {
      const [usersData, productsData] = await Promise.all([
        userApi.getUsers(),
        productApi.getProducts(),
      ]);
      
      setUsers(usersData);
      setProducts(productsData);
    } catch (err: unknown) {
      console.error("Failed to fetch initial data:", err);
      setError(err instanceof Error ? err.message : "Failed to load initial data.");
    }
  };

  useEffect(() => {
    if (token) {
      fetchInitialData();
      fetchReport();
    }
  }, [token]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchReport(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    fetchReport(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    fetchReport(0, newRowsPerPage);
  };

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Rapport sur l'Historique des Mouvements
      </Typography>

      <Box component="form" onSubmit={handleFilterSubmit} sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Produit</InputLabel>
              <Select value={productId} label="Produit" onChange={(e) => setProductId(e.target.value)}>
                <MenuItem value=""><em>Tous</em></MenuItem>
                {products.map((p) => (<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={transactionType} label="Type" onChange={(e) => setTransactionType(e.target.value as TransactionType | "")}>
                <MenuItem value=""><em>Tous</em></MenuItem>
                {Object.values(TransactionType).map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Utilisateur</InputLabel>
              <Select value={userId} label="Utilisateur" onChange={(e) => setUserId(e.target.value)}>
                <MenuItem value=""><em>Tous</em></MenuItem>
                {users.map((u) => (<MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Date de début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField label="Date de fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" fullWidth>Filtrer</Button>
          </Grid>
        </Grid>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="stock history table">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Produit</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Quantité</TableCell>
                  <TableCell>Utilisateur</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData?.items.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{transaction.product.name}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>{transaction.source}</TableCell>
                    <TableCell align="right">{transaction.quantity}</TableCell>
                    <TableCell>{transaction.user.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={reportData?.totalItems || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Lignes par page :"
          />
        </Paper>
      )}
    </Box>
  );
};

export default StockHistoryReport;