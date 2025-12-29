'use client';

import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Divider, 
  Stack 
} from '@mui/material';
import { useBandcampScraper } from '../hooks/useBandcampScraper';
import ScrapeControls from '../components/ScrapeControls';
import ReviewTable from '../components/ReviewTable';
import ExportControls from '../components/ExportControls';
import { Music } from 'lucide-react';

export default function Home() {
  const { rows, progress, startScrape, reset } = useBandcampScraper();

  const isScraping = progress.status === 'scraping';
  const hasData = rows.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
          <Music size={40} color="#1da1f2" />
          <Typography variant="h3" component="h1" fontWeight="bold">
            Bandcamp Purchases Exporter
          </Typography>
        </Stack>
        <Typography variant="h6" color="textSecondary">
          Export your collection to CSV or JSON with preorder detection
        </Typography>
      </Box>

      <ScrapeControls 
        onStart={startScrape} 
        onReset={reset}
        progress={progress} 
      />

      {(hasData || isScraping) && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="h5">
              Review Collection
            </Typography>
            <ExportControls rows={rows} disabled={isScraping} />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <ReviewTable rows={rows} loading={isScraping} />
        </Box>
      )}
    </Container>
  );
}
