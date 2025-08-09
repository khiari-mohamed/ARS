import React, { useState, useEffect } from 'react';
import { Contract } from '../../types/contract.d';
import { 
  Box, Paper, Grid, Tabs, Tab, useTheme, useMediaQuery,
  Snackbar, Alert, Button
} from '@mui/material';
import ContractProfileHeader from './ContractProfileHeader';
import ContractQuickActions from './ContractQuickActions';
import ContractSLASection from './ContractSLASection';
import ContractBordereauxTab from './ContractTabs/BordereauxTab';
import ContractClaimsTab from './ContractTabs/ClaimsTab';
import ContractDocumentsTab from './ContractTabs/DocumentsTab';
import ContractStatisticsTab from './ContractTabs/StatisticsTab';
import ContractMobileView from './ContractMobileView';
import { ContractService } from '../../api/ContractService';

interface Props {
  contract: Contract;
}

const ContractDetail: React.FC<Props> = ({ contract }) => {
  const [tab, setTab] = useState(0);
  const [currentContract, setCurrentContract] = useState<Contract>(contract);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'}>({
    open: false, message: '', severity: 'success'
  });
  const [statistics, setStatistics] = useState<any>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await ContractService.getStatistics();
        setStatistics(stats);
      } catch (error) {
        console.error('Failed to load statistics:', error);
      }
    };
    loadStats();
  }, [currentContract.id]);

  const handleContractUpdate = async () => {
    try {
      const updated = await ContractService.getById(currentContract.id);
      setCurrentContract(updated);
      setSnackbar({open: true, message: 'Contrat mis à jour', severity: 'success'});
    } catch (error) {
      setSnackbar({open: true, message: 'Erreur lors de la mise à jour', severity: 'error'});
    }
  };

  const getContractStatus = () => {
    const now = new Date();
    const start = new Date(currentContract.startDate);
    const end = new Date(currentContract.endDate);
    
    if (now < start) return 'future';
    if (now > end) return 'expired';
    return 'active';
  };

  return (
    <Box>
      {/* Mobile View */}
      {isMobile && (
        <ContractMobileView 
          contract={currentContract}
          onTabChange={setTab}
          statistics={statistics}
        />
      )}
      
      {/* Desktop View */}
      {!isMobile && (
        <>
          <ContractProfileHeader 
            contract={currentContract} 
            status={getContractStatus()}
            statistics={statistics}
          />
          
          <Grid container spacing={3}>
            <Grid item xs={12} lg={9}>
              <Paper elevation={2} sx={{ p: 3 }}>
                {/* SLA Parameters Section */}
                <ContractSLASection 
                  contract={currentContract}
                  onUpdate={handleContractUpdate}
                />
                
                {/* Tabs */}
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  sx={{ mb: 2, mt: 3 }}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="Bordereaux" />
                  <Tab label="Réclamations" />
                  <Tab label="Documents" />
                  <Tab label="Statistiques" />
                </Tabs>
                
                <Box>
                  {tab === 0 && <ContractBordereauxTab contractId={currentContract.id} />}
                  {tab === 1 && <ContractClaimsTab contractId={currentContract.id} />}
                  {tab === 2 && <ContractDocumentsTab contract={currentContract} onUpdate={handleContractUpdate} />}
                  {tab === 3 && <ContractStatisticsTab contractId={currentContract.id} />}
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} lg={3}>
              <ContractQuickActions 
                contract={currentContract}
                onUpdate={handleContractUpdate}
              />
            </Grid>
          </Grid>
        </>
      )}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({...s, open: false}))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractDetail;