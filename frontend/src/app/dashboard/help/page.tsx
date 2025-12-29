'use client';

import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const HelpPage = () => {
  const { user } = useAuth();
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchManual = async () => {
      setLoading(true);
      setError(null);
      try {
        const role = user.role.toLowerCase(); // e.g., "admin", "chef_service"
        const filePath = `/manuals/manuel_${role}.md`;
        const response = await fetch(filePath);
        
        if (!response.ok) {
          throw new Error(`Failed to load manual for role ${user.role}: ${response.statusText}`);
        }
        const text = await response.text();
        setMarkdown(text);
      } catch (err: any) {
        console.error("Error fetching manual:", err);
        setError(err.message || "Impossible de charger le manuel de procédure.");
        setMarkdown("## Erreur de chargement\nImpossible de charger le manuel de procédure pour votre rôle. Veuillez contacter l'administrateur.");
      } finally {
        setLoading(false);
      }
    };

    fetchManual();
  }, [user]);

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">Vous devez être connecté pour voir cette page.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Chargement du manuel...</Typography>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <HelpOutlineIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
          <Typography variant="h4" component="h1">
            Manuel de Procédure - {user.role.replace('_', ' ')}
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Bienvenue dans le centre d'aide. Voici les procédures standard pour votre rôle.
        </Typography>

        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </Paper>
    </Container>
  );
};

export default HelpPage;
