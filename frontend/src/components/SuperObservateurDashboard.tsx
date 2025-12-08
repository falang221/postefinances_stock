'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory';
import ListAltIcon from '@mui/icons-material/ListAlt';

import StockStatusReport from './StockStatusReport';
import StockRequestReport from './StockRequestReport';
import StockValueReport from './StockValueReport';
import StockTurnoverReport from './StockTurnoverReport';
import PurchaseOrderList from './PurchaseOrderList';
import PurchaseOrderDetail from './PurchaseOrderDetail';

import { useApiClient } from '@/api/client';
import { useUserApi } from '@/api/users';
import { useProductApi } from '@/api/products';
import { useCategoryApi } from '@/api/categories';
import { useAuth } from '@/context/AuthContext'; // NEW
import { useQuery } from '@tanstack/react-query'; // NEW
import { CategoryResponse, ProductFullResponse, UserFullResponse, RequestResponse } from '@/types/api';
import { useReportApi } from '@/api/reports'; // NEW


// --- Component ---
function SuperObservateurDashboard() { // REMOVED props
  const { user, token } = useAuth(); // NEW: Get user and token from AuthContext
  const apiClient = useApiClient();
  const userApi = useUserApi();
  const { getProducts } = useProductApi();
  const { getCategories } = useCategoryApi();
  const reportApi = useReportApi(); // NEW

  const [showStockStatusReport, setShowStockStatusReport] = useState(false);
  const [showStockRequestReport, setShowStockRequestReport] = useState(false);
  const [showStockValueReport, setShowStockValueReport] = useState(false);
  const [showStockTurnoverReport, setShowStockTurnoverReport] = useState(false);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);

  // States for read-only list visibility
  const [showUsersList, setShowUsersList] = useState(false);
  const [showProductsList, setShowProductsList] = useState(false);
  const [showCategoriesList, setShowCategoriesList] = useState(false);
  const [showRequestsList, setShowRequestsList] = useState(false);

  // Data fetching with React Query
  const { data: users = [], isLoading: isLoadingUsers, isError: isErrorUsers, error: errorUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(), // Fetch users without searchTerm for full list
    enabled: !!token && showUsersList, // Only fetch when token is available and tab is active
  });

  const { data: products = [], isLoading: isLoadingProducts, isError: isErrorProducts, error: errorProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(), // Fetch all products for list
    enabled: !!token && showProductsList,
  });

  const { data: categories = [], isLoading: isLoadingCategories, isError: isErrorCategories, error: errorCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    enabled: !!token && showCategoriesList,
  });

  const { data: requests = [], isLoading: isLoadingRequests, isError: isErrorRequests, error: errorRequests } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => apiClient.get<RequestResponse[]>('/requests/all'), // General endpoint for all requests
    enabled: !!token && showRequestsList,
  });

  if (!user) return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <CircularProgress />
    </Box>
  );

  const hideAllSections = () => {
    setShowStockStatusReport(false);
    setShowStockRequestReport(false);
    setShowStockValueReport(false);
    setShowStockTurnoverReport(false);
    setShowPurchaseOrders(false);
    setSelectedPurchaseOrderId(null);
    setShowUsersList(false);
    setShowProductsList(false);
    setShowCategoriesList(false);
    setShowRequestsList(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" component="h2" gutterBottom>
        👁️ Super Observateur - Tableau de Bord
      </Typography>
      <Typography variant="body1" gutterBottom>
        Bonjour, {user.name}{user.department ? ` (${user.department})` : ''}. Vue d'ensemble complète du système.
      </Typography>

      <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
        <Typography variant="h5" component="h3" gutterBottom>
          Rapports et Listes
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => { hideAllSections(); setShowStockStatusReport(true); }}
          >
            Rapport d'État des Stocks
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => { hideAllSections(); setShowStockRequestReport(true); }}
          >
            Rapport des Demandes
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => { hideAllSections(); setShowStockValueReport(true); }}
          >
            Rapport Valeur du Stock
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => { hideAllSections(); setShowStockTurnoverReport(true); }}
          >
            Rapport de Rotation des Stocks
          </Button>
          <Button
            variant="outlined"
            startIcon={<ShoppingCartIcon />}
            onClick={() => { hideAllSections(); setShowPurchaseOrders(true); }}
          >
            Bons de Commande
          </Button>
          <Button
            variant="outlined"
            startIcon={<PeopleIcon />}
            onClick={() => { hideAllSections(); setShowUsersList(true); }}
          >
            Liste des Utilisateurs
          </Button>
          <Button
            variant="outlined"
            startIcon={<InventoryIcon />}
            onClick={() => { hideAllSections(); setShowProductsList(true); }}
          >
            Liste des Produits
          </Button>
          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            onClick={() => { hideAllSections(); setShowCategoriesList(true); }}
          >
            Liste des Catégories
          </Button>
          <Button
            variant="outlined"
            startIcon={<ListAltIcon />}
            onClick={() => { hideAllSections(); setShowRequestsList(true); }}
          >
            Liste des Demandes
          </Button>
        </Stack>

        {showStockStatusReport && <StockStatusReport />}
        {showStockRequestReport && <StockRequestReport />}
        {showStockValueReport && <StockValueReport />}
        {showStockTurnoverReport && <StockTurnoverReport />}
        
        {showPurchaseOrders && !selectedPurchaseOrderId && (
          <PurchaseOrderList
            onViewDetails={setSelectedPurchaseOrderId}
            onCreateNew={() => { /* Super Observateur cannot create POs */ }}
            readOnly={true} // Indicate read-only mode
          />
        )}
        {showPurchaseOrders && selectedPurchaseOrderId && (
          <PurchaseOrderDetail
            purchaseOrderId={selectedPurchaseOrderId}
            onBack={() => setSelectedPurchaseOrderId(null)}
            onUpdate={() => { /* Super Observateur cannot update POs */ }}
            readOnly={true} // Indicate read-only mode
          />
        )}

        {showUsersList && (
          <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>Utilisateurs (Lecture seule)</Typography>
            {isLoadingUsers ? (
              <CircularProgress />
            ) : isErrorUsers ? (
              <Alert severity="error">{(errorUsers as Error).message || "Erreur lors du chargement des utilisateurs."}</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Rôle</TableCell>
                      <TableCell>Département</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.role}</TableCell>
                        <TableCell>{u.department || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
        {showProductsList && (
          <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>Produits (Lecture seule)</Typography>
            {isLoadingProducts ? (
              <CircularProgress />
            ) : isErrorProducts ? (
              <Alert severity="error">{(errorProducts as Error).message || "Erreur lors du chargement des produits."}</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                      <TableCell>Référence</TableCell>
                      <TableCell>Quantité</TableCell>
                      <TableCell>Unité</TableCell>
                      <TableCell>Emplacement</TableCell>
                      <TableCell>Catégorie</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.reference}</TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell>{p.unit}</TableCell>
                        <TableCell>{p.location || 'N/A'}</TableCell>
                        <TableCell>{p.category.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
        {showCategoriesList && (
          <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>Catégories (Lecture seule)</Typography>
            {isLoadingCategories ? (
              <CircularProgress />
            ) : isErrorCategories ? (
              <Alert severity="error">{(errorCategories as Error).message || "Erreur lors du chargement des catégories."}</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nom</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
        {showRequestsList && (
          <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>Demandes (Lecture seule)</Typography>
            {isLoadingRequests ? (
              <CircularProgress />
            ) : isErrorRequests ? (
              <Alert severity="error">{(errorRequests as Error).message || "Erreur lors du chargement des demandes."}</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>N° Demande</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Demandeur</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Articles</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.requestNumber}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>{r.requester.name}</TableCell>
                        <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {r.items.map(item => (
                            <Typography key={item.id} variant="body2">
                              {item.product.name} (Qté: {item.requestedQty})
                            </Typography>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}

      </Paper>
    </Box>
  );
}

export default SuperObservateurDashboard;