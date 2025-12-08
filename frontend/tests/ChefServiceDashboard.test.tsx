// frontend/tests/ChefServiceDashboard.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChefServiceDashboard from '@/components/ChefServiceDashboard';
import { useNotification } from '@/context/NotificationContext';
import { useApiClient } from '@/api/client';
import { useProductApi } from '@/api/products';
import { UserRole } from '@/types/api';

// Mock necessary contexts and hooks
jest.mock('@/context/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  useApiClient: jest.fn(),
}));

jest.mock('@/api/products', () => ({
  useProductApi: jest.fn(),
}));

describe('ChefServiceDashboard Component', () => {
  const mockShowSnackbar = jest.fn();
  const mockShowConfirmation = jest.fn();
  const mockApiClientPost = jest.fn();
  const mockApiClientPut = jest.fn();
  const mockApiClientGet = jest.fn();
  const mockGetProducts = jest.fn();

  const mockUser = {
    id: 'user123',
    email: 'chef@example.com',
    name: 'Chef Service User',
    role: UserRole.CHEF_SERVICE,
    department: 'IT',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNotification as jest.Mock).mockReturnValue({
      showSnackbar: mockShowSnackbar,
      showConfirmation: mockShowConfirmation,
    });
    (useApiClient as jest.Mock).mockReturnValue({
      post: mockApiClientPost,
      put: mockApiClientPut,
      get: mockApiClientGet,
    });
    (useProductApi as jest.Mock).mockReturnValue({
      getProducts: mockGetProducts,
    });

    // Default mock for getProducts to return some products
    mockGetProducts.mockResolvedValue([
      { id: 'prod1', name: 'Stylo', unit: 'unité', quantity: 50, cost: 1.0, reference: 'REF001', minStock: 10, categoryId: 'cat1' },
      { id: 'prod2', name: 'Cahier', unit: 'unité', quantity: 30, cost: 2.0, reference: 'REF002', minStock: 5, categoryId: 'cat1' },
    ]);
    // Default mock for apiClient.get('/requests/my-requests')
    mockApiClientGet.mockResolvedValue([]);
  });

  it('renders without crashing and displays "Créer une demande" section', async () => {
    await act(async () => {
      render(<ChefServiceDashboard user={mockUser} token="fake-token" />);
    });
    expect(screen.getByText(/Créer une demande/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Soumettre Demande/i })).toBeInTheDocument();
  });

  it('allows selecting products and submitting a request successfully', async () => {
    mockApiClientPost.mockResolvedValue({
      id: 'req1',
      requestNumber: 'COM-2023-001',
      status: 'TRANSMISE',
      requester: { name: mockUser.name },
      items: [],
      createdAt: new Date().toISOString(),
    });
    mockApiClientGet.mockResolvedValueOnce([]); // For initial request fetch

    await act(async () => {
      render(<ChefServiceDashboard user={mockUser} token="fake-token" />);
    });

    // Simulate selecting products and entering quantities
    const styloInput = screen.getByLabelText(/Stylo \(unité\)/i);
    fireEvent.change(styloInput, { target: { value: '5' } });

    const cahierInput = screen.getByLabelText(/Cahier \(unité\)/i);
    fireEvent.change(cahierInput, { target: { value: '3' } });

    // Submit the request
    fireEvent.click(screen.getByRole('button', { name: /Soumettre Demande/i }));

    await waitFor(() => {
      expect(mockApiClientPost).toHaveBeenCalledWith('/requests', {
        items: [
          { productId: 'prod1', requestedQty: 5 },
          { productId: 'prod2', requestedQty: 3 },
        ],
        requesterObservations: null,
      });
      expect(mockShowSnackbar).toHaveBeenCalledWith('Demande créée avec succès !', 'success');
      expect(mockApiClientGet).toHaveBeenCalledTimes(2); // Initial fetch and post-create fetch
    });
  });

  it('shows warning if no items are selected for a request', async () => {
    await act(async () => {
      render(<ChefServiceDashboard user={mockUser} token="fake-token" />);
    });

    fireEvent.click(screen.getByRole('button', { name: /Soumettre Demande/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith('Veuillez sélectionner au moins un article pour la demande.', 'warning');
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });

  it('allows adding requester observations', async () => {
    mockApiClientPost.mockResolvedValue({
      id: 'req2',
      requestNumber: 'COM-2023-002',
      status: 'TRANSMISE',
      requester: { name: mockUser.name },
      items: [],
      createdAt: new Date().toISOString(),
    });
    mockApiClientGet.mockResolvedValueOnce([]);

    await act(async () => {
      render(<ChefServiceDashboard user={mockUser} token="fake-token" />);
    });

    const styloInput = screen.getByLabelText(/Stylo \(unité\)/i);
    fireEvent.change(styloInput, { target: { value: '1' } });

    const observationsInput = screen.getByLabelText(/Observations \(optionnel\)/i);
    fireEvent.change(observationsInput, { target: { value: 'Urgent pour réunion lundi' } });

    fireEvent.click(screen.getByRole('button', { name: /Soumettre Demande/i }));

    await waitFor(() => {
      expect(mockApiClientPost).toHaveBeenCalledWith('/requests', {
        items: [{ productId: 'prod1', requestedQty: 1 }],
        requesterObservations: 'Urgent pour réunion lundi',
      });
      expect(mockShowSnackbar).toHaveBeenCalledWith('Demande créée avec succès !', 'success');
    });
  });
});
