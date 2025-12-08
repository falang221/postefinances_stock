'use client';

import React, { useState } from 'react'; // Added useState
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '@/context/AuthContext'; // New import
import { useApiClient } from '@/api/client'; // New import
import { Container, Box, Typography, TextField, Button, Alert, Paper, CircularProgress } from '@mui/material'; // Added Paper, CircularProgress
import Image from 'next/image'; // New import

// Define the structure of the JWT payload
interface JwtPayload {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: 'CHEF_SERVICE' | 'MAGASINIER' | 'DAF' | 'ADMIN' | 'SUPER_OBSERVATEUR';
  department?: string;
  exp: number;
}

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'; // No longer needed here

function Login() {
  const [username, setUsername] = useState<string>('chef.service');
  const [password, setPassword] = useState<string>('password');
  const [error, setError] = useState<string | null>(null); // Keep local error for now, apiClient handles snackbar
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const { login: authLogin } = useAuth(); // Use login function from AuthContext
  const apiClient = useApiClient(); // Initialize API client

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      const data = await apiClient.post<{ access_token: string }>('/auth/login', { username, password });

      const { access_token } = data;
      authLogin(access_token); // Use auth context login

      // Decode the token to get user role
      const decodedToken = jwtDecode<JwtPayload>(access_token);
      const userRole = decodedToken.role;

      // Redirect based on role
      switch (userRole) {
        case 'CHEF_SERVICE':
          router.push('/dashboard/chef-service');
          break;
        case 'MAGASINIER':
          router.push('/dashboard/magasinier');
          break;
        case 'DAF':
          router.push('/dashboard/daf');
          break;
        case 'ADMIN':
            router.push('/dashboard/admin');
            break;
        default:
          router.push('/dashboard'); // Fallback dashboard
      }

    } catch (err) {
      // apiClient already shows snackbar, just set local error for form if needed
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage); // Still set local error for form display
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 4,
          boxShadow: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Image
          src="/Logo_PF.jpeg"
          alt="Postefinances Logo"
          width={150} // Adjust width as needed
          height={150} // Adjust height as needed, maintain aspect ratio
          style={{ marginBottom: '10px', objectFit: 'contain' }} // Adjusted margin
        />
        <Typography component="h2" variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
          Plateforme Inventaire Postefinances
        </Typography>
        <Typography component="h1" variant="h5" sx={{ mb: 3, color: 'primary.main' }}>
          Connexion
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Nom d'utilisateur"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={e => setUsername(e.target.value)}
            variant="outlined"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Mot de passe"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            variant="outlined"
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Se connecter'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;