import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  CircularProgress,
  Alert,
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
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext'; // NEW
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // NEW
import { useApiClient } from '@/api/client';
import { useProductApi } from '@/api/products';
import {
  DisputeReason,
  RequestItemReportIssueData,
  RequestBulkItemIssuesData,
  ProductResponse,
  RequestResponse,
  RequestItemDisputeStatus,
} from '@/types/api';

const disputeReasonTranslations: { [key in DisputeReason]: string } = {
  [DisputeReason.QUANTITE_INCORRECTE]: 'Quantité incorrecte',
  [DisputeReason.ARTICLE_ENDOMMAGE]: 'Article endommagé',
  [DisputeReason.MAUVAIS_ARTICLE]: 'Mauvais article livré',
  [DisputeReason.AUTRE]: 'Autre (préciser dans le commentaire)',
};

const itemDisputeStatusTranslations: { [key in RequestItemDisputeStatus]: string } = {
  [RequestItemDisputeStatus.NO_DISPUTE]: 'Pas de litige',
  [RequestItemDisputeStatus.REPORTED]: 'Litige signalé',
  [RequestItemDisputeStatus.RESOLVED_APPROVED]: 'Résolu (Approuvé)',
  [RequestItemDisputeStatus.RESOLVED_REJECTED]: 'Résolu (Rejeté)',
};


function ChefServiceDashboard() {
  const { user, token } = useAuth(); // NEW: Get user from context
  const apiClient = useApiClient();
  const productApi = useProductApi();
  const queryClient = useQueryClient();
  const { showSnackbar, showConfirmation } = useNotification();

  const [selectedItems, setSelectedItems] = useState<{ productId: string; requestedQty: number }[]>([]);
  const [requesterObservations, setRequesterObservations] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [currentRequestForDispute, setCurrentRequestForDispute] = useState<RequestResponse | null>(null);
  const [itemDisputeDetails, setItemDisputeDetails] = useState<Record<string, { reason: DisputeReason | ''; comment: string; selected: boolean }>>({});

  // Data fetching with React Query
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getProducts(undefined), // Explicitly pass undefined if no search term
    enabled: !!token,
  });

  const { data: requests = [], isLoading: requestsLoading, refetch: fetchRequests } = useQuery({
    queryKey: ['myRequests', searchTerm],
    queryFn: async () => {
      const query = searchTerm ? `?search=${searchTerm}` : '';
      return apiClient.get<RequestResponse[]>(`/requests/my-requests${query}`);
    },
    enabled: !!token,
  });
  
  // Mutations
  const createRequestMutation = useMutation({
    mutationFn: (newData: { items: { productId: string; requestedQty: number }[], requesterObservations: string | null }) => 
      apiClient.post<RequestResponse>('/requests', newData),
    onSuccess: () => {
      setSelectedItems([]);
      setRequesterObservations('');
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      showSnackbar('Demande créée avec succès !', 'success');
    },
    onError: (error: any) => {
        showSnackbar(`Erreur lors de la création de la demande: ${error.detail || error.message}`, 'error');
    }
  });

  const validateReceptionMutation = useMutation({
    mutationFn: (requestId: string) => apiClient.put<any>(`/requests/${requestId}/receive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      showSnackbar('Réception validée avec succès !', 'success');
    },
    onError: (error: any) => {
        showSnackbar(`Erreur lors de la validation de la réception: ${error.detail || error.message}`, 'error');
    }
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (requestId: string) => apiClient.put<any>(`/requests/${requestId}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      showSnackbar('Demande annulée avec succès !', 'success');
    },
    onError: (error: any) => {
        showSnackbar(`Erreur lors de l´annulation de la demande: ${error.detail || error.message}`, 'error');
    }
  });

  const reportIssueMutation = useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: RequestBulkItemIssuesData }) => 
      apiClient.put<RequestResponse>(`/requests/${requestId}/report-issue`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      showSnackbar('Problème(s) de réception signalé(s) avec succès !', 'success');
      setIssueDialogOpen(false);
    },
    onError: (error: any) => {
        showSnackbar(`Erreur lors du signalement du problème: ${error.detail || error.message}`, 'error');
    }
  });


  // Event Handlers
  const handleCreateRequest = () => {
    if (selectedItems.length === 0) {
      showSnackbar('Veuillez sélectionner au moins un article.', 'warning');
      return;
    }
    createRequestMutation.mutate({ items: selectedItems, requesterObservations: requesterObservations || null });
  };

  const handleCancelRequest = (requestId: string) => {
    showConfirmation("Annuler la Demande", "Êtes-vous sûr de vouloir annuler cette demande ?", () => {
      cancelRequestMutation.mutate(requestId);
    }, false); // No input required for this confirmation
  };

  const handleToggleProduct = (product: ProductResponse) => {
    setSelectedItems((prevSelected) => {
      const isSelected = prevSelected.some((item) => item.productId === product.id);
      if (isSelected) {
        return prevSelected.filter((item) => item.productId !== product.id);
      } else {
        return [...prevSelected, { productId: product.id, requestedQty: 1 }];
      }
    });
  };

  const handleQuantityChange = (productId: string, qty: number) => {
    setSelectedItems((prevSelected) =>
      prevSelected.map((item) =>
        item.productId === productId ? { ...item, requestedQty: qty } : item
      )
    );
  };

  const handleOpenIssueDialog = (request: RequestResponse, itemId: string | null = null) => {
    setCurrentRequestForDispute(request);
    const initialDisputeDetails: Record<string, { reason: DisputeReason | ''; comment: string; selected: boolean }> = {};
    request.items.forEach(item => {
      // If a specific itemId is provided, only select that one initially
      // Otherwise, none are selected by default.
      initialDisputeDetails[item.id] = { 
        reason: item.itemDisputeReason || '', 
        comment: item.itemDisputeComment || '', 
        selected: !!itemId && itemId === item.id 
      };
    });
    setItemDisputeDetails(initialDisputeDetails);
    setIssueDialogOpen(true);
  };
  
  const handleReportIssueSubmit = () => {
    if (!currentRequestForDispute) return;
  
    const issuesToReport: RequestItemReportIssueData[] = [];
    let validationFailed = false;

    for (const [itemId, details] of Object.entries(itemDisputeDetails)) {
      if (details.selected) {
        if (!details.reason) {
          showSnackbar('Veuillez sélectionner une raison de litige pour tous les articles sélectionnés.', 'warning');
          validationFailed = true;
          break; // Exit the loop on first validation failure
        }
        if (details.reason === DisputeReason.AUTRE && !details.comment) {
          const item = currentRequestForDispute.items.find(i => i.id === itemId);
          showSnackbar(`Un commentaire est obligatoire pour l'article '${item?.product.name}' lorsque la raison du litige est 'Autre'.`, 'warning');
          validationFailed = true;
          break; // Exit the loop on first validation failure
        }
        issuesToReport.push({
          requestItemId: itemId,
          reason: details.reason,
          comment: details.comment || undefined,
        });
      }
    }

    if (validationFailed) {
      return; // Stop submission if validation failed
    }
  
    if (issuesToReport.length === 0) {
      showSnackbar('Veuillez sélectionner au moins un article à signaler.', 'warning');
      return;
    }
  
    reportIssueMutation.mutate({ requestId: currentRequestForDispute.id, data: { items: issuesToReport } });
  };


  if (!user) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" component="h2" gutterBottom>
        🧑‍💼 Chef de Service - Tableau de Bord
      </Typography>
      <Typography variant="body1" gutterBottom>
        Bonjour, {user.name}{user.department ? ` (${user.department})` : ''}. Gérez vos demandes de matériel ici.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        {/* Left Column: Product List */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h5" component="h3" gutterBottom>
              Liste des Articles
            </Typography>
            <TextField
              fullWidth
              label="Rechercher un article..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: <SearchIcon />,
              }}
            />
            {productsLoading ? (
              <CircularProgress />
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>Article</TableCell>
                      <TableCell align="right">Quantité</TableCell>

                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedItems.some((item) => item.productId === product.id)}
                            onChange={() => handleToggleProduct(product)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{product.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {product.reference}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={
                              selectedItems.find((item) => item.productId === product.id)
                                ?.requestedQty || ''
                            }
                            onChange={(e) =>
                              handleQuantityChange(
                                product.id,
                                parseInt(e.target.value, 10)
                              )
                            }
                            inputProps={{ min: 1 }}
                            sx={{ width: 80 }}
                            disabled={!selectedItems.some(item => item.productId === product.id)}
                          />
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Selected Items and Request Form */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h5" component="h3" gutterBottom>
              Nouvelle Demande
            </Typography>
            {selectedItems.length === 0 ? (
              <Typography color="textSecondary">
                Sélectionnez des articles pour créer une demande.
              </Typography>
            ) : (
              <Stack spacing={2}>
                <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Article</TableCell>
                        <TableCell align="right">Quantité</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedItems.map((item) => {
                        const product = products.find((p) => p.id === item.productId);
                        return (
                          <TableRow key={item.productId}>
                            <TableCell>{product?.name || 'N/A'}</TableCell>
                            <TableCell align="right">{item.requestedQty}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TextField
                  fullWidth
                  label="Observations du demandeur"
                  multiline
                  rows={3}
                  variant="outlined"
                  value={requesterObservations}
                  onChange={(e) => setRequesterObservations(e.target.value)}
                />

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateRequest}
                  disabled={createRequestMutation.isPending || selectedItems.some(item => item.requestedQty <= 0)}
                  sx={{ mt: 2 }}
                >
                  {createRequestMutation.isPending ? <CircularProgress size={24} /> : 'Soumettre la Demande'}
                </Button>
                {createRequestMutation.isError && (
                  <Alert severity="error">
                    Erreur lors de la création de la demande: {(createRequestMutation.error as Error).message}
                  </Alert>
                )}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Mes Demandes Section */}
      <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
        <Typography variant="h5" component="h3" gutterBottom>
          Mes Demandes
        </Typography>
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <TextField
            label="Rechercher une demande..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="contained" onClick={() => fetchRequests()} startIcon={<SearchIcon />}>
            Rechercher
          </Button>
        </Box>

        {requestsLoading ? (
          <CircularProgress />
        ) : (
          <Stack spacing={3} sx={{ mt: 3 }}>
            {requests.length === 0 ? (
              <Typography>Aucune demande trouvée.</Typography>
            ) : (
              requests.map(request => (
                <Paper key={request.id} elevation={2} sx={{ p: 2 }}>
                  <Typography variant="h6">Demande N°{request.requestNumber} ({request.status})</Typography>
                  <Typography variant="body2">Date: {new Date(request.createdAt).toLocaleDateString()}</Typography>
                  {request.requesterObservations && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                      Observations: {request.requesterObservations}
                    </Typography>
                  )}
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Article</TableCell>
                          <TableCell align="right">Demandé</TableCell>
                          <TableCell align="right">Proposé</TableCell>
                          <TableCell align="right">Approuvé</TableCell>
                          <TableCell>Statut Litige</TableCell>
                          <TableCell>Raison Litige</TableCell>
                          <TableCell>Commentaire Litige</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {request.items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product.name}</TableCell>
                            <TableCell align="right">{item.requestedQty}</TableCell>
                            <TableCell align="right">{item.proposedQty ?? 'N/A'}</TableCell>
                            <TableCell align="right">{item.approvedQty ?? 'N/A'}</TableCell>
                            <TableCell>
                              {item.itemDisputeStatus !== RequestItemDisputeStatus.NO_DISPUTE ? (
                                <Chip
                                  label={itemDisputeStatusTranslations[item.itemDisputeStatus]}
                                  color={item.itemDisputeStatus === RequestItemDisputeStatus.REPORTED ? 'warning' : 'default'}
                                  size="small"
                                />
                              ) : (
                                itemDisputeStatusTranslations[item.itemDisputeStatus]
                              )}
                            </TableCell>
                            <TableCell>{item.itemDisputeReason ? disputeReasonTranslations[item.itemDisputeReason] : 'N/A'}</TableCell>
                            <TableCell>{item.itemDisputeComment || 'N/A'}</TableCell>
                            <TableCell>
                              {item.itemDisputeStatus === RequestItemDisputeStatus.NO_DISPUTE && request.status === "LIVREE_PAR_MAGASINIER" && (
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  size="small"
                                  onClick={() => handleOpenIssueDialog(request, item.id)}
                                >
                                  Signaler un Problème
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {request.status === "LIVREE_PAR_MAGASINIER" && (
                      <>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => validateReceptionMutation.mutate(request.id)}
                          disabled={request.items.some(item => item.itemDisputeStatus === RequestItemDisputeStatus.REPORTED)}
                        >
                          Confirmer Réception
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => handleOpenIssueDialog(request)}
                        >
                          Signaler un Problème
                        </Button>
                      </>
                    )}
                    {(request.status === "BROUILLON" || request.status === "SOUMISE" || request.status === "TRANSMISE") && (
                      <Button variant="outlined" color="error" onClick={() => handleCancelRequest(request.id)}>
                        Annuler la Demande
                      </Button>
                    )}
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        )}
      </Paper>

      {/* Signaler un Problème Dialog */}
      <Dialog open={issueDialogOpen} onClose={() => {setIssueDialogOpen(false); setItemDisputeDetails({}); setCurrentRequestForDispute(null);}} maxWidth="md" fullWidth>
        <DialogTitle>Signaler un Problème de Réception pour la Demande N°{currentRequestForDispute?.requestNumber}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Veuillez sélectionner les articles pour lesquels vous souhaitez signaler un problème et fournir les détails.
          </DialogContentText>
          {currentRequestForDispute?.items.map(item => (
            <Paper key={item.id} elevation={1} sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={1}>
                  <Checkbox
                    checked={itemDisputeDetails[item.id]?.selected || false}
                    onChange={(e) => setItemDisputeDetails(prev => ({
                      ...prev,
                      [item.id]: { ...prev[item.id], selected: e.target.checked }
                    }))}
                  />
                </Grid>
                <Grid item xs={5}>
                  <Typography variant="subtitle1">{item.product.name}</Typography>
                  <Typography variant="body2" color="textSecondary">Qté Reçue: {item.approvedQty ?? item.requestedQty}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth size="small" disabled={!itemDisputeDetails[item.id]?.selected}>
                    <Select
                      value={itemDisputeDetails[item.id]?.reason || ''}
                      onChange={(e) => setItemDisputeDetails(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], reason: e.target.value as DisputeReason }
                      }))}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>Sélectionner une raison</MenuItem>
                      {Object.values(DisputeReason).map(reason => (
                        <MenuItem key={reason} value={reason}>{disputeReasonTranslations[reason]}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Commentaire"
                    value={itemDisputeDetails[item.id]?.comment || ''}
                    onChange={(e) => setItemDisputeDetails(prev => ({
                      ...prev,
                      [item.id]: { ...prev[item.id], comment: e.target.value }
                    }))}
                    disabled={!itemDisputeDetails[item.id]?.selected}
                  />
                </Grid>
              </Grid>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleReportIssueSubmit} color="primary" variant="contained">
            Signaler
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ChefServiceDashboard;