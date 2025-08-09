import React, { useState } from 'react';
import { Paper, Typography, Button, Stack, Alert, Box } from '@mui/material';

const FinanceTestPanel: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    setTestResults([]);
    const results: string[] = [];

    try {
      // Test Donneurs endpoint
      const { getDonneurs } = await import('../../services/financeService');
      const donneurs = await getDonneurs();
      results.push(`✅ Donneurs loaded: ${donneurs.length} items`);
    } catch (error) {
      results.push(`❌ Donneurs failed: ${error}`);
    }

    try {
      // Test Adherents endpoint
      const { getAdherents } = await import('../../services/financeService');
      const adherents = await getAdherents();
      results.push(`✅ Adherents loaded: ${adherents.length} items`);
    } catch (error) {
      results.push(`❌ Adherents failed: ${error}`);
    }

    try {
      // Test OV Tracking endpoint
      const { getOVTracking } = await import('../../services/financeService');
      const tracking = await getOVTracking();
      results.push(`✅ OV Tracking loaded: ${tracking.length} items`);
    } catch (error) {
      results.push(`❌ OV Tracking failed: ${error}`);
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Finance Module API Test
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={runTests} 
        disabled={testing}
        sx={{ mb: 2 }}
      >
        {testing ? 'Testing...' : 'Run API Tests'}
      </Button>

      {testResults.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Test Results:</Typography>
          <Stack spacing={1}>
            {testResults.map((result, index) => (
              <Alert 
                key={index} 
                severity={result.startsWith('✅') ? 'success' : 'error'}
                sx={{ fontSize: '0.875rem' }}
              >
                {result}
              </Alert>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default FinanceTestPanel;