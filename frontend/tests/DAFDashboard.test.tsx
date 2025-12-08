import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react'; // Added act, waitFor
import '@testing-library/jest-dom';
import DAFDashboard from '@/components/DAFDashboard'; // Adjust path if needed
import { UserRole } from '@/types/api'; // Import UserRole

// Mock necessary contexts and hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('@/context/NotificationContext', () => ({
  useNotification: () => ({ showSnackbar: jest.fn() }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    token: 'fake-token',
    user: { id: 'user1', email: 'daf@example.com', name: 'Test DAF', role: UserRole.DAF }, // Use UserRole enum
    logout: jest.fn(),
  }),
}));

jest.mock('@/api/client', () => ({
    useApiClient: () => ({
      get: jest.fn((endpoint) => {
        if (endpoint.includes('/requests/daf')) {
          return Promise.resolve([]); // Mock empty requests for simplicity
        }
        if (endpoint.includes('/products/stock-adjustments/pending')) {
          return Promise.resolve([]); // Mock empty adjustments
        }
        if (endpoint.includes('/products/stock-receipts/pending')) {
          return Promise.resolve([]); // Mock empty receipts
        }
        return Promise.resolve([]);
      }),
      post: jest.fn(() => Promise.resolve({})),
      put: jest.fn(() => Promise.resolve({})),
      delete: jest.fn(() => Promise.resolve({})),
    }),
  }));

describe('DAFDashboard', () => {
  it('renders without crashing when user is DAF', async () => { // Made async
    await act(async () => { // Wrapped in act
      render(<DAFDashboard user={{ id: 'user1', email: 'daf@example.com', name: 'Test DAF', role: UserRole.DAF }} token="fake-token" />);
    });
    expect(screen.getByText(/DAF - Demandes en attente et en litige/i)).toBeInTheDocument();
  });

  it('renders skeleton loaders when user is null', async () => { // Made async
    await act(async () => { // Wrapped in act
      render(<DAFDashboard user={null} token={null} />);
    });
    // Now assert using the class name or specific data-testid if available
    // Material-UI Skeleton uses the class `MuiSkeleton-root`
    await waitFor(() => {
        expect(screen.getAllByRole('generic', {name: ''}).filter(el => el.classList.contains('MuiSkeleton-root'))
            .length).toBeGreaterThan(0);
    });
  });
});

