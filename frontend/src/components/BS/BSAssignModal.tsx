import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, message, Spin, Alert } from 'antd';
import { useAssignmentSuggestions, useAssignBS } from '../../hooks/useBS';

interface BSAssignModalProps {
  visible: boolean;
  onClose: () => void;
  bsIds: string[];
  onSuccess?: () => void;
}

interface User {
  id: string;
  fullName: string;
  role: string;
  department?: string;
}

interface AssignmentSuggestion {
  assignee: string;
  confidence: string;
  score: number;
  reasoning: string[];
}

export const BSAssignModal: React.FC<BSAssignModalProps> = ({
  visible,
  onClose,
  bsIds,
  onSuccess
}) => {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { data: suggestions, isLoading: suggestionsLoading } = useAssignmentSuggestions();
  const assignBS = useAssignBS();

  useEffect(() => {
    if (visible) {
      fetchUsers();
    }
  }, [visible]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { LocalAPI } = await import('../../services/axios');
      const response = await LocalAPI.get('/users', { 
        params: { role: 'gestionnaire' } 
      });
      setUsers(response.data || []);
    } catch (error) {
      message.error('Erreur lors du chargement des gestionnaires');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssignee) {
      message.error('Veuillez sélectionner un gestionnaire');
      return;
    }

    try {
      setLoading(true);
      
      // Assign all selected BS to the chosen user
      for (const bsId of bsIds) {
        await assignBS.mutateAsync({ 
          id: bsId, 
          ownerId: selectedAssignee 
        });
      }

      message.success(`${bsIds.length} BS assigné(s) avec succès`);
      onSuccess?.();
      onClose();
    } catch (error) {
      message.error('Erreur lors de l\'assignation');
    } finally {
      setLoading(false);
    }
  };

  const getBestSuggestion = (): AssignmentSuggestion | null => {
    if (!suggestions?.length) return null;
    return suggestions[0]; // Assuming suggestions are sorted by score
  };

  const bestSuggestion = getBestSuggestion();

  return (
    <Modal
      title={`Assigner ${bsIds.length} BS`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Annuler
        </Button>,
        <Button 
          key="assign" 
          type="primary" 
          loading={loading}
          onClick={handleAssign}
          disabled={!selectedAssignee}
        >
          Assigner
        </Button>
      ]}
    >
      {suggestionsLoading && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Spin size="small" />
          <span style={{ marginLeft: 8 }}>Analyse IA en cours...</span>
        </div>
      )}

      {bestSuggestion && (
        <Alert
          type="info"
          message="Suggestion IA"
          description={
            <div>
              <p><strong>Recommandé:</strong> {users.find(u => u.id === bestSuggestion.assignee)?.fullName || bestSuggestion.assignee}</p>
              <p><strong>Confiance:</strong> {bestSuggestion.confidence}</p>
              <p><strong>Score:</strong> {bestSuggestion.score.toFixed(2)}</p>
              {bestSuggestion.reasoning.length > 0 && (
                <div>
                  <strong>Raisons:</strong>
                  <ul style={{ marginTop: 4, marginBottom: 0 }}>
                    {bestSuggestion.reasoning.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          }
          style={{ marginBottom: 16 }}
          action={
            <Button 
              size="small" 
              type="link"
              onClick={() => setSelectedAssignee(bestSuggestion.assignee)}
            >
              Utiliser
            </Button>
          }
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Sélectionner un gestionnaire:
        </label>
        <Select
          style={{ width: '100%' }}
          placeholder="Choisir un gestionnaire"
          value={selectedAssignee}
          onChange={setSelectedAssignee}
          loading={loading}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={users.map(user => ({
            value: user.id,
            label: `${user.fullName} (${user.department || user.role})`
          }))}
        />
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>BS sélectionnés: {bsIds.length}</p>
        <p>L'assignation sera effectuée pour tous les BS sélectionnés.</p>
      </div>
    </Modal>
  );
};