'use client';

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Box,
  Chip,
  Pagination,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useInventoryAuditApi } from '@/api/inventoryAudits';
import { InventoryAuditStatus, InventoryAuditSummary } from '@/types/api';
import { useNotification } from '@/context/NotificationContext';

// Helper to get chip color based on status
const getStatusChipColor = (status: InventoryAuditStatus) => {
  switch (status) {
    case InventoryAuditStatus.IN_PROGRESS:
      return 'primary';
    case InventoryAuditStatus.COMPLETED:
      return 'secondary';
    case InventoryAuditStatus.RECONCILIATION_PENDING:
      return 'warning';
    case InventoryAuditStatus.CLOSED:
      return 'success';
    default:
      return 'default';
  }
};

const statusTranslations: { [key in InventoryAuditStatus]: string } = {
    [InventoryAuditStatus.IN_PROGRESS]: "En cours",
    [InventoryAuditStatus.COMPLETED]: "Terminé",
    [InventoryAuditStatus.RECONCILIATION_PENDING]: "Réconciliation en attente",
    [InventoryAuditStatus.CLOSED]: "Clôturé",
};


export default function InventoryAuditsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useNotification();
  const { getAudits, createAudit } = useInventoryAuditApi();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventoryAudits', page, pageSize],
    queryFn: () => getAudits(page, pageSize),
  });

  const createAuditMutation = useMutation({
    mutationFn: createAudit,
    onSuccess: (newAudit) => {
      queryClient.invalidateQueries({ queryKey: ['inventoryAudits'] });
      showSnackbar("Nouvel audit d'inventaire démarré avec succès.", "success");
      router.push(`/dashboard/inventory-audits/${newAudit.id}`);
    },
    onError: (error) => {
      showSnackbar(`Erreur lors du démarrage de l'audit: ${error.message}`, "error");
    },
  });

  const handleCreateAudit = () => {
    createAuditMutation.mutate();
  };
  
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Audits d'Inventaire
        </Typography>
        <Button
          variant="contained"
          onClick={handleCreateAudit}
          disabled={createAuditMutation.isPending}
        >
          {createAuditMutation.isPending ? <CircularProgress size={24} /> : "Démarrer un nouvel audit"}
        </Button>
      </Box>

      {isError && <Alert severity="error">Erreur lors du chargement des audits: {error.message}</Alert>}

      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>N° Audit</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Statut</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Créé par</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date de Création</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date de Finalisation</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((audit: InventoryAuditSummary) => (
                  <TableRow key={audit.id} hover>
                    <TableCell>{audit.auditNumber}</TableCell>
                    <TableCell>
                      <Chip
                        label={statusTranslations[audit.status]}
                        color={getStatusChipColor(audit.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{audit.createdBy.name}</TableCell>
                    <TableCell>{format(new Date(audit.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>
                      {audit.completedAt ? format(new Date(audit.completedAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => router.push(`/dashboard/inventory-audits/${audit.id}`)}
                      >
                        Voir Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Aucun audit trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data && data.totalItems > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <Pagination
                    count={Math.ceil(data.totalItems / pageSize)}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                />
            </Box>
        )}
      </Paper>
    </Container>
  );
}
