'use client';

import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

// Interface for DeliveryNote data (should match backend schema)
interface DeliveryNoteItem {
  productId: string;
  productName: string;
  productReference: string;
  deliveredQty: number;
}

interface DeliveryNoteData {
  requestId: string;
  requestNumber: string;
  deliveryDate: string; // Use string for date as it comes from JSON
  requesterName: string;
  requesterDepartment?: string | null;
  delivererName: string;
  items: DeliveryNoteItem[];
}

interface DeliveryNotePrintableProps {
  data: DeliveryNoteData;
}

const DeliveryNotePrintable: React.FC<DeliveryNotePrintableProps> = ({ data }) => {
  const formattedDeliveryDate = new Date(data.deliveryDate).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box sx={{ p: 4, fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: 1.5 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>BON DE LIVRAISON</Typography>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Postefinances - Gestion de Stock</Typography>
        <Typography variant="body2">Date d'impression: {new Date().toLocaleDateString('fr-FR')}</Typography>
      </Box>

      {/* Request Details */}
      <Paper elevation={0} sx={{ mb: 3, p: 2, border: '1px solid #eee' }}>
        <Typography variant="body1" sx={{ mb: 1 }}>**Numéro de Demande:** {data.requestNumber}</Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>**Date de Livraison:** {formattedDeliveryDate}</Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>**Demandeur:** {data.requesterName} ({data.requesterDepartment || 'N/A'})</Typography>
        <Typography variant="body1">**Livreur (Magasinier):** {data.delivererName}</Typography>
      </Paper>

      {/* Items Table */}
      <Typography variant="h6" component="h3" sx={{ mt: 4, mb: 2, fontWeight: 'bold' }}>Articles Livrés :</Typography>
      <TableContainer component={Paper} elevation={1} sx={{ mb: 5 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Produit</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Référence</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantité Livrée</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.productName}</TableCell>
                <TableCell>{item.productReference}</TableCell>
                <TableCell align="right">{item.deliveredQty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Signatures */}
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ borderBottom: '1px solid black', pb: 1, mb: 2, width: '200px' }}>
            Signature du Demandeur
          </Typography>
          <Typography variant="body2">(Chef de Service)</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ borderBottom: '1px solid black', pb: 1, mb: 2, width: '200px' }}>
            Signature du Livreur
          </Typography>
          <Typography variant="body2">(Magasinier)</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default DeliveryNotePrintable;
