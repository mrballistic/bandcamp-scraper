'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  LinearProgress,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Eye, EyeOff, Play, Trash2 } from 'lucide-react';
import { ScrapeProgress } from '../types/bandcamp';

interface ScrapeControlsProps {
  onStart: (cookie: string) => void;
  onReset: () => void;
  progress: ScrapeProgress;
}

export default function ScrapeControls({ onStart, onReset, progress }: ScrapeControlsProps) {
  const [cookie, setCookie] = useState('');
  const [showCookie, setShowCookie] = useState(false);

  const handleStart = () => {
    if (cookie.trim()) {
      onStart(cookie.trim());
    }
  };

  const isScraping = progress.status === 'scraping';

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Configuration
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
        <TextField
          fullWidth
          label="Bandcamp Identity Cookie"
          variant="outlined"
          type={showCookie ? 'text' : 'password'}
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          disabled={isScraping}
          placeholder="Enter the 'identity' cookie value from bandcamp.com"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowCookie(!showCookie)} edge="end">
                  {showCookie ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          helperText="Your cookie is never stored. It's only used to proxy requests to Bandcamp."
        />
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={async () => {
              if (!cookie.trim()) return;
              try {
                const res = await fetch('/api/bandcamp/collection-summary', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ identityCookie: cookie.trim() }),
                });
                const data = await res.json();
                if (res.ok) {
                  alert(`Success! Logged in as ${data.name || data.username} (${data.collectionCount} items)`);
                } else {
                  alert(`Auth failed: ${data.error}`);
                }
              } catch {
                alert('Connection error during auth test');
              }
            }}
            disabled={isScraping || !cookie}
            sx={{ height: 56 }}
          >
            Test Auth
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<Play size={20} />}
            onClick={handleStart}
            disabled={isScraping || !cookie}
            sx={{ height: 56, px: 4 }}
          >
            {isScraping ? 'Scraping...' : 'Scrape'}
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Trash2 size={20} />}
            onClick={() => {
              setCookie('');
              onReset();
            }}
            disabled={isScraping}
            sx={{ height: 56 }}
          >
            Reset
          </Button>
        </Box>
      </Box>

      {isScraping && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Fetched {progress.itemsFetched} items from {progress.pagesFetched} pages...
            </Typography>
          </Box>
          <LinearProgress variant="indeterminate" />
        </Box>
      )}

      {progress.status === 'completed' && (
        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
          Successfully fetched {progress.itemsFetched} purchases!
        </Typography>
      )}

      {progress.status === 'error' && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          Error: {progress.error}
        </Typography>
      )}
    </Paper>
  );
}
