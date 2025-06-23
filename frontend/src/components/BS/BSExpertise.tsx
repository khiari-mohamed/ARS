import React from 'react';
import { useBSExpertise } from '../../hooks/useBS';
import { Card, Descriptions, Tag } from 'antd';

type Expertise = {
  isFavorable: string;
  matriculeAdherent: string;
  contrat: string;
  codification: string;
  natureActe: string;
  dents: string[] | string;
};

export const BSExpertise: React.FC<{ bsId: number }> = ({ bsId }) => {
  const { data, isLoading } = useBSExpertise(bsId) as { data: Expertise[]; isLoading: boolean };

  if (isLoading) return <Card loading title="Expertise" />;
  if (!data || !data.length) return null;

  return (
    <Card title="Expertise" size="small" style={{ marginTop: 16 }}>
      {data.map((exp, idx) => (
        <Descriptions key={idx} size="small" column={1} bordered>
          <Descriptions.Item label="Statut">
            <Tag color={exp.isFavorable === 'FAVORABLE' ? 'green' : exp.isFavorable === 'DEFAVORABLE' ? 'red' : 'orange'}>
              {exp.isFavorable}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Matricule Adhérent">{exp.matriculeAdherent}</Descriptions.Item>
          <Descriptions.Item label="Contrat">{exp.contrat}</Descriptions.Item>
          <Descriptions.Item label="Codification">{exp.codification}</Descriptions.Item>
          <Descriptions.Item label="Nature Acte">{exp.natureActe}</Descriptions.Item>
          <Descriptions.Item label="Dents">{Array.isArray(exp.dents) ? exp.dents.join(', ') : exp.dents}</Descriptions.Item>
        </Descriptions>
      ))}
    </Card>
  );
};
