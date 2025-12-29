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
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link as MuiLink,
  Tooltip,
  Divider
} from '@mui/material';
import { Eye, EyeOff, Play, Trash2, HelpCircle, Copy, Check } from 'lucide-react';
import { ScrapeProgress } from '../types/bandcamp';

interface ScrapeControlsProps {
  onStart: (cookie: string) => void;
  onReset: () => void;
  progress: ScrapeProgress;
}

export default function ScrapeControls({ onStart, onReset, progress }: ScrapeControlsProps) {
  const [cookie, setCookie] = useState('');
  const [showCookie, setShowCookie] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsSnippet = `(() => { const c = document.cookie.split('; ').find(r => r.startsWith('identity=')); if (c) { copy(c.split('=')[1]); console.log('✅ Identity cookie copied!'); } else { console.error('❌ Cookie not found! Are you logged in to Bandcamp?'); } })();`;

  const copySnippet = () => {
    navigator.clipboard.writeText(jsSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    let cleanCookie = cookie.trim();
    
    // Attempt to split by common DevTools separators (tabs)
    const parts = cleanCookie.split('\t');
    
    if (parts.length > 2) {
      // If 'identity' is at index 0, index 1 is usually the value
      if (parts[0].toLowerCase() === 'identity') {
        cleanCookie = parts[1];
      } else {
        // Look for the part that contains the JSON metadata (id, ex) which signals the value column
        const valueIndex = parts.findIndex(p => p.includes('%7B%22id%22') || p.includes('{"id"'));
        if (valueIndex !== -1) {
          cleanCookie = parts[valueIndex];
        }
      }
    } 
    // Handle 'identity=...' format
    else if (cleanCookie.toLowerCase().includes('identity=')) {
      cleanCookie = cleanCookie.split('identity=')[1].split(';')[0].trim();
    }

    if (cleanCookie) {
      console.log('Sending cookie length:', cleanCookie.length);
      onStart(cleanCookie);
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
                <IconButton onClick={() => setShowCookie(!showCookie)} edge="end" title={showCookie ? "Hide cookie" : "Show cookie"}>
                  {showCookie ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
                <IconButton onClick={() => setShowHelp(true)} edge="end" color="primary" title="How to find your cookie">
                  <HelpCircle size={20} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          helperText={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Your cookie is never stored. 
              <MuiLink component="button" variant="caption" onClick={() => setShowHelp(true)} sx={{ ml: 1 }}>
                Need help finding it?
              </MuiLink>
            </Box>
          }
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
      <Dialog open={showHelp} onClose={() => setShowHelp(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpCircle color="#1da1f2" />
          How to find your Identity Cookie
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph color="textSecondary">
            To scrape your collection, we need your Bandcamp session cookie. This stays in your browser and is only used to fetch your purchase list.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">Option 1: The Manual Way (Most Reliable)</Typography>
            <Typography variant="body2" component="div">
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>Open <MuiLink href="https://bandcamp.com" target="_blank" rel="noopener">bandcamp.com</MuiLink> and log in.</li>
                <li>Right-click and select <strong>Inspect</strong> (or press F12).</li>
                <li>Go to the <strong>Application</strong> tab (Chrome/Edge) or <strong>Storage</strong> tab (Firefox).</li>
                <li>In the sidebar, select <strong>Cookies</strong> &gt; <code>https://bandcamp.com</code>.</li>
                <li>Find <code>identity</code> in the list and copy its <strong>Value</strong>.</li>
              </ol>
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">Option 2: The Console Way (Experimental)</Typography>
            <Typography variant="body2" paragraph color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              Note: This may not work if your browser blocks JavaScript from reading session cookies (HttpOnly).
            </Typography>
            <Typography variant="body2" paragraph>
              Paste this in the <strong>Console</strong> tab and press Enter:
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 1.5, 
                bgcolor: 'grey.900', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 1 }}>
                {jsSnippet}
              </Box>
              <Tooltip title={copied ? "Copied!" : "Copy code"}>
                <IconButton size="small" onClick={copySnippet}>
                  {copied ? <Check size={18} color="green" /> : <Copy size={18} />}
                </IconButton>
              </Tooltip>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelp(false)} color="primary">Got it</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
