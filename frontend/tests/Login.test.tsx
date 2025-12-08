// frontend/tests/Login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '@/components/Login'; // Adjust path if needed
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/api/client';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';

// Mock necessary contexts and hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/api/client', () => ({
    useApiClient: jest.fn(),
}));

jest.mock('@/context/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

describe('Login Component', () => {
  const mockLogin = jest.fn();
  const mockShowSnackbar = jest.fn();
  const mockPush = jest.fn();
  const mockApiClientPost = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock implementations
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
    });
    (useNotification as jest.Mock).mockReturnValue({
      showSnackbar: mockShowSnackbar,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useApiClient as jest.Mock).mockReturnValue({
        post: mockApiClientPost,
    });
  });

  it('renders login form elements', () => {
    render(<Login />);
    expect(screen.getByLabelText(/Adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Se connecter/i })).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    mockApiClientPost.mockResolvedValueOnce({ access_token: 'fake_jwt_token' });
    
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Mot de passe/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => {
      expect(mockApiClientPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockLogin).toHaveBeenCalledWith('fake_jwt_token');
      expect(mockShowSnackbar).toHaveBeenCalledWith('Connexion réussie !', 'success');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles failed login due to incorrect credentials', async () => {
    mockApiClientPost.mockRejectedValueOnce(new Error('Incorrect email or password'));

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Mot de passe/i), {
      target: { value: 'wrongpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => {
      expect(mockApiClientPost).toHaveBeenCalled();
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockShowSnackbar).toHaveBeenCalledWith('Échec de la connexion: Incorrect email or password', 'error');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('shows error messages for invalid email format', async () => {
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText(/Veuillez entrer une adresse e-mail valide./i)).toBeInTheDocument();
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });

  it('shows error messages for empty password', async () => {
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/Adresse e-mail/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText(/Le mot de passe est requis./i)).toBeInTheDocument();
      expect(mockApiClientPost).not.toHaveBeenCalled();
    });
  });
});
