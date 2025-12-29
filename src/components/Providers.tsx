'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode } from 'react';

/**
 * Central theme configuration for the app. Uses a dark palette tuned for
 * Bandcamp-inspired blues and neutrals.
 */
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1da1f2',
    },
    secondary: {
      main: '#657786',
    },
  },
});

/**
 * Wraps the application in Next.js/MUI providers so that style caching and
 * theming work correctly across server and client renders.
 *
 * @param children - React subtree to render within the configured providers.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
