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
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  TablePagination,
} from "@mui/material";
import { ProductStockStatus, PaginatedProductStockStatusResponse, CategoryResponse } from "@/types/api";

import { useApiClient } from '@/api/client';

const LowStockAlerts: React.FC = () => {
  const apiClient = useApiClient();

  const [alertData, setAlertData] = useState<ProductStockStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  // Pagination states
  const [page, setPage] = useState<number>(0); // 0-indexed page
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Effect to fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await apiClient.get<CategoryResponse[]>("/categories");
        setCategories(fetchedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err.message : "Failed to fetch categories.");
      }
    };
    fetchCategories();
  }, [apiClient]);

  // Effect to fetch low stock alert data with filters and pagination
  useEffect(() => {
    const fetchLowStockAlerts = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (searchTerm) {
          queryParams.append('search', searchTerm);
        }
        if (selectedCategory) {
          queryParams.append('categoryId', selectedCategory);
        }
        queryParams.append('page', (page + 1).toString()); // Backend is 1-indexed, frontend is 0-indexed
        queryParams.append('page_size', pageSize.toString());

        const queryString = queryParams.toString();
        const url = `/products/low-stock-alerts${queryString ? `?${queryString}` : ''}`;
        const response = await apiClient.get<PaginatedProductStockStatusResponse>(url);
        setAlertData(response.items);
        setTotalItems(response.totalItems); // Set total items for pagination
      } catch (err: unknown) {
        console.error('Error fetching low stock alerts:', err);
        setError(err instanceof Error ? err.message : "Failed to fetch low stock alerts.");
      } finally {
        setLoading(false);
      }
    };

    fetchLowStockAlerts();
  }, [apiClient, searchTerm, selectedCategory, page, pageSize]); // Add page and pageSize as dependencies

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
    setPage(0); // Reset to first page when page size changes
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Alertes de Stock Faible
      </Typography>

      {/* Search and Filter controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Rechercher produit"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="category-select-label">Catégorie</InputLabel>
          <Select
            labelId="category-select-label"
            value={selectedCategory}
            label="Catégorie"
            onChange={(event: SelectChangeEvent) => setSelectedCategory(event.target.value)}
          >
            <MenuItem value="">
              <em>Toutes</em>
            </MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="low stock alerts table">
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
            {alertData.map((product) => (
              <TableRow
                key={product.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {product.name}
                </TableCell>
                <TableCell>{product.reference}</TableCell>
                <TableCell>{product.category.name}</TableCell>
                <TableCell align="right">{product.quantity}</TableCell>
                <TableCell align="right">{product.minStock}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell>{product.location || "N/A"}</TableCell>
                <TableCell>
                  {
                                      {
                                        "OUT_OF_STOCK": "Rupture",
                                        "CRITICAL": "Critique",
                                        "AVAILABLE": "Disponible",
                                        "OVERSTOCK": "Surstock",
                                      }[product.status] || product.status
                  }
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
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Lignes par page:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
        }
      />
    </Box>
  );
};

export default LowStockAlerts;
