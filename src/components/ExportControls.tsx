'use client';

import React from 'react';
import { Box, Button, ButtonGroup, Typography } from '@mui/material';
import { FileJson, FileSpreadsheet } from 'lucide-react';
import { PurchaseRow } from '../types/bandcamp';

interface ExportControlsProps {
  rows: PurchaseRow[];
  disabled?: boolean;
}

export default function ExportControls({ rows, disabled }: ExportControlsProps) {
  
  const exportToCSV = () => {
    if (rows.length === 0) return;

    const headers = [
      'Artist',
      'Title',
      'Type',
      'Purchase Date',
      'Preorder Status',
      'Item URL',
      'Art URL'
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => [
        `"${row.artist.replace(/"/g, '""')}"`,
        `"${row.title.replace(/"/g, '""')}"`,
        row.itemType,
        row.purchaseDate || '',
        row.preorderStatus,
        row.itemUrl,
        row.artUrl
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bandcamp-purchases-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (rows.length === 0) return;

    const data = {
      exportedAt: new Date().toISOString(),
      count: rows.length,
      purchases: rows
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bandcamp-purchases-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="body2" color="textSecondary">
        {rows.length} items ready for export
      </Typography>
      <ButtonGroup variant="outlined" disabled={disabled || rows.length === 0}>
        <Button 
          startIcon={<FileSpreadsheet size={18} />}
          onClick={exportToCSV}
        >
          CSV
        </Button>
        <Button 
          startIcon={<FileJson size={18} />}
          onClick={exportToJSON}
        >
          JSON
        </Button>
      </ButtonGroup>
    </Box>
  );
}
