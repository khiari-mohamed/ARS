import React from 'react';
import { Card, Button } from 'antd';
import { useRebalancingSuggestions } from '../../hooks/useBS';

export const RebalancingSuggestions: React.FC = () => {
  const { data: suggestions, isLoading } = useRebalancingSuggestions();

  return (
    <Card title="Suggestions de rééquilibrage IA" loading={isLoading}>
      {suggestions && suggestions.length === 0 && <div>Aucune suggestion pour le moment.</div>}
      {suggestions && suggestions.map((s: any) => (
        <div key={s.bsId} style={{ marginBottom: 8 }}>
          Déplacer BS #{s.bsId} de {s.from} vers {s.to}
          {/* Add a button to trigger the move if you want */}
          <Button size="small" style={{ marginLeft: 8 }}>Appliquer</Button>
        </div>
      ))}
    </Card>
  );
};