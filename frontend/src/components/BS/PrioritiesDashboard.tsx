import React, { useState, useEffect } from 'react';
import { Card, List, Select, Tag, Spin, Alert } from 'antd';
import { usePriorities } from '../../hooks/useBS';

// Type for a prioritized BS (adjust fields as needed)
type PriorityBS = {
  id: number;
  numBs: string;
  dueDate?: string;
  nomAssure?: string;
  etat?: string;
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
    data: PriorityBS[] | undefined;
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
        renderItem={(bs: PriorityBS) => (
          <List.Item>
            <span>
              <b>BS #{bs.numBs}</b>
              {bs.nomAssure && <> — {bs.nomAssure}</>}
              {bs.etat && (
                <Tag style={{ marginLeft: 8 }}>{bs.etat}</Tag>
              )}
              {bs.dueDate && (
                <Tag color={new Date(bs.dueDate) < new Date() ? 'red' : 'orange'} style={{ marginLeft: 8 }}>
                  {new Date(bs.dueDate) < new Date() ? 'En retard' : 'À traiter bientôt'} — {new Date(bs.dueDate).toLocaleDateString()}
                </Tag>
              )}
            </span>
          </List.Item>
        )}
      />
    </Card>
  );
};