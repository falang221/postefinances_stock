'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField } from '@mui/material'; // Added TextField

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

interface NotificationContextType {
  showSnackbar: (message: string, severity?: SnackbarSeverity) => void;
  showConfirmation: (title: string, message: string, onConfirm: (inputValue?: string) => void, requiresInput?: boolean, inputLabel?: string) => void; // Updated signature
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<SnackbarSeverity>('info');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<((inputValue?: string) => void)>(() => {}); // Updated callback signature
  const [requiresInput, setRequiresInput] = useState(false); // New state
  const [dialogInputValue, setDialogInputValue] = useState(''); // New state
  const [dialogInputLabel, setDialogInputLabel] = useState(''); // New state

  const showSnackbar = useCallback((message: string, severity: SnackbarSeverity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []); // Dependencies array is empty as setters are stable

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []); // Setter is stable

  const showConfirmation = useCallback((title: string, message: string, onConfirm: (inputValue?: string) => void, requiresInput: boolean = false, inputLabel: string = 'Commentaire') => {
    setDialogTitle(title);
    setDialogMessage(message);
    // Wrap onConfirm to ensure it always calls the latest version of `onConfirm`
    setOnConfirmAction(() => (val: string | undefined) => onConfirm(val)); 
    setRequiresInput(requiresInput);
    setDialogInputValue('');
    setDialogInputLabel(inputLabel);
    setDialogOpen(true);
  }, []); // All setters (setDialogTitle etc.) are stable

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setDialogInputValue('');
  }, []); // Setters are stable

  const handleDialogConfirm = useCallback(() => {
    onConfirmAction(requiresInput ? dialogInputValue : undefined);
    setDialogOpen(false);
    setDialogInputValue('');
  }, [onConfirmAction, requiresInput, dialogInputValue]); // Dependencies for useCallback

  const value = useMemo(() => ({ showSnackbar, showConfirmation }), [showSnackbar, showConfirmation]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Typography>{dialogMessage}</Typography>
          {requiresInput && ( // Conditionally render TextField
            <TextField
              autoFocus
              margin="dense"
              id="dialog-input"
              label={dialogInputLabel}
              type="text"
              fullWidth
              variant="standard"
              value={dialogInputValue}
              onChange={(e) => setDialogInputValue(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Annuler</Button>
          <Button onClick={handleDialogConfirm} autoFocus>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </NotificationContext.Provider>
  );
};
