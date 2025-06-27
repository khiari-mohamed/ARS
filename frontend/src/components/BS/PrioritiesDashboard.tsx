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
  const res = await fetch('https://197.14.56.112:8083/api/users?role=Gestionnaire');
  const data = await res.json();
  // Adjust if your API returns a different structure
  return (data.content || []).map((u: any) => ({ id: u.id, name: u.username }));
};

export const PrioritiesDashboard: React.FC = () => {
  const [gestionnaires, setGestionnaires] = useState<Gestionnaire[]>([]);
  const [selected, setSelected] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchGestionnaires().then(gs => {
      setGestionnaires(gs);
      if (gs.length > 0 && selected === undefined) setSelected(gs[0].id);
    });
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