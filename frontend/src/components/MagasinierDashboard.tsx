import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  Skeleton,
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';


import ProductCatalog from './ProductCatalog';
import StockStatusReport from './StockStatusReport';
import StockTurnoverReport from './StockTurnoverReport';
import StockRequestReport from './StockRequestReport';
import StockHistoryReport from './StockHistoryReport';
import PurchaseOrderList from './PurchaseOrderList';
import PurchaseOrderDetail from './PurchaseOrderDetail';
import CreatePurchaseOrderForm from './CreatePurchaseOrderForm';
import LowStockAlerts from './LowStockAlerts';

import { useApiClient } from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { useProductApi } from '@/api/products';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserFullResponse,
  RequestResponse,
  DeliveryNoteData,
  ProductResponse,
  StockAdjustmentResponse,
  StockReceiptResponse,
} from '@/types/api';

import {RequestItemDisputeStatus} from '@/types/api'; // Import RequestItemDisputeStatus enum

// Force cache bust for Docker build - adding a comment


const itemDisputeStatusTranslations: { [key in RequestItemDisputeStatus]: string } = {
  [RequestItemDisputeStatus.NO_DISPUTE]: 'Pas de litige',
  [RequestItemDisputeStatus.REPORTED]: 'Litige signalé',
  [RequestItemDisputeStatus.RESOLVED_APPROVED]: 'Résolu (Approuvé)',
  [RequestItemDisputeStatus.RESOLVED_REJECTED]: 'Résolu (Rejeté)',
};


function MagasinierDashboard() {
  const { user, token } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { showSnackbar, showConfirmation } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'requests' | 'catalog'>('requests');

  // States for report visibility
  const [showStockStatusReport, setShowStockStatusReport] = useState(false);
  const [showStockTurnoverReport, setShowStockTurnoverReport] = useState(false);
  const [showStockRequestReport, setShowStockRequestReport] = useState(false);
  const [showTransactionHistoryReport, setShowTransactionHistoryReport] = useState(false);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [showCreatePurchaseOrderForm, setShowCreatePurchaseOrderForm] = useState(false);
  const [showLowStockAlerts, setShowLowStockAlerts] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);

  // General dialog states (for confirmation)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [confirmDialogAction, setConfirmDialogAction] = useState<(() => void) | null>(null);


  // Data fetching with React Query
  const { data: requests = [], isLoading, refetch: fetchRequests } = useQuery({
    queryKey: ['magasinierRequests', searchTerm],
    queryFn: async () => {
      const query = searchTerm ? `?search=${searchTerm}` : '';
      return apiClient.get<RequestResponse[]>(`/requests/magasinier/requests${query}`);
    },
    enabled: !!token && view === 'requests',
  });

  const { data: pendingAdjustments = [], isLoading: isLoadingAdjustments } = useQuery({
    queryKey: ['pendingAdjustments'],
    queryFn: () => apiClient.get<StockAdjustmentResponse[]>('/products/stock-adjustments/my-adjustments'),
    enabled: !!token && view === 'requests',
  });
  
  const { data: pendingReceipts = [], isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['pendingReceipts'],
    queryFn: () => apiClient.get<StockReceiptResponse[]>('/products/stock-receipts/my-receipts'),
    enabled: !!token && view === 'requests',
  });

  // Mutations
  const deliverRequestMutation = useMutation({
    mutationFn: (requestId: string) => apiClient.put<any>(`/requests/${requestId}/deliver`, {}),
    onSuccess: () => {
      showSnackbar('Livraison confirmée avec succès !', 'success');
      queryClient.invalidateQueries({ queryKey: ['magasinierRequests'] });
      queryClient.invalidateQueries({ queryKey: ['dafRequests'] }); // Invalidate DAF requests as well for status change
    },
    onError: (error: any) => {
      showSnackbar(error.detail || 'Erreur lors de la confirmation de la livraison.', 'error');
    },
  });

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'requests' | 'catalog' | null,
  ) => {
    if (newView !== null) {
      setView(newView);
      // Reset any active reports or purchase order views when changing tabs
      setShowStockStatusReport(false);
      setShowStockTurnoverReport(false);
      setShowStockRequestReport(false);
      setShowTransactionHistoryReport(false);
      setShowPurchaseOrders(false);
      setShowCreatePurchaseOrderForm(false);
      setShowLowStockAlerts(false);
      setSelectedPurchaseOrderId(null);
    }
  };

  const isAnyReportOrPoActive = showStockStatusReport || showStockTurnoverReport || showStockRequestReport || showTransactionHistoryReport || showPurchaseOrders || showCreatePurchaseOrderForm || showLowStockAlerts;

  const handleDeliverRequest = (requestId: string) => {
    showConfirmation('Confirmer la Livraison', `Êtes-vous sûr de vouloir livrer la demande N°${requestId} ?`, () => {
      deliverRequestMutation.mutate(requestId);
    });
  };

  const handlePrintDeliveryNote = async (request: RequestResponse) => {
    if (!token) {
      showSnackbar("Token non disponible, veuillez vous reconnecter.", "error");
      return;
    }

    try {
      const data: DeliveryNoteData = await apiClient.get<DeliveryNoteData>(`/requests/${request.id}/delivery-note-data`);

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        showSnackbar('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les pop-ups.', 'error');
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bon de Livraison N°${data.requestNumber}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; line-height: 1.6; margin: 20px; color: #333; }
                .container { width: 100%; max-width: 750px; margin: 0 auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0056b3; padding-bottom: 15px; }
                h1 { color: #0056b3; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #e0e0e0; padding: 10px; text-align: left; }
                th { background-color: #0056b3; color: white; }
                .signature-section { display: flex; justify-content: space-around; margin-top: 50px; }
                .signature-box { border-top: 1px solid #ccc; width: 30%; text-align: center; padding-top: 5px; }
                .observations-box { border: 1px solid #e0e0e0; padding: 10px; min-height: 60px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="/Logo_PF.jpeg" alt="Logo Postefinances" style="max-width: 150px; height: auto; margin-bottom: 10px;" />
                    <h1>BON DE LIVRAISON</h1>
                </div>
                <p><strong>Numéro de Demande:</strong> ${data.requestNumber}</p>
                <p><strong>Date de la Demande:</strong> ${new Date(data.requestDate).toLocaleDateString()}</p>
                <p><strong>Date de la Livraison:</strong> ${new Date(data.deliveryDate).toLocaleDateString()}</p>
                <p><strong>Demandeur:</strong> ${data.requesterName} (${data.requesterDepartment || 'N/A'})</p>
                <p><strong>Livreur (Magasinier):</strong> ${data.delivererName}</p>
                ${data.requesterObservations ? `<p><strong>Observations du Demandeur:</strong> ${data.requesterObservations}</p>` : ''}
                <table>
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Référence</th>
                            <th>Quantité Livrée</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td>${item.productName}</td>
                                <td>${item.productReference}</td>
                                <td>${item.deliveredQty}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="signature-section">
                    <div class="signature-box">
                        <p>Signature du Chef de Service</p>
                    </div>
                    <div class="signature-box">
                        <p>Signature du Magasinier</p>
                    </div>
                </div>
                <div class="observations-box">
                    <p><strong>Observations lors de la Réception:</strong></p>
                    <p style="min-height: 40px; border-bottom: 1px dashed #ccc;"></p>
                </div>
            </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      
    } catch (error: any) {
      console.error('Error printing delivery note:', error);
      showSnackbar(error.detail || 'Erreur lors de la génération du bon de livraison.', 'error');
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" component="h2" gutterBottom>Tableau de bord Magasinier</Typography>
      <Typography variant="body1" gutterBottom>
        Bonjour, {user.name}{user.department ? ` (${user.department})` : ''}.
      </Typography>

      <Box sx={{ my: 3, borderBottom: 1, borderColor: 'divider' }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleViewChange}
          aria-label="text alignment"
        >
          <ToggleButton value="requests" aria-label="left aligned">
            Demandes
          </ToggleButton>
          <ToggleButton value="catalog" aria-label="centered">
            Catalogue Articles
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'requests' && (
        <>
          <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
            <Typography variant="h5" component="h3" gutterBottom>
              Rapports et Bons de Commande
            </Typography>
             {/* ... Buttons to toggle reports ... */}
          </Paper>

          {!isAnyReportOrPoActive && (
            <>
              {/* Other sections like Pending Adjustments */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h5" component="h3" gutterBottom>
                  Demandes à traiter
                </Typography>
                {isLoading ? (
                  <CircularProgress />
                ) : requests.length === 0 ? (
                  <Typography>Aucune demande à traiter pour le moment.</Typography>
                ) : (
                  <Stack spacing={3}>
                    {requests.map(request => (
                      <Paper key={request.id} elevation={2} sx={{ p: 2, border: request.status === 'LITIGE_RECEPTION' ? '2px solid orange' : 'none' }}>
                        <Typography variant="h6">Demande N°{request.requestNumber} ({request.status})</Typography>
                        <Typography variant="body2">Demandeur: {request.requester.name} ({request.requester.department})</Typography>
                        <Typography variant="body2">Date: {new Date(request.createdAt).toLocaleDateString()}</Typography>
                        {request.requesterObservations && (
                          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                            Observations Demandeur: {request.requesterObservations}
                          </Typography>
                        )}
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Article</TableCell>
                                <TableCell align="right">Demandé</TableCell>
                                <TableCell align="right">Approuvé</TableCell>
                                <TableCell align="right">Livré</TableCell>
                                <TableCell>Litige</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {request.items.map(item => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product.name}</TableCell>
                                  <TableCell align="right">{item.requestedQty}</TableCell>
                                  <TableCell align="right">{item.approvedQty ?? 'N/A'}</TableCell>
                                  <TableCell align="right">{item.approvedQty ?? 'N/A'}</TableCell>
                                  <TableCell>{itemDisputeStatusTranslations[item.itemDisputeStatus]}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          {request.status === "APPROUVEE" && (
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => handleDeliverRequest(request.id)}
                              disabled={deliverRequestMutation.isPending}
                              startIcon={<LocalShippingIcon />}
                            >
                              Livrer la Demande
                            </Button>
                          )}
                          {(request.status === "LIVREE_PAR_MAGASINIER" || request.status === "RECEPTION_CONFIRMEE") && (
                            <>
                              <Button
                                variant="contained"
                                color="info"
                                onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL_HOST || 'http://localhost:8000/api'}/requests/${request.id}/pdf`, '_blank')}
                                startIcon={<ReceiptLongIcon />}
                              >
                                Télécharger Bon de Livraison
                              </Button>
                              <Button
                                variant="outlined"
                                onClick={() => handlePrintDeliveryNote(request)}
                                startIcon={<ReceiptLongIcon />}
                              >
                                Imprimer Bon de Livraison
                              </Button>
                            </>
                          )}

                          {request.status === 'LITIGE_RECEPTION' && (
                            <Button
                              variant="contained"
                              color="warning"
                              startIcon={<WarningAmberOutlinedIcon />}
                            >
                              Litige en cours
                            </Button>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </>
          )}
        </>
      )}

      {view === 'catalog' && (
        <ProductCatalog />
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Annuler</Button>
          <Button onClick={() => {
            if (confirmDialogAction) {
              confirmDialogAction();
            }
          }} autoFocus>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MagasinierDashboard;
