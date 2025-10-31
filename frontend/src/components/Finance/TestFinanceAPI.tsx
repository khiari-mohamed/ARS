import React, { useState } from 'react';
import { Button, Box, Typography, Paper } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const TestFinanceAPI: React.FC = () => {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🧪 Testing API for user:', user?.role, user?.id);
      console.log('🔑 JWT Token:', token);
      
      const response = await fetch('/api/finance/bordereaux-traites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response:', data);
      setResult(data);
    } catch (error) {
      console.error('❌ API Error:', error);
      setResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>🧪 Test Finance API</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        User: {user?.role} ({user?.id?.substring(0, 8)}...)
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={testAPI} 
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'Testing...' : 'Test API Call'}
      </Button>
      
      {result && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Result:</Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Box>
      )}
    </Paper>
  );
};

export default TestFinanceAPI;