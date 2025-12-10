"use client";

import React, { useState, useEffect } from "react";
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
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  TablePagination,
  Chip, // For a nicer status display
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { CategoryResponse, StockStatusEnum } from "@/types/api";
import { useReportApi } from "@/api/reports";
import { useCategoryApi } from "@/api/categories";

const StockStatusReport: React.FC = () => {
  const { getStockStatusReport } = useReportApi();
  const { getCategories } = useCategoryApi();

  // State for filters and pagination
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  // Fetching categories for the filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  });

  // Fetching the report data using useQuery
  const { data: reportData, isLoading, isError, error } = useQuery({
    queryKey: ['stockStatusReport', page, pageSize, statusFilter, categoryFilter],
    queryFn: () => getStockStatusReport(page + 1, pageSize, statusFilter, categoryFilter),
    placeholderData: (previousData) => previousData,
  });

  const totalItems = reportData?.totalItems ?? 0;

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page
  };

  const getStatusChipColor = (status: StockStatusEnum) => {
    switch (status) {
      case StockStatusEnum.OUT_OF_STOCK:
        return "error";
      case StockStatusEnum.CRITICAL:
        return "warning";
      case StockStatusEnum.AVAILABLE:
        return "success";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{(error as Error).message || "Failed to fetch stock status report."}</Alert>;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Rapport sur l'état des stocks
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={statusFilter}
            label="Statut"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <MenuItem value=""><em>Tous</em></MenuItem>
            {Object.values(StockStatusEnum).map((status) => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Catégorie</InputLabel>
          <Select
            value={categoryFilter}
            label="Catégorie"
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
          >
            <MenuItem value=""><em>Toutes</em></MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="stock status table">
          <TableHead>
            <TableRow>
              <TableCell>Nom du Produit</TableCell>
              <TableCell>Référence</TableCell>
              <TableCell>Catégorie</TableCell>
              <TableCell align="right">Quantité Actuelle</TableCell>
              <TableCell align="right">Stock Minimum</TableCell>
              <TableCell>Unité</TableCell>
              <TableCell>Emplacement</TableCell>
              <TableCell>Statut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData?.items.map((product) => (
              <TableRow
                key={product.id}
                hover
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">{product.name}</TableCell>
                <TableCell>{product.reference}</TableCell>
                <TableCell>{product.category.name}</TableCell>
                <TableCell align="right">{product.quantity}</TableCell>
                <TableCell align="right">{product.minStock}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell>{product.location || "N/A"}</TableCell>
                <TableCell>
                  <Chip label={product.status} color={getStatusChipColor(product.status)} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalItems}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={pageSize}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Lignes par page:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} sur ${count}`
        }
      />
    </Box>
  );
};

export default StockStatusReport;