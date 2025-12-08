'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Box,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useInventoryAuditApi } from '@/api/inventoryAudits';
import { InventoryAuditStatus, InventoryAuditItemCreate } from '@/types/api';
import { useNotification } from '@/context/NotificationContext';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GavelIcon from '@mui/icons-material/Gavel';

const statusTranslations: { [key in InventoryAuditStatus]: string } = {
    [InventoryAuditStatus.IN_PROGRESS]: "En cours",
    [InventoryAuditStatus.COMPLETED]: "Terminé",
    [InventoryAuditStatus.RECONCILIATION_PENDING]: "Réconciliation en attente",
    [InventoryAuditStatus.CLOSED]: "Clôturé",
};

const getStatusChipColor = (status: InventoryAuditStatus) => {
  switch (status) {
    case InventoryAuditStatus.IN_PROGRESS: return 'primary';
    case InventoryAuditStatus.COMPLETED: return 'secondary';
    case InventoryAuditStatus.RECONCILIATION_PENDING: return 'warning';
    case InventoryAuditStatus.CLOSED: return 'success';
    default: return 'default';
  }
};

export default function InventoryAuditDetailPage() {
  const router = useRouter();
  const params = useParams();
  const auditId = params.auditId as string;
  const queryClient = useQueryClient();
  const { showSnackbar } = useNotification();
  const { getAuditDetails, updateAuditItems, completeAudit, requestReconciliation } = useInventoryAuditApi();

  const [countedQuantities, setCountedQuantities] = useState<Record<string, number | string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: audit, isLoading, isError, error } = useQuery({
    queryKey: ['inventoryAudit', auditId],
    queryFn: () => getAuditDetails(auditId),
    enabled: !!auditId,
  });

  useEffect(() => {
    if (audit?.items) {
      const initialCounts: Record<string, number> = {};
      audit.items.forEach(item => {
        if (item.countedQuantity !== null && item.countedQuantity !== undefined) {
          initialCounts[item.productId] = item.countedQuantity;
        }
      });
      setCountedQuantities(initialCounts);
    }
  }, [audit]);

  const handleQuantityChange = (productId: string, value: string) => {
    setCountedQuantities(prev => ({ ...prev, [productId]: value }));
    setHasChanges(true);
  };

  const updateItemsMutation = useMutation({
    mutationFn: (data: { auditId: string; items: InventoryAuditItemCreate[] }) => 
      updateAuditItems(data.auditId, { items: data.items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryAudit', auditId] });
      showSnackbar("Progrès enregistré avec succès.", "success");
      setHasChanges(false);
    },
    onError: (err) => {
      showSnackbar(`Erreur lors de l'enregistrement: ${err.message}`, "error");
    }
  });

  const completeAuditMutation = useMutation({
    mutationFn: async () => {
      // First, save any pending changes if they exist.
      if (hasChanges) {
        const itemsToUpdate: InventoryAuditItemCreate[] = Object.entries(countedQuantities)
          .filter(([, value]) => value !== '' && !isNaN(Number(value)))
          .map(([productId, value]) => ({
            productId,
            countedQuantity: Number(value),
          }));

        if (itemsToUpdate.length > 0) {
          // Wait for the update to finish before proceeding.
          await updateItemsMutation.mutateAsync({ auditId, items: itemsToUpdate });
        }
      }
      // After saving, proceed to complete the audit.
      return completeAudit(auditId);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inventoryAudit', auditId] });
        queryClient.invalidateQueries({ queryKey: ['inventoryAudits'] });
        showSnackbar("Audit terminé avec succès.", "success");
    },
    onError: (err) => {
        showSnackbar(`Erreur lors de la finalisation de l'audit: ${err.message}`, "error");
    }
  });

  const requestReconciliationMutation = useMutation({
    mutationFn: () => requestReconciliation(auditId),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['inventoryAudit', auditId] });
        queryClient.invalidateQueries({ queryKey: ['inventoryAudits'] });
        showSnackbar("Demande de réconciliation envoyée.", "success");
    },
    onError: (err) => {
        showSnackbar(`Erreur: ${err.message}`, "error");
    }
  });

  const handleSave = () => {
    const itemsToUpdate: InventoryAuditItemCreate[] = Object.entries(countedQuantities)
      .filter(([, value]) => value !== '' && !isNaN(Number(value)))
      .map(([productId, value]) => ({
        productId,
        countedQuantity: Number(value),
      }));

    if (itemsToUpdate.length > 0) {
      updateItemsMutation.mutate({ auditId, items: itemsToUpdate });
    }
  };
  
  const isCompleteButtonDisabled = useMemo(() => {
    if (!audit) return true;
    // Disable if not all items have a valid counted quantity
    return audit.items.some(item => {
      const counted = countedQuantities[item.productId];
      return counted === undefined || counted === '' || isNaN(Number(counted));
    });
  }, [audit, countedQuantities]);

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Erreur lors du chargement de l'audit: {error.message}</Alert>;
  if (!audit) return <Alert severity="warning">Audit non trouvé.</Alert>;

  const canEdit = audit.status === InventoryAuditStatus.IN_PROGRESS;

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Button variant="outlined" onClick={() => router.push('/dashboard/inventory-audits')} sx={{ mb: 3 }}>
        Retour à la liste des audits
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>Audit d'Inventaire N° {audit.auditNumber}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography><strong>Créé par:</strong> {audit.createdBy.name}</Typography>
            <Typography><strong>Date de création:</strong> {format(new Date(audit.createdAt), 'dd/MM/yyyy HH:mm')}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography component="div"><strong>Statut:</strong> <Chip label={statusTranslations[audit.status]} color={getStatusChipColor(audit.status)} /></Typography>
            <Typography><strong>Finalisé le:</strong> {audit.completedAt ? format(new Date(audit.completedAt), 'dd/MM/yyyy HH:mm') : 'N/A'}</Typography>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            {canEdit && (
                <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSave} 
                    disabled={!hasChanges || updateItemsMutation.isPending}
                >
                    {updateItemsMutation.isPending ? <CircularProgress size={24}/> : 'Enregistrer le Progrès'}
                </Button>
            )}
             {canEdit && (
                <Button 
                    variant="contained" 
                    color="secondary"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => completeAuditMutation.mutate()} 
                    disabled={isCompleteButtonDisabled || completeAuditMutation.isPending}
                >
                    {completeAuditMutation.isPending ? <CircularProgress size={24}/> : "Terminer l'Audit"}
                </Button>
            )}
            {audit.status === InventoryAuditStatus.COMPLETED && (
                 <Button 
                    variant="contained" 
                    color="warning"
                    startIcon={<GavelIcon />}
                    onClick={() => requestReconciliationMutation.mutate()}
                    disabled={requestReconciliationMutation.isPending}
                 >
                    {requestReconciliationMutation.isPending ? <CircularProgress size={24}/> : "Demander la Réconciliation"}
                 </Button>
            )}
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Produit</TableCell>
              <TableCell>Référence</TableCell>
              <TableCell align="right">Qté. Système</TableCell>
              <TableCell align="center">Qté. Comptée</TableCell>
              <TableCell align="right">Écart</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {audit.items.map(item => {
              const counted = countedQuantities[item.productId];
              const discrepancy = (counted !== undefined && counted !== '') ? Number(counted) - item.systemQuantity : null;
              
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.product.reference}</TableCell>
                  <TableCell align="right">{item.systemQuantity}</TableCell>
                  <TableCell align="center" sx={{ minWidth: 150 }}>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      value={counted ?? ''}
                      onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                      disabled={!canEdit}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ 
                      fontWeight: 'bold', 
                      color: discrepancy === null ? 'inherit' : (discrepancy > 0 ? 'green' : (discrepancy < 0 ? 'red' : 'inherit'))
                  }}>
                    {discrepancy !== null ? (discrepancy > 0 ? `+${discrepancy}` : discrepancy) : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
