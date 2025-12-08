// frontend/src/theme.ts
'use client';

import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  typography: {
    fontFamily: roboto.style.fontFamily,
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
