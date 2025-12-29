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

/**
 * Props accepted by the scraper control panel. The callbacks are provided by
 * the scraping hook and orchestrate the end-to-end flow.
 */
interface ScrapeControlsProps {
  onStart: (cookie: string, manualSlug?: string) => void;
  onReset: () => void;
  progress: ScrapeProgress;
}

/**
 * Input and action panel that collects the Bandcamp cookie, offers guidance on
 * how to find it, and kicks off or resets scraping. Also renders inline status
 * indicators while scraping is in progress.
 *
 * @param onStart - Invoked with the sanitized cookie when the user hits "Scrape".
 * @param onReset - Clears current data and any persisted storage.
 * @param progress - Current scraper progress state for disabling controls and showing feedback.
 */
export default function ScrapeControls({ onStart, onReset, progress }: ScrapeControlsProps) {
  const [cookie, setCookie] = useState('');
  const [usernameSlug, setUsernameSlug] = useState('');
  const [showCookie, setShowCookie] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsSnippet = `(() => { const c = document.cookie.split('; ').find(r => r.startsWith('identity=')); if (c) { copy(c.split('=')[1]); console.log('✅ Identity cookie copied!'); } else { console.error('❌ Cookie not found! Are you logged in to Bandcamp?'); } })();`;

  /**
   * Copies the helper JavaScript snippet to the clipboard and flashes a visual
   * confirmation. Used by the help dialog to speed up cookie extraction.
   */
  const copySnippet = () => {
    navigator.clipboard.writeText(jsSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Normalizes the cookie string entered by the user into the format expected
   * by the backend endpoints, attempting to salvage identity/session parts from
   * varied formats (raw header, copied table row, or JSON). Passes the cleaned
   * value to the `onStart` callback to initiate scraping.
   */
  const handleStart = () => {
    let cleanCookie = cookie.trim();
    
    // If it's a raw cookie header (name1=val1; name2=val2), keep it as is
    if (cleanCookie.includes('=') && cleanCookie.includes(';')) {
      // Just pass the whole thing
    } else {
      // Search the entire string for identity and session components
      const identityMatch = cleanCookie.match(/identity\t([^\t\n\r]+)/i) || cleanCookie.match(/identity=([^;]+)/i);
      const sessionMatch = cleanCookie.match(/session\t([^\t\n\r]+)/i) || cleanCookie.match(/session=([^;]+)/i);
      
      let finalCookie = '';
      if (identityMatch) {
        finalCookie += `identity=${identityMatch[1].trim()}; `;
      }
      if (sessionMatch) {
        finalCookie += `session=${sessionMatch[1].trim()}; `;
      }

      // If we found specific parts, use them. Otherwise, fall back to the original logic
      if (finalCookie) {
        cleanCookie = finalCookie.trim();
      } else {
        // ... existing split logic for single row ...
        const parts = cleanCookie.split('\t');
        if (parts.length > 2) {
          const valueIndex = parts.findIndex(p => p.includes('%7B%22id%22') || p.includes('{"id"'));
          if (valueIndex !== -1) cleanCookie = parts[valueIndex];
        }
      }
    }

    if (cleanCookie) {
      console.log('Final cookie string length:', cleanCookie.length);
      onStart(cleanCookie, usernameSlug.trim());
    }
  };

  const isScraping = progress.status === 'scraping';

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Configuration
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', mb: 2 }}>
        <TextField
          sx={{ flex: '2 1 300px' }}
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

        <TextField
          sx={{ flex: '1 1 150px' }}
          label="Username (Slug)"
          variant="outlined"
          value={usernameSlug}
          onChange={(e) => setUsernameSlug(e.target.value)}
          disabled={isScraping}
          placeholder="e.g. mrballistic"
          helperText="Optional: Speed up scrape by skipping auto-discovery"
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
