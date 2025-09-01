import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  useTheme,
  useMediaQuery,
  Box
} from '@mui/material';

interface ResponsiveTableProps {
  headers: string[];
  rows: any[][];
  renderRow?: (row: any[], index: number) => React.ReactNode;
  maxHeight?: string | number;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ 
  headers, 
  rows, 
  renderRow,
  maxHeight = '400px'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile) {
    // Mobile card view
    return (
      <Box sx={{ maxHeight, overflow: 'auto' }}>
        {rows.map((row, index) => (
          <Paper key={index} sx={{ p: 2, mb: 1 }}>
            {headers.map((header, headerIndex) => (
              <Box key={headerIndex} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{header}:</Box>
                <Box sx={{ fontSize: '0.875rem' }}>{row[headerIndex]}</Box>
              </Box>
            ))}
          </Paper>
        ))}
      </Box>
    );
  }

  // Desktop table view
  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight,
        '&::-webkit-scrollbar': { width: 6, height: 6 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 3 }
      }}
    >
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {headers.map((header, index) => (
              <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            renderRow ? renderRow(row, index) : (
              <TableRow key={index}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            )
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResponsiveTable;