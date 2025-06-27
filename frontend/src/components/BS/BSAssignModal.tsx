import React, { useState, useEffect } from 'react';
import { Modal, Select, message, Button, Tag, Space } from 'antd';
import { useAssignBS, useAssignmentSuggestions } from '../../hooks/useBS';

export const BSAssignModal: React.FC<{
  bsId: number;
  open: boolean;
  onClose: () => void;
}> = ({ bsId, open, onClose }) => {
  const [ownerId, setOwnerId] = useState<number>();
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const assignBS = useAssignBS();

  // AI suggestions
  const { data: aiSuggestions } = useAssignmentSuggestions();

  useEffect(() => {
    // Fetch gestionnaires from backend
    const fetchUsers = async () => {
      try {
        const res = await fetch('https://197.14.56.112:8083/api/users?role=Gestionnaire');
        const data = await res.json();
        setUsers(data.content || []);
      } catch (err) {
        setUsers([]);
      }
    };
    if (open) fetchUsers();
  }, [open]);

  // Find the recommended gestionnaire from AI
  const recommended = aiSuggestions?.[0];

  const handleAssign = async (customOwnerId?: number) => {
    const idToAssign = customOwnerId ?? ownerId;
    if (!idToAssign) return;
    await assignBS.mutateAsync({ id: bsId, ownerId: idToAssign });
    message.success('Affectation réussie');
    onClose();
  };

  return (
    <Modal open={open} onCancel={onClose} onOk={() => handleAssign()} title="Affecter à un gestionnaire">
      <Space direction="vertical" style={{ width: '100%' }}>
        {recommended && (
          <div>
            <Tag color="blue">Suggestion IA</Tag>
            <Button
              size="small"
              type="primary"
              onClick={() => handleAssign(recommended.id)}
              style={{ marginLeft: 8 }}
            >
              Affecter à {recommended.fullName}
            </Button>
          </div>
        )}
        <Select
          style={{ width: '100%' }}
          placeholder="Choisir un gestionnaire"
          value={ownerId}
          onChange={setOwnerId}
          options={users.map(u => ({
            value: u.id,
            label: (
              <span>
                {u.username}
                {recommended && recommended.id === u.id && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>IA</Tag>
                )}
                {aiSuggestions &&
                  aiSuggestions.find((s: { id: number; risk: string; }) => s.id === u.id && s.risk === 'HIGH') && (
                    <Tag color="red" style={{ marginLeft: 8 }}>Surcharge</Tag>
                  )}
              </span>
            ),
          }))}
        />
      </Space>
    </Modal>
  );
};