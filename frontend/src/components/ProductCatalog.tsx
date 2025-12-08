'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';

import { useApiClient } from '@/api/client';
import { ProductFullResponse, StockAdjustmentType } from '@/types/api';

const ProductCatalog: React.FC = () => {
  const apiClient = useApiClient();

  const [products, setProducts] = useState<ProductFullResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductFullResponse | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', reference: '', location: '', minStock: 0 });

  // Adjust Stock Dialog State
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustFormData, setAdjustFormData] = useState({ quantity: 0, reason: '', type: StockAdjustmentType.SORTIE });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (search: string = '') => {
    setIsLoading(true);
    try {
      const query = search ? `?search=${search}` : '';
      const fetchedProducts = await apiClient.get<ProductFullResponse[]>(`/products${query}`);
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchProducts(searchTerm);
  };

  // --- Edit Logic ---
  const handleOpenEditDialog = (product: ProductFullResponse) => {
    setSelectedProduct(product);
    setEditFormData({
      name: product.name,
      reference: product.reference,
      location: product.location || '',
      minStock: product.minStock,
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleEditFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    if (!selectedProduct) return;
    try {
      await apiClient.put(`/products/${selectedProduct.id}`, {
        ...editFormData,
        minStock: Number(editFormData.minStock)
      });
      handleCloseEditDialog();
      fetchProducts(searchTerm); // Refresh list
    } catch (error) {
      console.error('Failed to update product', error);
    }
  };

  // --- Adjust Stock Logic ---
  const handleOpenAdjustDialog = (product: ProductFullResponse) => {
    setSelectedProduct(product);
    setAdjustFormData({ quantity: 0, reason: '', type: StockAdjustmentType.SORTIE });
    setAdjustDialogOpen(true);
  };

  const handleCloseAdjustDialog = () => {
    setAdjustDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleAdjustFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAdjustFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAdjustTypeChange = (event: any) => {
    setAdjustFormData(prev => ({ ...prev, type: event.target.value as StockAdjustmentType }));
  };
  
  const handleConfirmAdjustment = async () => {
    if (!selectedProduct) return;
    try {
      await apiClient.post(`/products/${selectedProduct.id}/adjust-stock`, {
        ...adjustFormData,
        quantity: Number(adjustFormData.quantity),
      });
      handleCloseAdjustDialog();
      fetchProducts(searchTerm); // Refresh list
    } catch (error) {
      console.error('Failed to adjust stock', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h3" gutterBottom>
        Catalogue des Articles
      </Typography>

      <Box sx={{ mb: 3, mt: 2, display: 'flex', gap: 1 }}>
        <TextField
          label="Rechercher un article..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ flexGrow: 1 }}
        />
        <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />}>
          Rechercher
        </Button>
      </Box>

      {isLoading ? (
        <Skeleton variant="rectangular" height={300} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Référence</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell align="right">Quantité</TableCell>
                <TableCell align="right">Stock Min</TableCell>
                <TableCell>Emplacement</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.reference}</TableCell>
                  <TableCell>{product.category.name}</TableCell>
                  <TableCell align="right">{product.quantity}</TableCell>
                  <TableCell align="right">{product.minStock}</TableCell>
                  <TableCell>{product.location || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Modifier le produit">
                      <IconButton onClick={() => handleOpenEditDialog(product)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ajuster le stock">
                      <IconButton onClick={() => handleOpenAdjustDialog(product)} size="small">
                        <TuneIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
        <DialogTitle>Modifier le Produit</DialogTitle>
        <DialogContent>
          <TextField margin="dense" name="name" label="Nom" type="text" fullWidth value={editFormData.name} onChange={handleEditFormChange} />
          <TextField margin="dense" name="reference" label="Référence" type="text" fullWidth value={editFormData.reference} onChange={handleEditFormChange} />
          <TextField margin="dense" name="location" label="Emplacement" type="text" fullWidth value={editFormData.location} onChange={handleEditFormChange} />
          <TextField margin="dense" name="minStock" label="Stock Minimum" type="number" fullWidth value={editFormData.minStock} onChange={handleEditFormChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Annuler</Button>
          <Button onClick={handleSaveChanges} variant="contained">Sauvegarder</Button>
        </DialogActions>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onClose={handleCloseAdjustDialog}>
        <DialogTitle>Ajuster le Stock de "{selectedProduct?.name}"</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Type d'ajustement</InputLabel>
            <Select name="type" value={adjustFormData.type} label="Type d'ajustement" onChange={handleAdjustTypeChange}>
              <MenuItem value={StockAdjustmentType.ENTREE}>Entrée</MenuItem>
              <MenuItem value={StockAdjustmentType.SORTIE}>Sortie</MenuItem>
            </Select>
          </FormControl>
          <TextField margin="dense" name="quantity" label="Quantité" type="number" fullWidth value={adjustFormData.quantity} onChange={handleAdjustFormChange} />
          <TextField margin="dense" name="reason" label="Raison" type="text" fullWidth multiline rows={3} value={adjustFormData.reason} onChange={handleAdjustFormChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdjustDialog}>Annuler</Button>
          <Button onClick={handleConfirmAdjustment} variant="contained">Confirmer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductCatalog;
