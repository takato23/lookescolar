// Theme updates for gallery interface
// @ts-nocheck
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000000', // Black for "Todas" filter
    },
    secondary: {
      main: '#E879F9', // Purple for category filters
    },
    // Category colors for filter pills
    category1: {
      main: '#E879F9', // Purple/Pink
    },
    category2: {
      main: '#FB7185', // Rose/Pink
    },
    category3: {
      main: '#FBBF24', // Amber/Orange
    },
    category4: {
      main: '#34D399', // Emerald/Green
    },
    category5: {
      main: '#60A5FA', // Blue
    },
    category6: {
      main: '#A78BFA', // Violet/Purple
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    }
  },
  typography: {
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      color: '#000000',
    },
    body2: {
      fontSize: '0.875rem',
      color: '#666666',
    }
  },
  shape: {
    borderRadius: 20, // Rounded filter pills
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          fontWeight: 500,
          '&.MuiChip-filled': {
            color: 'white',
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }
      }
    }
  }
});

export default theme;
