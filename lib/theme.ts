import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5', 
      dark: '#1565c0'
    },
    secondary: {
      main: '#dc004e',
      light: '#f48fb1',
      dark: '#c51162'
    },
    background: {
      default: '#ffffff',
      paper: '#f8f9fa'
    },
    text: {
      primary: '#212529',
      secondary: '#6c757d'
    },
    grey: {
      50: '#f8f9fa',
      100: '#e9ecef', 
      200: '#dee2e6',
      300: '#ced4da',
      400: '#adb5bd',
      500: '#6c757d',
      600: '#495057',
      700: '#343a40',
      800: '#212529',
      900: '#000000'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700
    },
    h2: {
      fontSize: '2rem', 
      fontWeight: 600
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5
    }
  },
  shape: {
    borderRadius: 12
  }
});

export default theme;