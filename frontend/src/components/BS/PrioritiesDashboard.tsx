import React, { useState, useEffect } from 'react';
import { Card, List, Select, Tag, Spin, Alert } from 'antd';
import { usePriorities } from '../../hooks/useBS';

// Type for a prioritized item (all document types)
type PriorityItem = {
  id: string;
  type: 'BulletinSoin' | 'Document' | 'Bordereau' | 'Reclamation';
  reference: string;
  priority: number;
  dueDate?: string | null;
  status: string;
  createdAt: string;
};

type Gestionnaire = { id: number; name: string };

// Fetch gestionnaires from your backend
const fetchGestionnaires = async (): Promise<Gestionnaire[]> => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users?role=GESTIONNAIRE', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((u: any) => ({ id: u.id, name: u.fullName }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching gestionnaires:', error);
    return [];
  }
};

export const PrioritiesDashboard: React.FC = () => {
  const [gestionnaires, setGestionnaires] = useState<Gestionnaire[]>([]);
  const [selected, setSelected] = useState<number | undefined>(undefined);

  useEffect(() => {
    const loadGestionnaires = async () => {
      try {
        const gs = await fetchGestionnaires();
        if (gs && gs.length > 0) {
          setGestionnaires(gs);
          if (selected === undefined) setSelected(gs[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch gestionnaires:', error);
      }
    };
    
    loadGestionnaires();
    // eslint-disable-next-line
  }, []);

  const { data: priorities, isLoading, error } = usePriorities(selected!) as {
    data: PriorityItem[] | undefined;
    isLoading: boolean;
    error?: any;
  };

  return (
    <Card title="Priorités IA par gestionnaire" style={{ marginBottom: 24 }}>
      <Select
        value={selected}
        onChange={setSelected}
        style={{ width: 200, marginBottom: 16 }}
        options={gestionnaires.map(g => ({ value: g.id, label: g.name }))}
        placeholder="Choisir un gestionnaire"
        loading={gestionnaires.length === 0}
      />
      {error && <Alert type="error" message="Erreur lors du chargement des priorités IA" />}
      <List
        loading={isLoading}
        dataSource={priorities || []}
        locale={{ emptyText: 'Aucune priorité IA pour ce gestionnaire.' }}
        renderItem={(item: PriorityItem) => {
          const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
          const isUrgent = item.dueDate && new Date(item.dueDate) < new Date(Date.now() + 24 * 60 * 60 * 1000);
          
          return (
            <List.Item>
              <span>
                <Tag color={item.type === 'BulletinSoin' ? 'blue' : item.type === 'Document' ? 'green' : item.type === 'Bordereau' ? 'purple' : 'orange'}>
                  {item.type}
                </Tag>
                <b>{item.reference}</b>
                <Tag style={{ marginLeft: 8 }} color={item.priority > 2 ? 'red' : item.priority > 1 ? 'orange' : 'default'}>
                  Priorité {item.priority}
                </Tag>
                <Tag style={{ marginLeft: 8 }}>{item.status}</Tag>
                {item.dueDate && (
                  <Tag color={isOverdue ? 'red' : isUrgent ? 'orange' : 'default'} style={{ marginLeft: 8 }}>
                    {isOverdue ? '🔴 En retard' : isUrgent ? '⚠️ Urgent' : '📅 À traiter'} — {new Date(item.dueDate).toLocaleDateString()}
                  </Tag>
                )}
              </span>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};