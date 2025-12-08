import React, { useState } from 'react';
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
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import StockTurnoverReport from '@/components/StockTurnoverReport';
import StockRequestReport from '@/components/StockRequestReport';
import StockValueReport from '@/components/StockValueReport';
import PurchaseOrderList from '@/components/PurchaseOrderList';
import PurchaseOrderDetail from '@/components/PurchaseOrderDetail';
import Link from 'next/link';
import { useApiClient } from '@/api/client';
import {
  UserFullResponse,
  StockAdjustmentResponse,
  StockReceiptResponse,
  RequestResponse,
  DisputeReason,
  RequestItemDisputeStatus,
} from '@/types/api';

import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '@/context/NotificationContext'; // Assuming you have this context for snackbar/confirmation

const disputeReasonTranslations: { [key in DisputeReason]: string } = {
  [DisputeReason.QUANTITE_INCORRECTE]: 'Quantité incorrecte',
  [DisputeReason.ARTICLE_ENDOMMAGE]: 'Article endommagé',
  [DisputeReason.MAUVAIS_ARTICLE]: 'Mauvais article livré',
  [DisputeReason.AUTRE]: 'Autre',
};

const itemDisputeStatusTranslations: { [key in RequestItemDisputeStatus]: string } = {
  [RequestItemDisputeStatus.NO_DISPUTE]: 'Pas de litige',
  [RequestItemDisputeStatus.REPORTED]: 'Litige signalé',
  [RequestItemDisputeStatus.RESOLVED_APPROVED]: 'Résolu (Approuvé)',
  [RequestItemDisputeStatus.RESOLVED_REJECTED]: 'Résolu (Rejeté)',
};

const approvalDecisionTranslations: { [key: string]: string } = {
  PROPOSITION: 'Proposition',
  APPROUVE: 'Approuvé',
  REJETE: 'Rejeté',
  MODIFIE: 'Modifié',
  LITIGE_RESOLU_APPROUVE: 'Litige Résolu (Approuvé)',
  LITIGE_RESOLU_REJETE: 'Litige Résolu (Rejeté)',
};

const getItemDisputeStatusChipColor = (status: RequestItemDisputeStatus) => {
  switch (status) {
    case RequestItemDisputeStatus.REPORTED: return 'warning';
    case RequestItemDisputeStatus.RESOLVED_APPROVED: return 'success';
    case RequestItemDisputeStatus.RESOLVED_REJECTED: return 'error';
    default: return 'default';
  }
};


// --- Component ---
function DAFDashboard() {
  const { user, token } = useAuth(); // Get user and token from AuthContext
  const apiClient = useApiClient();
  const queryClient = useQueryClient(); // NEW: For invalidating queries
  const { showSnackbar, showConfirmation } = useNotification(); // Assuming useNotification provides this

  // States for quantity modification
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [modifiedQuantities, setModifiedQuantities] = useState<Record<string, number>>({});
  const [modifiedQuantitiesErrors, setModifiedQuantitiesErrors] = useState<Record<string, string>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [showStockRequestReport, setShowStockRequestReport] = useState(false);
  const [showStockTurnoverReport, setShowStockTurnoverReport] = useState(false);
  const [showStockValueReport, setShowStockValueReport] = useState(false);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);

  // Prompt Dialog states
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptDialogTitle, setPromptDialogTitle ] = useState('');
  const [promptDialogMessage, setPromptDialogMessage] = useState('');
  const [promptDialogValue, setPromptDialogValue] = useState('');
  const [promptDialogAction, setPromptDialogAction] = useState<((value: string | null) => void) | null>(null);

  // --- Data Fetching with useQuery ---
  const { data: requests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['dafRequests', searchTerm],
    queryFn: async () => {
      const query = searchTerm ? `?search=${searchTerm}` : '';
      return apiClient.get<RequestResponse[]>(`/requests/daf${query}`);
    },
    enabled: !!token, // Only fetch when token is available
  });

  const { data: pendingAdjustments = [], isLoading: isLoadingAdjustments } = useQuery({
    queryKey: ['pendingAdjustments'],
    queryFn: () => apiClient.get<StockAdjustmentResponse[]>('/products/stock-adjustments/pending'),
    enabled: !!token,
  });

  const { data: pendingReceipts = [], isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['pendingReceipts'],
    queryFn: () => apiClient.get<StockReceiptResponse[]>('/products/stock-receipts/pending'),
    enabled: !!token,
  });

  // --- Mutations ---
  const handleAdjustDecisionMutation = useMutation({
    mutationFn: ({ adjustmentId, decision, comment }: { adjustmentId: string, decision: 'APPROVE' | 'REJECT', comment: string | null }) => {
      const body: { decision: 'APPROVE' | 'REJECT'; comment?: string | null } = { decision };
      if (comment) body.comment = comment;
      return apiClient.put<any>(`/products/stock-adjustments/${adjustmentId}/decide`, body);
    },
    onSuccess: (data, variables) => {
      showSnackbar(`Ajustement de stock ${variables.decision === 'APPROVE' ? 'approuvé' : 'rejeté'} avec succès !`, 'success');
      queryClient.invalidateQueries({ queryKey: ['pendingAdjustments'] });
    },
    onError: (error: any) => {
      showSnackbar(error.detail || 'Erreur lors du traitement de la décision d\'ajustement.', 'error');
    },
  });

  const handleReceiptDecisionMutation = useMutation({
    mutationFn: ({ receiptId, decision, comment }: { receiptId: string, decision: 'APPROVE' | 'REJECT', comment: string | null }) => {
      const body: { decision: 'APPROVE' | 'REJECT'; comment?: string | null } = { decision };
      if (comment) body.comment = comment;
      return apiClient.put<any>(`/products/stock-receipts/${receiptId}/decide`, body);
    },
    onSuccess: (data, variables) => {
      showSnackbar(`Réception de stock ${variables.decision === 'APPROVE' ? 'approuvée' : 'rejetée'} avec succès !`, 'success');
      queryClient.invalidateQueries({ queryKey: ['pendingReceipts'] });
    },
    onError: (error: any) => {
      showSnackbar(error.detail || 'Erreur lors du traitement de la décision de réception.', 'error');
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: ({ requestId, items, comment }: { requestId: string, items?: { requestItemId: string; approvedQty: number }[] | null, comment?: string | null }) => {
      const body: { decision: 'APPROUVE'; comment?: string | null; items?: { requestItemId: string; approvedQty: number }[] | null } = { decision: 'APPROUVE' };
      if (comment) body.comment = comment;
      if (items) body.items = items;
      return apiClient.put<any>(`/requests/${requestId}/approve`, body);
    },
    onSuccess: (data, variables) => {
      showSnackbar(`Demande approuvée avec succès !`, 'success');
      queryClient.invalidateQueries({ queryKey: ['dafRequests'] });
      setEditingRequestId(null); // Exit editing mode
    },
    onError: (error: any) => {
      showSnackbar(error.detail || 'Erreur lors de l\'approbation de la demande.', 'error');
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ requestId, comment }: { requestId: string; comment: string | null }) => {
      return apiClient.put<any>(`/requests/${requestId}/reject`, { decision: 'REJETE', comment }); // Use the new reject endpoint
    },
    onSuccess: () => {
      showSnackbar(`Demande rejetée avec succès !`, 'success');
      queryClient.invalidateQueries({ queryKey: ['dafRequests'] });
      setEditingRequestId(null); // Exit editing mode
    },
    onError: (error: any) => {
      showSnackbar(error.detail || 'Erreur lors du rejet de la demande.', 'error');
    },
  });

  const handleResolveDisputeMutation = useMutation({
    mutationFn: ({ requestId, decision, comment }: { requestId: string, decision: 'RESOLVE_APPROVE' | 'RESOLVE_REJECT', comment: string | null }) => {
      return apiClient.put<any>(`/requests/${requestId}/resolve-dispute`, { decision, comment });
    },
    onSuccess: (data, variables) => {
      showSnackbar(`Litige résolu avec succès comme "${variables.decision}"`, 'success');
      queryClient.invalidateQueries({ queryKey: ['dafRequests'] });
    },
    onError: (error: any) => {
      showSnackbar(error.detail || 'Erreur lors de la résolution du litige.', 'error');
    },
  });

  // --- Handlers ---
  const handleAdjustDecision = (adjustmentId: string, decision: 'APPROVE' | 'REJECT', comment: string | null = null) => {
    handleAdjustDecisionMutation.mutate({ adjustmentId, decision, comment });
  };

  const handleReceiptDecision = (receiptId: string, decision: 'APPROVE' | 'REJECT', comment: string | null = null) => {
    handleReceiptDecisionMutation.mutate({ receiptId, decision, comment });
  };

  const approveRequestDecision = (
    { requestId, items, comment }:
    {
      requestId: string,
      items?: { requestItemId: string; approvedQty: number }[] | null,
      comment?: string | null
    }
  ) => {
    approveRequestMutation.mutate({ requestId, items, comment });
  };

  const rejectRequestDecision = (requestId: string, comment: string | null = null) => {
    rejectRequestMutation.mutate({ requestId, comment });
  };

  const handleResolveDispute = (
    requestId: string,
    decision: 'RESOLVE_APPROVE' | 'RESOLVE_REJECT',
    comment: string | null = null,
  ) => {
    handleResolveDisputeMutation.mutate({ requestId, decision, comment });
  };

  // --- Quantity Modification Logic ---
  const startEditing = (request: RequestResponse) => {
    setEditingRequestId(request.id);
    const initialQuantities: Record<string, number> = {};
    request.items.forEach(item => {
      initialQuantities[item.id] = item.approvedQty ?? item.requestedQty;
    });
    setModifiedQuantities(initialQuantities);
    setModifiedQuantitiesErrors({});
  };

  const onQuantityChange = (itemId: string, value: string) => {
    const qty = parseInt(value, 10);
    setModifiedQuantities(prev => ({ ...prev, [itemId]: qty }));

    const request = requests.find(r => r.id === editingRequestId);
    const item = request?.items.find(i => i.id === itemId);

    if (item && qty > item.requestedQty) {
      setModifiedQuantitiesErrors(prev => ({
        ...prev,
        [itemId]: "La quantité approuvée ne peut pas dépasser la quantité demandée.",
      }));
    } else if (qty <= 0) {
      setModifiedQuantitiesErrors(prev => ({
        ...prev,
        [itemId]: "La quantité doit être supérieure à 0.",
      }));
    } else {
      setModifiedQuantitiesErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });
    }
  };

  const saveModification = (request: RequestResponse) => {
    if (!token || !editingRequestId) return;

    const errors: Record<string, string> = {};
    const itemsToApprove: { requestItemId: string; approvedQty: number }[] = [];

    for (const item of request.items) {
      const approvedQty = modifiedQuantities[item.id];
      if (approvedQty === undefined || isNaN(approvedQty) || approvedQty <= 0) {
        errors[item.id] = "Quantité invalide.";
      } else if (approvedQty > item.requestedQty) {
        errors[item.id] = "Ne peut pas dépasser la quantité demandée.";
      } else {
        itemsToApprove.push({ requestItemId: item.id, approvedQty });
      }
    }

    if (Object.keys(errors).length > 0) {
      setModifiedQuantitiesErrors(errors);
      showSnackbar("Veuillez corriger les erreurs de quantité.", "error");
      return;
    }

    if (itemsToApprove.length === 0) {
        showSnackbar("Veuillez approuver au moins un article.", "error");
        return;
    }

    approveRequestDecision({ requestId: request.id, items: itemsToApprove });
  };

  // --- Render ---
  if (!user) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" component="h2" gutterBottom>💼 DAF - Demandes en attente et en litige</Typography>
      <Typography variant="body1" gutterBottom>
        Bonjour, {user.name}{user.department ? ` (${user.department})` : ''}. Voici les demandes en attente d'approbation.
      </Typography>

      {/* --- REPORTS SECTION --- */}
      <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
        <Typography variant="h5" component="h3" gutterBottom>
          Rapports
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AssessmentIcon />}
          onClick={() => setShowStockRequestReport(!showStockRequestReport)}
          sx={{ mr: 2 }}
        >
          {showStockRequestReport ? "Masquer le Rapport des Demandes" : "Afficher le Rapport des Demandes"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<AssessmentIcon />}
          onClick={() => {
            setShowStockRequestReport(false);
            setShowPurchaseOrders(false);
            setShowStockTurnoverReport(!showStockTurnoverReport); // Toggle this report
          }}
          sx={{ mr: 2 }}
        >
          {showStockTurnoverReport ? "Masquer le Rapport de Rotation des Stocks" : "Afficher le Rapport de Rotation des Stocks"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<AssessmentIcon />}
          onClick={() => {
            setShowStockRequestReport(false);
            setShowPurchaseOrders(false);
            setShowStockTurnoverReport(false);
            setShowStockValueReport(!showStockValueReport);
          }}
          sx={{ mr: 2 }}
        >
          {showStockValueReport ? "Masquer le Rapport Valeur du Stock" : "Afficher le Rapport Valeur du Stock"}
        </Button>
        <Link href="/dashboard/reports/stock-valuation" passHref>
          <Button
            variant="contained"
            startIcon={<AssessmentIcon />}
            sx={{ mr: 2 }}
          >
            Rapport Valorisation (Catégorie)
          </Button>
        </Link>
        <Button
          variant="outlined"
          startIcon={<ShoppingCartIcon />}
          onClick={() => {
            setShowPurchaseOrders(!showPurchaseOrders);
            setShowStockRequestReport(false);
            setShowStockTurnoverReport(false); // Hide other reports
            setShowStockValueReport(false);
            setSelectedPurchaseOrderId(null); // Reset selected PO when toggling list
          }}
        >
          {showPurchaseOrders ? "Masquer les Bons de Commande" : "Afficher les Bons de Commande"}
        </Button>
        {showStockRequestReport && <StockRequestReport />}
        {showStockTurnoverReport && <StockTurnoverReport />}
        {showStockValueReport && <StockValueReport />}
        {showPurchaseOrders && !selectedPurchaseOrderId && (
          <PurchaseOrderList
            onViewDetails={setSelectedPurchaseOrderId}
            onCreateNew={() => { /* DAF doesn't create POs directly, so this can be a no-op or navigate to a disabled state */ }}
          />
        )}
        {showPurchaseOrders && selectedPurchaseOrderId && (
          <PurchaseOrderDetail
            purchaseOrderId={selectedPurchaseOrderId}
            onBack={() => setSelectedPurchaseOrderId(null)}
            onUpdate={() => {
              setSelectedPurchaseOrderId(null);
            }}
          />
        )}
      </Paper>

      {/* --- PENDING STOCK ADJUSTMENTS --- */}
      {!showPurchaseOrders && !showStockRequestReport && (
        <>
          <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
            <Typography variant="h5" component="h3" gutterBottom>
              Ajustements de Stock en Attente
            </Typography>
            {isLoadingAdjustments ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...Array(3)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : pendingAdjustments.length === 0 ? (
              <Typography>Aucun ajustement de stock en attente d\'approbation.</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell>Quantité</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Raison</TableCell>
                      <TableCell>Demandé par</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingAdjustments.map(sa => (
                      <TableRow key={sa.id}>
                        <TableCell>{sa.product.name}</TableCell>
                        <TableCell>{sa.quantity}</TableCell>
                        <TableCell>{sa.type}</TableCell>
                        <TableCell>{sa.reason}</TableCell>
                        <TableCell>{sa.requestedBy.name}</TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleAdjustDecision(sa.id, 'APPROVE')}
                            startIcon={<CheckCircleOutlineIcon />}
                            sx={{ mr: 1 }}
                          >
                            Approuver
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => {
                              // Use showConfirmation from useNotification hook for user confirmation before mutation
                              showConfirmation(
                                "Rejeter l'ajustement",
                                "Êtes-vous sûr de vouloir rejeter cet ajustement de stock ? Cela est irréversible.",
                                () => handleAdjustDecision(sa.id, 'REJECT'), // Pass the mutation directly
                                false // Explicitly state no input required
                              );
                            }}
                            startIcon={<CancelOutlinedIcon />}
                          >
                            Rejeter
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* --- PENDING STOCK RECEIPTS --- */}
          <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
            <Typography variant="h5" component="h3" gutterBottom>
              Réceptions de Stock en Attente
            </Typography>
            {isLoadingReceipts ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...Array(3)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : pendingReceipts.length === 0 ? (
              <Typography>Aucune réception de stock en attente d\'approbation.</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell>Quantité</TableCell>
                      <TableCell>Fournisseur</TableCell>
                      <TableCell>Lot</TableCell>
                      <TableCell>Demandé par</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingReceipts.map(sr => (
                      <TableRow key={sr.id}>
                        <TableCell>{sr.product.name}</TableCell>
                        <TableCell>{sr.quantity}</TableCell>
                        <TableCell>{sr.supplierName || 'N/A'}</TableCell>
                        <TableCell>{sr.batchNumber || 'N/A'}</TableCell>
                        <TableCell>{sr.requestedBy.name}</TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleReceiptDecision(sr.id, 'APPROVE')}
                            startIcon={<CheckCircleOutlineIcon />}
                            sx={{ mr: 1 }}
                          >
                            Approuver
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => {
                              showConfirmation(
                                "Rejeter la réception",
                                "Êtes-vous sûr de vouloir rejeter cette réception de stock ? Cela est irréversible.",
                                () => handleReceiptDecision(sr.id, 'REJECT'),
                                false // Explicitly state no input required
                              );
                            }}
                            startIcon={<CancelOutlinedIcon />}
                          >
                            Rejeter
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          <Box sx={{ mb: 3, mt: 4, display: 'flex', gap: 1 }}>
            <TextField
              label="Rechercher une demande..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"

              startIcon={<SearchIcon />}
            >
              Rechercher
            </Button>
          </Box>

          {isLoadingRequests ? (
            <Box sx={{ mt: 4 }}>
              <Skeleton variant="text" width="80%" height={30} sx={{ mb: 2 }} />
              {[...Array(2)].map((_, index) => (
                <Paper key={index} elevation={2} sx={{ p: 2, mb: 2 }}>
                  <Skeleton variant="text" width="50%" height={25} />
                  <Skeleton variant="text" width="70%" height={20} />
                  <Skeleton variant="text" width="30%" height={20} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={50} />
                </Paper>
              ))}
            </Box>
          ) : (
            <Box sx={{ mt: 4 }}>


              {/* Requests to Confirm Delivery */} 
              <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 4 }}>
                Demandes approuvées (Confirmer livraison)
              </Typography>
              {requests.length === 0 ? (
                <Typography>Aucune demande à traiter pour le moment.</Typography>
              ) : (
                <Stack spacing={3}>
                  {requests.map(request => (
                    <Paper key={request.id} elevation={2} sx={{ p: 2, border: request.status === 'LITIGE_RECEPTION' ? '2px solid orange' : 'none' }}>
                      <Typography variant="h6">
                        Demande N°{request.requestNumber}
                        {request.status === 'LITIGE_RECEPTION' && (
                          <span style={{ marginLeft: '10px', color: 'orange', fontWeight: 'bold' }}> (Litige Réception)</span>
                        )}
                      </Typography>
                      <Typography variant="body2">Demandeur: {request.requester.name} ({request.requester.department})</Typography>
                      <Typography variant="body2">Date: {new Date(request.createdAt).toLocaleDateString()}</Typography>
                      {request.requesterObservations && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                          **Observations du Demandeur:** {request.requesterObservations}
                        </Typography>
                      )}

                      {/* Request History Section */} 
                      {request.approvals && request.approvals.length > 0 && (
                        <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                          <Typography variant="subtitle1" gutterBottom>Historique des Décisions</Typography>
                          <Stack spacing={1}>
                            {request.approvals.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(approval => (
                              <Box key={approval.id}>
                                <Typography variant="body2" component="div">
                                  <strong>{new Date(approval.createdAt).toLocaleString('fr-FR')}:</strong>
                                  {' Décision de '}
                                  <strong>{approval.user.name}</strong>
                                  {` (${approval.role}) - `}
                                  <Chip 
                                    label={approvalDecisionTranslations[approval.decision] || approval.decision}
                                    size="small"
                                    sx={{ mx: 0.5 }}
                                    color={approval.decision.includes('REJETE') ? 'error' : approval.decision.includes('APPROUVE') ? 'success' : 'default'}
                                  />
                                </Typography>
                                {approval.comment && (
                                  <Typography variant="caption" sx={{ pl: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                                    Commentaire: {approval.comment}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                      
                      {/* Display items for editing or read-only */} 
                      <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Produit</TableCell>
                              <TableCell align="right">Demandé</TableCell>
                              <TableCell align="right">Approuvé</TableCell>
                              {request.status === 'LITIGE_RECEPTION' && (
                                <>
                                  <TableCell>Statut Litige</TableCell>
                                  <TableCell>Raison Litige</TableCell>
                                  <TableCell>Commentaire Litige</TableCell>
                                </>
                              )}
                              {request.status === 'TRANSMISE' && editingRequestId === request.id && (
                                <TableCell align="center">Modifier</TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {request.items.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>{item.product.name}</TableCell>
                                <TableCell align="right">{item.requestedQty}</TableCell>
                                <TableCell align="right">
                                  {request.status === 'TRANSMISE' && editingRequestId === request.id ? (
                                    <TextField
                                      type="number"
                                      value={modifiedQuantities[item.id] ?? ''}
                                      onChange={(e) => onQuantityChange(item.id, e.target.value)}
                                      inputProps={{ min: 0, max: item.requestedQty }}
                                      size="small"
                                      error={!!modifiedQuantitiesErrors[item.id]}
                                      helperText={modifiedQuantitiesErrors[item.id]}
                                      sx={{ width: 80 }}
                                    />
                                  ) : (
                                    item.approvedQty ?? 'N/A'
                                  )}
                                </TableCell>
                                {request.status === 'LITIGE_RECEPTION' && (
                                  <>
                                    <TableCell>
                                      <Chip
                                        label={itemDisputeStatusTranslations[item.itemDisputeStatus]}
                                        color={getItemDisputeStatusChipColor(item.itemDisputeStatus)}
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {item.itemDisputeReason ? disputeReasonTranslations[item.itemDisputeReason] : 'N/A'}
                                    </TableCell>
                                    <TableCell>{item.itemDisputeComment || 'N/A'}</TableCell>
                                  </>
                                )}
                                {request.status === 'TRANSMISE' && editingRequestId === request.id && (
                                    <TableCell align="center"></TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        {request.status === 'TRANSMISE' && editingRequestId === request.id ? ( // Changed to TRANSMISE
                          // Editing mode buttons
                          <>
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => saveModification(request)}
                              startIcon={<SaveOutlinedIcon />}
                              disabled={Object.keys(modifiedQuantitiesErrors).length > 0}
                            >
                              Sauvegarder Approbation
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => setEditingRequestId(null)} // Cancel editing
                              startIcon={<CancelOutlinedIcon />}
                            >
                              Annuler Édition
                            </Button>
                          </>
                        ) : request.status === 'TRANSMISE' ? ( // Changed to TRANSMISE
                          // Initial view for TRANSMISE
                          <>
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => startEditing(request)} // Start editing quantities
                              startIcon={<EditOutlinedIcon />}
                            >
                              Éditer Quantités
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                showConfirmation(
                                  "Rejeter la demande",
                                  "Veuillez entrer la raison du rejet de la demande :",
                                  (comment) => {
                                    rejectRequestDecision(request.id, comment);
                                  },
                                  true, // Requires input
                                  "Raison du rejet"
                                );
                              }}
                              startIcon={<CancelOutlinedIcon />}
                            >
                              Rejeter
                            </Button>
                          </>
                        ) : request.status === 'LITIGE_RECEPTION' ? (
                          // Dispute resolution buttons
                          <>
                                                      <Button
                                                      variant="contained"
                                                      color="success"
                                                      onClick={() => {
                                                        showConfirmation(
                                                          "Refuser le litige (Confirmer la réception)",
                                                          "Veuillez entrer un commentaire pour refuser le litige et confirmer la réception :",
                                                          (comment) => {
                                                            handleResolveDispute(request.id, 'RESOLVE_APPROVE', comment);
                                                          },
                                                          true, // Requires input
                                                          "Commentaire"
                                                        );
                                                      }}
                                                      startIcon={<CheckCircleOutlineIcon />}
                                                    >
                                                      Refuser le litige (Confirmer)
                                                    </Button>
                                                    <Button
                                                      variant="outlined"
                                                      color="error"
                                                      onClick={() => {
                                                        showConfirmation(
                                                          "Accepter le litige (Rejeter la demande)",
                                                          "Veuillez entrer un commentaire pour accepter le litige et rejeter la demande :",
                                                          (comment) => {
                                                            handleResolveDispute(request.id, 'RESOLVE_REJECT', comment);
                                                          },
                                                          true, // Requires input
                                                          "Commentaire"
                                                        );
                                                      }}
                                                      startIcon={<CancelOutlinedIcon />}
                                                    >
                                                      Accepter le litige (Rejeter la demande)                        </Button>
                          </>
                        ) : null} {/* End of Conditional Buttons for DAF */} 


                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}
        </>
      )}



    </Box>
  );
}

export default DAFDashboard;
