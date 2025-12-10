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
  FormHelperText,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

import { useCategoryApi } from '@/api/categories';
import { useNotification } from '@/context/NotificationContext';
import { CategoryResponse } from '@/types/api';

// NEW: Define CategoryCreate and CategoryUpdate interfaces based on expected API structure
// Assuming a category only has a 'name' for creation/update
interface CategoryCreate {
  name: string;
}

interface CategoryUpdate {
  name?: string;
}


const CategoryManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { getCategories, createCategory, updateCategory, deleteCategory } = useCategoryApi();
  const { showSnackbar, showConfirmation } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  // Fetch categories
  const { data: categories = [], isLoading, isError, error } = useQuery({
    queryKey: ['categories', categorySearchTerm],
    queryFn: ({ queryKey }) => {
      const [, searchTerm] = queryKey;
      return getCategories(searchTerm);
    },
  });

  // Mutations for categories
  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      showSnackbar('Catégorie créée avec succès !', 'success');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseModal();
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: CategoryUpdate }) => updateCategory(categoryId, data),
    onSuccess: () => {
      showSnackbar('Catégorie mise à jour avec succès !', 'success');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseModal();
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      showSnackbar('Catégorie supprimée avec succès.', 'success');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category: CategoryResponse) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = (categoryId: string) => {
    showConfirmation('Supprimer la catégorie', 'Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.', () => {
      deleteCategoryMutation.mutate(categoryId);
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h3">
          Gestion des Catégories
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateModal}>
          Ajouter une catégorie
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <TextField
          label="Rechercher une catégorie..."
          variant="outlined"
          size="small"
          value={categorySearchTerm}
          onChange={(e) => setCategorySearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="contained"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['categories'] })}
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
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id} hover>
                  <TableCell>{category.name}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenEditModal(category)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(category.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isModalOpen && <CategoryFormModal open={isModalOpen} onClose={handleCloseModal} category={editingCategory} createMutation={createCategoryMutation} updateMutation={updateCategoryMutation} />}
    </Box>
  );
};

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category: CategoryResponse | null;
  createMutation: any; 
  updateMutation: any;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ open, onClose, category, createMutation, updateMutation }) => {
  const [formData, setFormData] = useState<CategoryCreate>({
    name: category?.name ?? '',
  });

  React.useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
      });
    } else {
      setFormData({
        name: '',
      });
    }
  }, [category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (category) { // Editing
      updateMutation.mutate({ categoryId: category.id, data: formData as CategoryUpdate });
    } else { // Creating
      createMutation.mutate(formData as CategoryCreate);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{category ? "Modifier la catégorie" : "Créer une nouvelle catégorie"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <TextField name="name" label="Nom de la catégorie" value={formData.name} onChange={handleChange} required fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={24} /> : (category ? 'Mettre à jour' : 'Créer')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default CategoryManagement;