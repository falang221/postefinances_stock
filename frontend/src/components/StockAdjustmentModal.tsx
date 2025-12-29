
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';

import { ProductFullResponse, StockAdjustmentDirectCreate } from '@/types/api';
import { useStockAdjustmentApi } from '@/api/stockAdjustments';

interface StockAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductFullResponse | null;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ open, onClose, product }) => {
  const { createStockAdjustment } = useStockAdjustmentApi();

  const [newQuantity, setNewQuantity] = useState<number | string>('');
  const [reason, setReason] = useState('');

  // Reset form when the modal opens or product changes
  React.useEffect(() => {
    if (product) {
      setNewQuantity(product.quantity);
      setReason('');
    }
  }, [product, open]);

  const mutation = useMutation({
    mutationFn: createStockAdjustment,
    onSuccess: () => {
      onClose(); // Close the modal on success
    },
    // The onError is handled globally by the hook showing a snackbar
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || newQuantity === '' || !reason) {
      return; // Basic validation
    }
    const data: StockAdjustmentDirectCreate = {
      productId: product.id,
      newQuantity: Number(newQuantity),
      reason,
    };
    mutation.mutate(data);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajuster le stock pour : {product.name}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Référence : <strong>{product.reference}</strong>
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Quantité actuelle : <strong>{product.quantity}</strong> {product.unit}
          </Typography>
          <TextField
            name="newQuantity"
            label="Nouvelle Quantité"
            type="number"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            required
            fullWidth
            margin="normal"
            inputProps={{ min: 0 }}
          />
          <TextField
            name="reason"
            label="Raison de l'ajustement"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={24} /> : 'Ajuster'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default StockAdjustmentModal;
