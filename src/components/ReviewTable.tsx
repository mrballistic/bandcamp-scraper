'use client';

import React from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PurchaseRow } from '../types/bandcamp';
import { Box, Chip, Link, ChipProps } from '@mui/material';


interface ReviewTableProps {
  rows: PurchaseRow[];
  loading?: boolean;
}

export default function ReviewTable({ rows, loading }: ReviewTableProps) {
  const columns: GridColDef<PurchaseRow>[] = [
    {
      field: 'artUrl',
      headerName: 'Art',
      width: 60,
      renderCell: (params: GridRenderCellParams<PurchaseRow>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {params.value && params.value !== '/no-art.png' ? (
            <img
              src={params.value as string}
              alt="Cover"
              style={{ width: 40, height: 40, borderRadius: 4 }}
            />
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
    <Box sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.purchaseKey}
        loading={loading}
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 50 },
          },
        }}
        disableRowSelectionOnClick
      />
    </Box>
  );
}
