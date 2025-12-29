// frontend/src/components/PurchaseOrderList.tsx
'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Container,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { PaginatedPurchaseOrderResponse, PurchaseOrderStatus, PurchaseOrderSummaryResponse } from '@/types/api';
import { useAuth } from '@/context/AuthContext';
import { usePurchaseOrderApi } from '@/api/purchaseOrders';
import { format } from 'date-fns';

interface PurchaseOrderListProps {
  onViewDetails: (orderId: string) => void;
  onCreateNew: () => void;
  readOnly?: boolean;
}

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({ onViewDetails, onCreateNew, readOnly = false }) => {
  const { user } = useAuth();
  const { getPurchaseOrders } = usePurchaseOrderApi();
  const [filterStatus, setFilterStatus] = useState<PurchaseOrderStatus | ''>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const {
    data: paginatedResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['purchaseOrders', filterStatus, currentPage, itemsPerPage],
    queryFn: () => getPurchaseOrders(
      filterStatus || undefined,
      currentPage,
      itemsPerPage
    ),
    // The placeholderData will keep the old data visible while new data is fetching.
    // The structure matches the expected API response.
    placeholderData: (previousData) => previousData,
    enabled: !!user,
  });

  const purchaseOrders = paginatedResponse?.data ?? [];
  const totalItems = paginatedResponse?.total ?? 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case PurchaseOrderStatus.DRAFT:
        return 'info';
      case PurchaseOrderStatus.PENDING_APPROVAL:
      case PurchaseOrderStatus.A_REVOIR:
        return 'warning';
      case PurchaseOrderStatus.APPROVED:
        return 'success';
      case PurchaseOrderStatus.ANNULEE:
        return 'error';
      case PurchaseOrderStatus.ORDERED:
        return 'primary';
      case PurchaseOrderStatus.CLOTUREE:
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Liste des Bons de Commande
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl variant="outlined" sx={{ minWidth: 200 }}>
            <InputLabel>Filtrer par Statut</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => {
                setCurrentPage(1);
                setFilterStatus(e.target.value as PurchaseOrderStatus | '');
              }}
              label="Filtrer par Statut"
            >
              <MenuItem value="">Tous les statuts</MenuItem>
              {Object.values(PurchaseOrderStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => refetch()}>
            Actualiser
          </Button>
          {user && (user.role === 'ADMIN' || user.role === 'DAF' || user.role === 'MAGASINIER') && !readOnly && (
            <Button variant="contained" color="primary" onClick={onCreateNew}>
              Créer un Bon de Commande
            </Button>
          )}
        </Box>

        {isLoading && <CircularProgress />}
        {isError && <Alert severity="error">{(error as Error).message}</Alert>}

        {!isLoading && !isError && (
          <>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="purchase order table">
                <TableHead>
                  <TableRow>
                    <TableCell>N° Commande</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Demandé par</TableCell>
                    <TableCell>Fournisseur</TableCell>
                    <TableCell align="right">Montant Total</TableCell>
                    <TableCell>Date de Création</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>
                        <Typography color={`${getStatusColor(order.status)}.main`}>
                          {order.status.replace(/_/g, ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.requestedBy.name}</TableCell>
                      <TableCell>{order.supplierName || 'N/A'}</TableCell>
                      <TableCell align="right">{order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell align="center">
                        <Button variant="outlined" size="small" onClick={() => onViewDetails(order.id)}>
                          Voir Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
};

export default PurchaseOrderList;