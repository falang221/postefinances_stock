// frontend/src/theme.ts
'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  palette: {
    primary: {
      main: '#0056b3', // Postefinances Deep Blue
    },
    secondary: {
      main: '#1976D2', // Postefinances Lighter Blue
    },
    error: {
      main: '#F44336', // Red for errors
    },
    background: {
      default: '#F5F5F5', // Light grey background
      paper: '#FFFFFF', // White for cards and surfaces
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Keep button text as is
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined', // Default to outlined text fields
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Rounded corners for alerts
        },
      },
    },
  },
});

export default theme;
