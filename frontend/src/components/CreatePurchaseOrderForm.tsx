// frontend/src/components/CreatePurchaseOrderForm.tsx
'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { PurchaseOrderCreate, PurchaseOrderItemCreate } from '@/types/api';
import { useAuth } from '@/context/AuthContext';
import { useProductApi } from '@/api/products'; // Import the hook
import { usePurchaseOrderApi } from '@/api/purchaseOrders'; // Import the hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CreatePurchaseOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreatePurchaseOrderForm: React.FC<CreatePurchaseOrderFormProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getProducts } = useProductApi(); // Initialize the hook
  const { createPurchaseOrder } = usePurchaseOrderApi(); // Initialize the hook

  const [supplierName, setSupplierName] = useState<string>('');
  const [items, setItems] = useState<PurchaseOrderItemCreate[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);

  // Fetch products using useQuery
  const {
    data: products = [],
    isLoading: areProductsLoading,
    isError: isProductsError,
    error: productsError,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(), // Wrap in an anonymous function
    enabled: !!user,
  });

  // Create purchase order using useMutation
  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      // Invalidate and refetch purchase orders list
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      onSuccess();
    },
  });

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItemCreate, value: string | number) => {
    const newItems = items.map((item, i) => {
      if (i === index) {
        if (field === 'quantity') {
          return { ...item, [field]: parseInt(value as string, 10) || 0 };
        }
        if (field === 'unitPrice') {
          return { ...item, [field]: parseFloat(value as string) || 0 };
        }
        // For productId, it should always be a string from the select
        return { ...item, [field]: value as string };
      }
      return item;
    });
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    const purchaseOrderData: PurchaseOrderCreate = {
      supplierName: supplierName || null,
      items: items.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    };

    createMutation.mutate(purchaseOrderData);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Créer un Bon de Commande
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            label="Nom du Fournisseur"
            fullWidth
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            margin="normal"
            variant="outlined"
          />

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Articles</Typography>
          {areProductsLoading ? <CircularProgress size={24} /> : items.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField
                select
                label="Produit"
                value={item.productId}
                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                fullWidth
                required
                variant="outlined"
                error={isProductsError}
                helperText={isProductsError ? (productsError as Error).message : ''}
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name} ({product.reference})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Quantité"
                type="number"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                inputProps={{ min: 1 }}
                required
                sx={{ width: '120px' }}
                variant="outlined"
              />
              <TextField
                label="Prix Unitaire"
                type="number"
                value={item.unitPrice}
                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
                required
                sx={{ width: '120px' }}
                variant="outlined"
              />
              <IconButton onClick={() => handleRemoveItem(index)} color="error" disabled={items.length === 1}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={handleAddItem} variant="outlined" sx={{ mt: 1 }}>
            Ajouter un article
          </Button>

          {createMutation.isError && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {createMutation.error.message}
            </Alert>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={onCancel} disabled={createMutation.isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || areProductsLoading}>
              {createMutation.isPending ? <CircularProgress size={24} /> : 'Créer Bon de Commande'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default CreatePurchaseOrderForm;