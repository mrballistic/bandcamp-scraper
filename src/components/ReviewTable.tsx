'use client';

import React from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PurchaseRow } from '../types/bandcamp';
import { 
  Box, 
  Chip, 
  Link, 
  ChipProps, 
  FormControlLabel, 
  Switch, 
  Stack, 
  Paper, 
  Drawer, 
  Typography, 
  IconButton, 
  Divider,
  Button
} from '@mui/material';
import Image from 'next/image';
import { X, ExternalLink } from 'lucide-react';


interface ReviewTableProps {
  rows: PurchaseRow[];
  loading?: boolean;
}

export default function ReviewTable({ rows, loading }: ReviewTableProps) {
  const [showOnlyUnreleased, setShowOnlyUnreleased] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<PurchaseRow | null>(null);

  const filteredRows = React.useMemo(() => {
    if (!showOnlyUnreleased) return rows;
    return rows.filter(row => row.isPreorder && row.preorderStatus === 'unreleased');
  }, [rows, showOnlyUnreleased]);

  const columns: GridColDef<PurchaseRow>[] = [
    {
      field: 'artUrl',
      headerName: 'Art',
      width: 60,
      renderCell: (params: GridRenderCellParams<PurchaseRow>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {params.value && params.value !== '/no-art.png' ? (
            <Box sx={{ position: 'relative', width: 40, height: 40, overflow: 'hidden', borderRadius: 1 }}>
              <Image
                src={params.value as string}
                alt="Cover"
                fill
                style={{ objectFit: 'cover' }}
                sizes="40px"
                unoptimized
              />
            </Box>
          ) : (
             <Box sx={{ width: 40, height: 40, bgcolor: 'grey.800', borderRadius: 4 }} />
          )}
        </Box>
      ),
      sortable: false,
      filterable: false,
    },
    { field: 'artist', headerName: 'Artist', width: 200 },
    { field: 'title', headerName: 'Title', width: 250 },
    {
      field: 'itemType',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    { field: 'purchaseDate', headerName: 'Purchase Date', width: 150 },
    {
      field: 'preorderStatus',
      headerName: 'Preorder',
      width: 130,
      renderCell: (params) => {
        const isPreorder = (params.row as PurchaseRow).isPreorder;
        if (!isPreorder) return null;
        
        const status = params.value as string;
        const color: ChipProps['color'] = status === 'unreleased' ? 'warning' : 'success';
        
        return (
          <Chip 
            label={status} 
            size="small" 
            color={color} 
            variant="filled"
          />
        );
      },
    },
    {
      field: 'itemUrl',
      headerName: 'Link',
      width: 100,
      renderCell: (params) => (
        <Link href={params.value as string} target="_blank" rel="noopener">
          View
        </Link>
      ),
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <FormControlLabel
            control={
              <Switch 
                checked={showOnlyUnreleased} 
                onChange={(e) => setShowOnlyUnreleased(e.target.checked)} 
                color="warning"
              />
            }
            label="Show only unreleased preorders"
          />
          <Box>
            {showOnlyUnreleased && (
              <Chip 
                label={`${filteredRows.length} preorders found`} 
                color="warning" 
                size="small" 
                variant="outlined" 
              />
            )}
          </Box>
        </Stack>
      </Paper>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.purchaseKey}
          loading={loading}
          pageSizeOptions={[25, 50, 100]}
          onRowClick={(params) => setSelectedRow(params.row)}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 50 },
            },
          }}
          sx={{ cursor: 'pointer' }}
          disableRowSelectionOnClick
        />
      </Box>

      <Drawer
        anchor="right"
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 }, p: 3 }
        }}
      >
        {selectedRow && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Item Details</Typography>
              <IconButton onClick={() => setSelectedRow(null)}>
                <X size={20} />
              </IconButton>
            </Box>

            <Box sx={{ position: 'relative', width: '100%', pt: '100%', mb: 3, borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <Image
                src={selectedRow.artUrl.replace('_10.jpg', '_16.jpg')}
                alt={selectedRow.title}
                fill
                style={{ objectFit: 'cover' }}
                sizes="400px"
                unoptimized
              />
            </Box>

            <Typography variant="h5" gutterBottom fontWeight="bold">
              {selectedRow.title}
            </Typography>
            <Typography variant="h6" color="primary" gutterBottom>
              {selectedRow.artist}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 3 }}>
              <Chip label={selectedRow.itemType} variant="outlined" />
              {selectedRow.isPreorder && (
                <Chip 
                  label={`Preorder: ${selectedRow.preorderStatus}`} 
                  color={selectedRow.preorderStatus === 'unreleased' ? 'warning' : 'success'} 
                />
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="textSecondary" display="block">PURCHASE DATE</Typography>
                <Typography variant="body1">{selectedRow.purchaseDate || 'Unknown'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" display="block">ITEM ID</Typography>
                <Typography variant="body1">{selectedRow.itemId}</Typography>
              </Box>
              <Button 
                variant="contained" 
                fullWidth 
                href={selectedRow.itemUrl} 
                target="_blank" 
                startIcon={<ExternalLink size={18} />}
                sx={{ mt: 2 }}
              >
                View on Bandcamp
              </Button>
            </Stack>

            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>Raw Metadata</Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 1.5, 
                  bgcolor: 'background.default', 
                  maxHeight: 200, 
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}
              >
                <pre>{JSON.stringify(selectedRow.rawItem, null, 2)}</pre>
              </Paper>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
