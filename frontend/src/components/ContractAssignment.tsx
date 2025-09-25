import React, { useState, useEffect } from 'react';
import { LocalAPI } from '../services/axios';

interface Contract {
  id: string;
  clientName: string;
  assignedManager: string;
  bordereauxCount: number;
  startDate: string;
  endDate: string;
  delaiReglement: number;
}

interface TeamLeader {
  id: string;
  fullName: string;
  teamSize: number;
  activeContracts: number;
  currentWorkload: number;
  capacity: number;
  utilizationRate: number;
  isAvailable: boolean;
}

const ContractAssignment: React.FC = () => {
  const [unassignedContracts, setUnassignedContracts] = useState<Contract[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contractsRes, leadersRes] = await Promise.all([
        LocalAPI.get('/contract-assignment/unassigned-contracts'),
        LocalAPI.get('/contract-assignment/available-team-leaders')
      ]);
      
      setUnassignedContracts(contractsRes.data);
      setTeamLeaders(leadersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Erreur lors du chargement des données');
    }
  };

  const handleAssignment = async () => {
    if (!selectedContract || !selectedTeamLeader) {
      setMessage('Veuillez sélectionner un contrat et un chef d\'équipe');
      return;
    }

    setLoading(true);
    try {
      const response = await LocalAPI.post('/contract-assignment/assign-contract', {
        contractId: selectedContract,
        teamLeaderId: selectedTeamLeader
      });

      setMessage(response.data.message);
      setSelectedContract('');
      setSelectedTeamLeader('');
      await loadData(); // Refresh data
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Erreur lors de l\'affectation');
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return '#ff4444';
    if (rate >= 70) return '#ff8800';
    if (rate >= 50) return '#ffaa00';
    return '#44aa44';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Affectation des Contrats aux Chefs d'Équipe</h2>
      
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('Erreur') ? '#ffebee' : '#e8f5e8',
          color: message.includes('Erreur') ? '#c62828' : '#2e7d32',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Contrats non affectés */}
        <div>
          <h3>Contrats Non Affectés ({unassignedContracts.length})</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
            {unassignedContracts.map(contract => (
              <div
                key={contract.id}
                onClick={() => setSelectedContract(contract.id)}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: selectedContract === contract.id ? '#e3f2fd' : 'white'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{contract.clientName}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Manager: {contract.assignedManager} | 
                  Bordereaux: {contract.bordereauxCount} | 
                  Délai: {contract.delaiReglement}j
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chefs d'équipe disponibles */}
        <div>
          <h3>Chefs d'Équipe Disponibles</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
            {teamLeaders.map(leader => (
              <div
                key={leader.id}
                onClick={() => setSelectedTeamLeader(leader.id)}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: selectedTeamLeader === leader.id ? '#e8f5e8' : 'white'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{leader.fullName}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Équipe: {leader.teamSize} gestionnaires | 
                  Contrats: {leader.activeContracts} | 
                  Charge: {leader.currentWorkload}/{leader.capacity}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: getUtilizationColor(leader.utilizationRate),
                  fontWeight: 'bold'
                }}>
                  Utilisation: {leader.utilizationRate}% 
                  {!leader.isAvailable && ' (PLEIN)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bouton d'affectation */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          onClick={handleAssignment}
          disabled={loading || !selectedContract || !selectedTeamLeader}
          style={{
            padding: '12px 24px',
            backgroundColor: loading || !selectedContract || !selectedTeamLeader ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading || !selectedContract || !selectedTeamLeader ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Affectation en cours...' : 'Affecter le Contrat'}
        </button>
      </div>

      {/* Légende */}
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <strong>Fonctionnement:</strong> Une fois un contrat affecté à un chef d'équipe, 
        tous les bordereaux de ce contrat seront automatiquement dirigés vers cette équipe 
        pour affectation aux gestionnaires.
      </div>
    </div>
  );
};

export default ContractAssignment;