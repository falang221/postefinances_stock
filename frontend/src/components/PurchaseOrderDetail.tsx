// frontend/src/components/PurchaseOrderDetail.tsx
'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Container,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/client';
import { PurchaseOrderPrintData, PurchaseOrderResponse, PurchaseOrderStatus, UserRole } from '@/types/api';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext'; // Add this import
import { usePurchaseOrderApi } from '@/api/purchaseOrders'; // Import the hook
import { format } from 'date-fns';

interface PurchaseOrderDetailProps {
  purchaseOrderId: string;
  onBack: () => void;
  onUpdate: () => void;
  readOnly?: boolean; // Added readOnly prop
}

const PurchaseOrderDetail: React.FC<PurchaseOrderDetailProps> = ({ purchaseOrderId, onBack, onUpdate, readOnly = false }) => {
  const { user } = useAuth();
  const { showSnackbar } = useNotification(); // Initialize useNotification
  const queryClient = useQueryClient();
  const { getPurchaseOrderById, updatePurchaseOrder } = usePurchaseOrderApi();

  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | 'order' | 'receive' | null>(null);

  const {
    data: purchaseOrder,
    isLoading,
    isError,
    error,
  } = useQuery<PurchaseOrderResponse, Error>({
    queryKey: ['purchaseOrder', purchaseOrderId],
    queryFn: () => getPurchaseOrderById(purchaseOrderId),
    enabled: !!user && !!purchaseOrderId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status }: { status: PurchaseOrderStatus }) => {
      if (!purchaseOrder) throw new Error("Purchase order not found");
      return updatePurchaseOrder(purchaseOrder.id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', purchaseOrderId] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      onUpdate();
      setOpenDialog(false);
      setDialogAction(null);
    },
  });

  const handleOpenDialog = (action: 'approve' | 'reject' | 'order' | 'receive') => {
    setDialogAction(action);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogAction(null);
  };

  const handleConfirmAction = () => {
    if (!dialogAction) return;
    let newStatus: PurchaseOrderStatus;
    switch (dialogAction) {
      case 'approve':
        newStatus = PurchaseOrderStatus.APPROVED;
        break;
      case 'reject':
        newStatus = PurchaseOrderStatus.REJECTED;
        break;
      case 'order':
        newStatus = PurchaseOrderStatus.ORDERED;
        break;
      case 'receive':
        newStatus = PurchaseOrderStatus.RECEIVED;
        break;
      default:
        return;
    }
    updateStatusMutation.mutate({ status: newStatus });
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (isError) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!purchaseOrder) {
    return <Alert severity="warning">Bon de commande non trouvé.</Alert>;
  }

  const apiClient = useApiClient();

  const handlePrintPurchaseOrder = async () => {
    if (!purchaseOrder) return;
    try {
      const data: PurchaseOrderPrintData = await apiClient.get<PurchaseOrderPrintData>(`/purchase-orders/${purchaseOrder.id}/purchase-order-data`);

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        // Handle popup blocker
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bon de Commande N°${data.orderNumber}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; line-height: 1.6; margin: 20px; color: #333; }
                .container { width: 100%; max-width: 750px; margin: 0 auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0056b3; padding-bottom: 15px; }
                .header img { max-width: 150px; height: auto; margin-bottom: 10px; }
                .header h1 { color: #0056b3; font-size: 28px; margin: 0; }
                .header h2 { color: #555; font-size: 18px; margin: 5px 0 0; }
                .header p { font-size: 10px; color: #777; }
                .section-title { font-size: 16px; font-weight: bold; color: #0056b3; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .details-box { background-color: #f9f9f9; border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #e0e0e0; padding: 10px; text-align: left; }
                th { background-color: #0056b3; color: white; font-weight: bold; }
                tfoot td { font-weight: bold; background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="${window.location.origin}/Logo_PF.jpeg" alt="Postefinances Logo" />
                    <h1>BON DE COMMANDE</h1>
                    <h2>Postefinances - Gestion de Stock</h2>
                    <p>Date d'impression: ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div class="section-title">Détails de la Commande</div>
                <div class="details-box">
                    <p><strong>Numéro de Commande:</strong> ${data.orderNumber}</p>
                    <p><strong>Date de Commande:</strong> ${new Date(data.createdAt).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Fournisseur:</strong> ${data.supplierName || 'N/A'}</p>
                    <p><strong>Demandé par:</strong> ${data.requestedBy.name}</p>
                    <p><strong>Approuvé par:</strong> ${data.approvedBy?.name || 'N/A'}</p>
                </div>
                <div class="section-title">Articles</div>
                <table>
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Référence</th>
                            <th style="text-align: right;">Quantité</th>
                            <th style="text-align: right;">Prix Unitaire</th>
                            <th style="text-align: right;">Prix Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td>${item.productName}</td>
                                <td>${item.productReference}</td>
                                <td style="text-align: right;">${item.quantity}</td>
                                <td style="text-align: right;">${item.unitPrice.toFixed(2)}</td>
                                <td style="text-align: right;">${item.totalPrice.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="text-align: right; font-weight: bold;">Montant Total</td>
                            <td style="text-align: right; font-weight: bold;">${data.totalAmount.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Use onload and onafterprint events for better print management
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    } catch (error: any) { // Add : any for error type
      console.error('Error printing purchase order:', error);
      // Add user feedback using showSnackbar
      showSnackbar(error.detail || 'Erreur lors de la génération du bon de commande.', 'error');
    }
  };

  const canApproveReject = !readOnly && user?.role === UserRole.DAF && purchaseOrder.status === PurchaseOrderStatus.PENDING_APPROVAL;
  const canOrder = !readOnly && user?.role === UserRole.MAGASINIER && purchaseOrder.status === PurchaseOrderStatus.APPROVED;
  const canReceive = !readOnly && user?.role === UserRole.MAGASINIER && purchaseOrder.status === PurchaseOrderStatus.ORDERED;
  const canPrint = purchaseOrder.status === PurchaseOrderStatus.APPROVED || purchaseOrder.status === PurchaseOrderStatus.ORDERED || purchaseOrder.status === PurchaseOrderStatus.RECEIVED;
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Button variant="outlined" onClick={onBack} sx={{ mb: 3 }}>
          Retour à la liste
        </Button>
        <Typography variant="h5" component="h2" gutterBottom>
          Détails du Bon de Commande N° {purchaseOrder.orderNumber}
        </Typography>
        {updateStatusMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {updateStatusMutation.error.message}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Statut</TableCell>
                <TableCell>{purchaseOrder.status.replace(/_/g, ' ')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Demandé par</TableCell>
                <TableCell>{purchaseOrder.requestedBy.name} ({purchaseOrder.requestedBy.role})</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Approuvé par</TableCell>
                <TableCell>{purchaseOrder.approvedBy?.name || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Fournisseur</TableCell>
                <TableCell>{purchaseOrder.supplierName || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Montant Total</TableCell>
                <TableCell>{purchaseOrder.totalAmount.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Date de Création</TableCell>
                <TableCell>{format(new Date(purchaseOrder.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Dernière Mise à Jour</TableCell>
                <TableCell>{format(new Date(purchaseOrder.updatedAt), 'dd/MM/yyyy HH:mm')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Articles du Bon de Commande</Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell>Référence</TableCell>
                <TableCell align="right">Quantité</TableCell>
                <TableCell align="right">Prix Unitaire</TableCell>
                <TableCell align="right">Prix Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchaseOrder.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.product.reference}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell align="right">{item.totalPrice.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {canPrint && (
            <Button
              variant="outlined"
              color="info"
              onClick={handlePrintPurchaseOrder}
            >
              Imprimer Bon de Commande
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleOpenDialog('approve')}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && dialogAction === 'approve' ? <CircularProgress size={24} /> : 'Approuver'}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleOpenDialog('reject')}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && dialogAction === 'reject' ? <CircularProgress size={24} /> : 'Rejeter'}
              </Button>
            </>
          )}
          {canOrder && (
            <Button
              variant="contained"
              onClick={() => handleOpenDialog('order')}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && dialogAction === 'order' ? <CircularProgress size={24} /> : 'Marquer comme Commandé'}
            </Button>
          )}
          {canReceive && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleOpenDialog('receive')}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && dialogAction === 'receive' ? <CircularProgress size={24} /> : 'Marquer comme Reçu'}
            </Button>
          )}
        </Box>

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {dialogAction === 'approve' && "Confirmer l'approbation"}
            {dialogAction === 'reject' && "Confirmer le rejet"}
            {dialogAction === 'order' && "Confirmer la commande"}
            {dialogAction === 'receive' && "Confirmer la réception"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Êtes-vous sûr de vouloir {dialogAction === 'approve' && "approuver"}
              {dialogAction === 'reject' && "rejeter"}
              {dialogAction === 'order' && "marquer comme commandé"}
              {dialogAction === 'receive' && "marquer comme reçu"} ce bon de commande ?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={updateStatusMutation.isPending}>Annuler</Button>
            <Button onClick={handleConfirmAction} autoFocus disabled={updateStatusMutation.isPending}>
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default PurchaseOrderDetail;