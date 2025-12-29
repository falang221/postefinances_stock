'use client';

import React, { useState } from 'react';
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
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormHelperText, // NEW IMPORT
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SyncAltIcon from '@mui/icons-material/SyncAlt'; // For stock adjustment

import { useProductApi } from '@/api/products';
import { useCategoryApi } from '@/api/categories'; // NEW: for category dropdown
import { useNotification } from '@/context/NotificationContext';
import { ProductFullResponse, ProductCreate, ProductUpdate, CategoryResponse } from '@/types/api';

import StockAdjustmentModal from './StockAdjustmentModal'; // The new modal

const ProductManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { getProducts, createProduct, updateProduct, deleteProduct } = useProductApi();
  const { showSnackbar, showConfirmation } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFullResponse | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // State for the new adjustment modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductFullResponse | null>(null);

  // Fetch products
  const { data: products = [], isLoading, isError, error } = useQuery({
    queryKey: ['products', productSearchTerm],
    queryFn: ({ queryKey }) => {
      const [, searchTerm] = queryKey;
      return getProducts(searchTerm);
    },
  });

  // Mutations for products
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      showSnackbar('Produit créé avec succès !', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseModal();
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: ProductUpdate }) => updateProduct(productId, data),
    onSuccess: () => {
      showSnackbar('Produit mis à jour avec succès !', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseModal();
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      showSnackbar('Produit supprimé avec succès.', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: ProductFullResponse) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = (productId: string) => {
    showConfirmation('Supprimer le produit', 'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.', () => {
      deleteProductMutation.mutate(productId);
    });
  };

  // Handlers for the new adjustment modal
  const handleOpenAdjustmentModal = (product: ProductFullResponse) => {
    setAdjustingProduct(product);
    setIsAdjustmentModalOpen(true);
  };

  const handleCloseAdjustmentModal = () => {
    setAdjustingProduct(null);
    setIsAdjustmentModalOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h3">
          Gestion des Produits
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateModal}>
          Ajouter un produit
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <TextField
          label="Rechercher un produit..."
          variant="outlined"
          size="small"
          value={productSearchTerm}
          onChange={(e) => setProductSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="contained"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
          startIcon={<SearchIcon />}
        >
          Rechercher
        </Button>
      </Box>

      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">{(error as Error).message}</Alert>}

      {!isLoading && !isError && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Référence</TableCell>
                <TableCell align="right">Quantité</TableCell>
                <TableCell align="right">Stock Min</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.reference}</TableCell>
                  <TableCell align="right">{product.quantity}</TableCell>
                  <TableCell align="right">{product.minStock}</TableCell>
                  <TableCell>{product.category ? product.category.name : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenAdjustmentModal(product)} color="secondary" title="Ajuster le stock">
                      <SyncAltIcon />
                    </IconButton>
                    <IconButton onClick={() => handleOpenEditModal(product)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(product.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isModalOpen && <ProductFormModal open={isModalOpen} onClose={handleCloseModal} product={editingProduct} createMutation={createProductMutation} updateMutation={updateProductMutation} />}
      {isAdjustmentModalOpen && <StockAdjustmentModal open={isAdjustmentModalOpen} onClose={handleCloseAdjustmentModal} product={adjustingProduct} />}
    </Box>
  );
};

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductFullResponse | null;
  createMutation: any; // Simplified for brevity
  updateMutation: any;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, onClose, product, createMutation, updateMutation }) => {
  const { getCategories } = useCategoryApi();

  // Fetch categories for the dropdown
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  });

  const [formData, setFormData] = useState<Partial<ProductCreate & ProductUpdate>>({
    name: product?.name ?? '',
    reference: product?.reference ?? '',
    quantity: product?.quantity ?? 0,
    minStock: product?.minStock ?? 0,
    cost: product?.cost ?? 0,
    unit: product?.unit ?? '',
    location: product?.location ?? '',
    categoryId: product?.categoryId ?? '',
  });

  // Effect to update form data when product prop changes (for editing)
  React.useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        reference: product.reference,
        quantity: product.quantity,
        minStock: product.minStock,
        cost: product.cost,
        unit: product.unit,
        location: product.location,
        categoryId: product.categoryId,
      });
    } else {
      setFormData({
        name: '',
        reference: '',
        quantity: 0,
        minStock: 0,
        cost: 0,
        unit: '',
        location: '',
        categoryId: '',
      });
    }
  }, [product]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'quantity' || name === 'minStock' || name === 'cost') ? parseFloat(value as string) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) { // Editing
      updateMutation.mutate({ productId: product.id, data: formData as ProductUpdate });
    } else { // Creating
      createMutation.mutate(formData as ProductCreate);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{product ? "Modifier le produit" : "Créer un nouveau produit"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <TextField name="name" label="Nom" value={formData.name} onChange={handleChange} required fullWidth margin="normal" />
          <TextField name="reference" label="Référence" value={formData.reference} onChange={handleChange} required fullWidth margin="normal" />
          <TextField name="quantity" type="number" label="Quantité Initiale" value={formData.quantity} onChange={handleChange} required fullWidth margin="normal" inputProps={{ min: 0 }} />
          <TextField name="minStock" type="number" label="Stock Minimum" value={formData.minStock} onChange={handleChange} required fullWidth margin="normal" inputProps={{ min: 0 }} />
          <TextField name="cost" type="number" label="Coût" value={formData.cost} onChange={handleChange} required fullWidth margin="normal" inputProps={{ min: 0 }} />
          <TextField name="unit" label="Unité" value={formData.unit} onChange={handleChange} required fullWidth margin="normal" />
          <TextField name="location" label="Emplacement" value={formData.location} onChange={handleChange} fullWidth margin="normal" />
          
          <FormControl fullWidth margin="normal" required disabled={categoriesLoading}>
            <InputLabel>Catégorie</InputLabel>
            <Select name="categoryId" value={formData.categoryId} label="Catégorie" onChange={handleChange}>
              {categoriesLoading ? (
                <MenuItem disabled>Chargement des catégories...</MenuItem>
              ) : (
                categories.map(category => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)
              )}
            </Select>
            {categoriesLoading && <FormHelperText>Chargement des catégories...</FormHelperText>}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending || categoriesLoading}>
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={24} /> : (product ? 'Mettre à jour' : 'Créer')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default ProductManagement;
