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

import { useProductApi } from '@/api/products';
import { useCategoryApi } from '@/api/categories'; // NEW: for category dropdown
import { useNotification } from '@/context/NotificationContext';
import { ProductResponse, ProductCreate, ProductUpdate, CategoryResponse } from '@/types/api';

const ProductManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { getProducts, createProduct, updateProduct, deleteProduct } = useProductApi();
  const { showSnackbar, showConfirmation } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');

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

  const handleOpenEditModal = (product: ProductResponse) => {
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
                <TableCell align="right">Stock Max</TableCell>
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
                  <TableCell align="right">{product.maxStock}</TableCell>
                  <TableCell>{product.category ? product.category.name : 'N/A'}</TableCell>
                  <TableCell align="right">
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
    </Box>
  );
};

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductResponse | null;
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
    initialQuantity: product?.quantity ?? 0,
    maxStock: product?.maxStock ?? 0,
    categoryId: product?.categoryId ?? '',
  });

  // Effect to update form data when product prop changes (for editing)
  React.useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        reference: product.reference,
        initialQuantity: product.quantity,
        maxStock: product.maxStock,
        categoryId: product.categoryId,
      });
    } else {
      setFormData({
        name: '',
        reference: '',
        initialQuantity: 0,
        maxStock: 0,
        categoryId: '',
      });
    }
  }, [product]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'initialQuantity' || name === 'maxStock') ? parseInt(value as string, 10) : value
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
          <TextField name="initialQuantity" type="number" label="Quantité Initiale" value={formData.initialQuantity} onChange={handleChange} required fullWidth margin="normal" inputProps={{ min: 0 }} />
          <TextField name="maxStock" type="number" label="Stock Maximum" value={formData.maxStock} onChange={handleChange} required fullWidth margin="normal" inputProps={{ min: 0 }} />
          
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
