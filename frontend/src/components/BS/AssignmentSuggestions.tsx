// src/components/BS/AssignmentSuggestions.tsx
import React from 'react';
import { Card, Button } from 'antd';

type Suggestion = { bsId: string; from: string; to: string };

export const AssignmentSuggestions: React.FC<{
  suggestions: Suggestion[];
  onAccept: (s: Suggestion) => void;
}> = ({ suggestions, onAccept }) => (
  <Card title="Suggestions IA d'affectation">
    {suggestions.map(s => (
      <div key={s.bsId} style={{ marginBottom: 8 }}>
        BS #{s.bsId}: {s.from} → {s.to}
        <Button size="small" style={{ marginLeft: 8 }} onClick={() => onAccept(s)}>
          Appliquer
        </Button>
      </div>
    ))}
  </Card>
);